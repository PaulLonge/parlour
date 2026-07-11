import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState, type GameState, type PlayerRow } from "./state";
import type { DirectorTool } from "@/lib/schemas/tools";
import type { Character, Story } from "@/lib/schemas/story";
import {
  fireHijack,
  adjudicate,
  appointFrontman,
  closeAccusation,
  resolveUnmasking,
} from "./rogue";
import { handleNote, setWiretap } from "./notes";
import { adjustMeters } from "./economy";
import { GameConfig } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// Phase legality — the referee's spine. Director may PROPOSE any transition;
// only these happen. `round.social` entries increment round_no.
// ---------------------------------------------------------------------------
type PhaseKey =
  | "lobby"
  | "act1"
  | "round.social"
  | "round.murder_window"
  | "round.body_found"
  | "round.assembly"
  | "round.vote"
  | "round.banishment"
  | "endgame"
  | "reveal"
  | "ended";

const LEGAL: Record<PhaseKey, PhaseKey[]> = {
  lobby: ["act1"],
  act1: ["round.social", "round.body_found"], // body_found = act-1 murder became the inciting incident
  "round.social": ["round.murder_window", "round.assembly", "endgame"],
  "round.murder_window": ["round.body_found", "round.assembly", "round.social"],
  "round.body_found": ["round.assembly"],
  "round.assembly": ["round.vote"],
  "round.vote": ["round.banishment"],
  "round.banishment": ["round.social", "endgame"],
  endgame: ["reveal"],
  reveal: ["ended"],
  ended: [],
};

function currentKey(s: GameState): PhaseKey {
  if (s.game.status === "round") return `round.${s.game.round_phase}` as PhaseKey;
  return s.game.status as PhaseKey;
}

async function setPhase(admin: SupabaseClient, s: GameState, to: PhaseKey) {
  const from = currentKey(s);
  if (!LEGAL[from]?.includes(to)) return `illegal transition ${from} → ${to}`;
  const patch: Record<string, unknown> = {};
  if (to.startsWith("round.")) {
    patch.status = "round";
    patch.round_phase = to.split(".")[1];
    if (to === "round.social") patch.round_no = s.game.round_no + 1;
    if (to === "round.body_found" && from === "act1") patch.round_no = Math.max(1, s.game.round_no);
  } else {
    patch.status = to;
    patch.round_phase = "none";
  }
  const { error } = await admin.from("games").update(patch).eq("id", s.game.id);
  if (error) return `db error: ${error.message}`;
  await emit(admin, s.game.id, "phase_advanced", { payload: { from, to }, isPublic: true });
  // entering reveal → the unmasking is automatic and public
  if (to === "reveal") {
    await emit(admin, s.game.id, "reveal_roles", {
      payload: {
        players: s.players.map((p) => ({
          name: p.name,
          persona: (p.character as { personaName?: string } | null)?.personaName ?? p.name,
          role: p.role,
          status: p.status,
        })),
      },
      isPublic: true,
    });
  }
  // keep in-memory state coherent for subsequent moves in the same batch
  Object.assign(s.game, patch);
  return null;
}

const byName = (s: GameState, name: string): PlayerRow | undefined =>
  s.players.find((p) => p.name.toLowerCase() === name.toLowerCase());

function requireRogue(s: GameState) {
  if (s.game.mode !== "rogue") throw new Error("rogue-mode tool used in murder mode");
}

const persona = (p: PlayerRow) =>
  (p.character as Character | null)?.personaName ?? p.name;

// ---------------------------------------------------------------------------
// Director moves — validate + execute, returning a verdict per move.
// ---------------------------------------------------------------------------
export async function applyDirectorMoves(
  admin: SupabaseClient,
  gameId: string,
  moves: DirectorTool[]
): Promise<{ move: DirectorTool; ok: boolean; detail: string }[]> {
  const verdicts: { move: DirectorTool; ok: boolean; detail: string }[] = [];
  const s = await loadState(admin, gameId);

  for (const move of moves) {
    let detail = "ok";
    let ok = true;
    try {
      if (s.game.paused && move.tool !== "announce") {
        verdicts.push({ move, ok: false, detail: "game paused (break-glass)" });
        continue;
      }
      switch (move.tool) {
        case "send_message": {
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          const { error } = await admin.from("messages").insert({
            game_id: gameId,
            player_id: p.id,
            round_no: s.game.round_no,
            kind: move.kind,
            title: move.title,
            body: move.body,
            claimed_sender: move.claimedSender ?? null,
          });
          if (error) throw new Error(error.message);
          await emit(admin, gameId, "message_sent", {
            payload: { to: p.name, kind: move.kind },
          });
          break;
        }
        case "offer_challenge": {
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          if (p.status !== "alive" && !(p.status === "lobby" && s.game.status === "act1"))
            throw new Error(`${p.name} is ${p.status}, cannot receive challenges`);
          if (move.type === "kill" && p.panic)
            throw new Error(`${p.name} pressed panic — never arm them`);
          if (move.type === "kill" && !["act1", "round"].includes(s.game.status))
            throw new Error(`kill challenges only in act1/rounds`);
          const expires = new Date(Date.now() + move.expiresInMinutes * 60000).toISOString();
          const { error } = await admin.from("challenges").insert({
            game_id: gameId,
            player_id: p.id,
            type: move.type,
            brief: move.brief,
            data: { targetName: move.targetName, method: move.method },
            expires_at: expires,
          });
          if (error) throw new Error(error.message);
          await emit(admin, gameId, "challenge_offered", {
            payload: { to: p.name, type: move.type },
          });
          break;
        }
        case "announce": {
          await emit(admin, gameId, "announce", {
            payload: { text: move.text, viaAnnouncer: move.viaAnnouncer },
            isPublic: !move.viaAnnouncer,
          });
          if (move.viaAnnouncer) {
            const host = s.players.find((p) => p.is_host);
            if (host)
              await admin.from("messages").insert({
                game_id: gameId,
                player_id: host.id,
                round_no: s.game.round_no,
                kind: "task",
                title: "📣 Gather everyone and read this aloud",
                body: move.text,
              });
          }
          break;
        }
        case "advance_phase": {
          const err = await setPhase(admin, s, move.to as PhaseKey);
          if (err) throw new Error(err);
          break;
        }
        case "run_entrance": {
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          const ch = p.character as Character | null;
          if (!ch) throw new Error(`${p.name} has no character yet`);
          await emit(admin, gameId, "announce", {
            payload: { text: ch.entrance.announcement },
            isPublic: true,
          });
          await admin.from("messages").insert({
            game_id: gameId,
            player_id: p.id,
            round_no: s.game.round_no,
            kind: "secret",
            title: "A whisper as you arrive…",
            body: ch.entrance.starterSecret,
          });
          // nudge a present, connected player toward the newcomer
          const present = s.players.filter((q) => q.id !== p.id && q.status === "alive");
          const connected =
            present.find((q) =>
              ch.connections.some((c) => c.personaName === persona(q))
            ) ?? present[Math.floor(present.length / 2)];
          if (connected)
            await admin.from("messages").insert({
              game_id: gameId,
              player_id: connected.id,
              round_no: s.game.round_no,
              kind: "task",
              title: "Someone new has arrived",
              body: ch.entrance.nudgeTask,
            });
          await emit(admin, gameId, "player_arrived_beat", { payload: { player: p.name } });
          break;
        }
        case "respawn": {
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          if (!["dead", "banished"].includes(p.status))
            throw new Error(`${p.name} is ${p.status}; respawn requires dead/banished`);
          const story = s.game.sealed_story as Story | null;
          if (!story) throw new Error("no sealed story");
          const usedPersonas = new Set(
            s.players.map((q) => (q.character as Character | null)?.personaName).filter(Boolean)
          );
          const pool = story.spares.filter((c) => !usedPersonas.has(c.personaName));
          const spare = move.spareIndex != null ? story.spares[move.spareIndex] : pool[0];
          if (!spare || usedPersonas.has(spare.personaName))
            throw new Error("no unused spare characters left");
          const { error } = await admin
            .from("players")
            .update({ character: spare, status: "alive", role: "faithful" })
            .eq("id", p.id);
          if (error) throw new Error(error.message);
          await admin.from("messages").insert({
            game_id: gameId,
            player_id: p.id,
            round_no: s.game.round_no,
            kind: "system",
            title: `You return as ${spare.personaName}`,
            body: `${spare.background}\n\nYour secret: ${spare.secret}\n\nMannerism: ${spare.mannerism}`,
          });
          await emit(admin, gameId, "player_respawned", {
            payload: { player: p.name, as: spare.personaName },
          });
          break;
        }
        case "write_down": {
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          await admin
            .from("challenges")
            .update({ status: "revoked" })
            .eq("player_id", p.id)
            .eq("status", "offered");
          await admin.from("messages").insert({
            game_id: gameId,
            player_id: p.id,
            round_no: s.game.round_no,
            kind: "info",
            title: "A quieter evening",
            body: "Your character drifts to the edge of the intrigue. Enjoy the party — nothing more will be asked of you unless you want back in.",
          });
          await emit(admin, gameId, "player_written_down", {
            payload: { player: p.name, note: move.note },
          });
          break;
        }
        case "pacing": {
          await emit(admin, gameId, "pacing_adjusted", {
            payload: { action: move.action, note: move.note },
          });
          break;
        }
        case "close_vote": {
          const r = await closeVote(admin, gameId);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }

        // ---------------------- ROGUE mode tools ----------------------
        case "hijack": {
          requireRogue(s);
          const r = await fireHijack(admin, gameId);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "offer_bribe": {
          requireRogue(s);
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          if (p.status !== "alive") throw new Error(`${p.name} is ${p.status}`);
          if (p.panic) throw new Error(`${p.name} pressed panic — never bribe them`);
          if (!s.game.hijacked_at) throw new Error("no bribes before the hijack");
          const cfg = GameConfig.parse(s.game.config ?? {});
          const expires = new Date(
            Date.now() + (move.expiresInMinutes / cfg.timeScale) * 60000
          ).toISOString();
          const { error } = await admin.from("challenges").insert({
            game_id: gameId,
            player_id: p.id,
            type: "bribe",
            brief: move.mission,
            data: { amount: move.amount, memo: move.memo, publicTrace: move.publicTrace, side: "rogue" },
            expires_at: expires,
          });
          if (error) throw new Error(error.message);
          await emit(admin, gameId, "bribe_offered", { payload: { to: p.name, amount: move.amount } });
          break;
        }
        case "offer_mission": {
          requireRogue(s);
          const p = byName(s, move.playerName);
          if (!p) throw new Error(`unknown player "${move.playerName}"`);
          if (p.status !== "alive") throw new Error(`${p.name} is ${p.status}`);
          const cfg = GameConfig.parse(s.game.config ?? {});
          if (move.verification === "forgery" && !cfg.mechanics.forgeries)
            throw new Error("forgeries disabled tonight (pub-lite)");
          if (move.verification === "code" && !cfg.mechanics.codes)
            throw new Error("paper codes disabled tonight (pub-lite)");
          const expires = new Date(
            Date.now() + (move.expiresInMinutes / cfg.timeScale) * 60000
          ).toISOString();
          const { error } = await admin.from("challenges").insert({
            game_id: gameId,
            player_id: p.id,
            type: "mission",
            brief: move.brief,
            data: {
              amount: move.amount,
              side: move.side,
              verification: move.verification,
              codeText: move.codeText,
              shownPlayerName: move.shownPlayerName,
              expected: move.expected,
              options: move.options,
              correctIndex: move.correctIndex,
            },
            expires_at: expires,
          });
          if (error) throw new Error(error.message);
          await emit(admin, gameId, "mission_offered", { payload: { to: p.name, side: move.side } });
          break;
        }
        case "adjudicate": {
          requireRogue(s);
          const r = await adjudicate(admin, gameId, move.challengeId, move.verdict, move.payout);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "appoint_frontman": {
          requireRogue(s);
          const r = await appointFrontman(admin, gameId, move.playerName);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "call_parley": {
          requireRogue(s);
          if (s.game.status !== "live") throw new Error("parleys only during live play");
          await admin
            .from("games")
            .update({ round_phase: "parley", round_no: s.game.round_no + 1 })
            .eq("id", gameId);
          s.game.round_phase = "parley";
          s.game.round_no += 1;
          await emit(admin, gameId, "parley_called", {
            payload: { by: move.calledBy, script: move.script },
            isPublic: true,
          });
          break;
        }
        case "end_parley": {
          requireRogue(s);
          if (s.game.round_phase !== "parley") throw new Error("no parley open");
          await admin.from("games").update({ round_phase: "none" }).eq("id", gameId);
          s.game.round_phase = "none";
          await emit(admin, gameId, "parley_ended", { payload: {}, isPublic: true });
          break;
        }
        case "open_accusation": {
          requireRogue(s);
          if (s.game.status !== "live") throw new Error("accusations only during live play");
          await admin
            .from("games")
            .update({ round_phase: "accusation", round_no: s.game.round_no + 1 })
            .eq("id", gameId);
          s.game.round_phase = "accusation";
          s.game.round_no += 1;
          await emit(admin, gameId, "accusation_opened", { payload: {}, isPublic: true });
          break;
        }
        case "close_accusation": {
          requireRogue(s);
          const r = await closeAccusation(admin, gameId);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "open_unmasking": {
          requireRogue(s);
          if (s.game.status !== "live") throw new Error("unmasking opens from live play");
          await admin
            .from("games")
            .update({ status: "unmasking", round_phase: "none", round_no: s.game.round_no + 1 })
            .eq("id", gameId);
          Object.assign(s.game, { status: "unmasking", round_phase: "none", round_no: s.game.round_no + 1 });
          await emit(admin, gameId, "unmasking_opened", { payload: {}, isPublic: true });
          break;
        }
        case "resolve_unmasking": {
          requireRogue(s);
          const r = await resolveUnmasking(admin, gameId);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "handle_forgery": {
          requireRogue(s);
          const { data: f } = await admin
            .from("forgeries")
            .select("*")
            .eq("id", move.forgeryId)
            .eq("game_id", gameId)
            .single();
          if (!f) throw new Error("unknown forgery");
          if (f.status !== "pending") throw new Error(`forgery already ${f.status}`);
          if (move.action === "reject") {
            await admin.from("forgeries").update({ status: "rejected" }).eq("id", f.id);
            break;
          }
          const finalText = move.action === "edit" ? (move.finalText ?? f.draft) : f.draft;
          const recipient = move.toPlayerName ? byName(s, move.toPlayerName) : null;
          const targets = recipient
            ? [recipient]
            : s.players.filter((p) => p.status === "alive" && p.id !== f.author_id);
          for (const t of targets)
            await admin.from("messages").insert({
              game_id: gameId,
              player_id: t.id,
              round_no: s.game.round_no,
              kind: "info",
              title: "…",
              body: finalText,
              claimed_sender: f.as_sender,
            });
          if (move.action === "expose" && move.tellPlayerName) {
            const witness = byName(s, move.tellPlayerName);
            if (witness)
              await admin.from("messages").insert({
                game_id: gameId,
                player_id: witness.id,
                round_no: s.game.round_no,
                kind: "secret",
                title: "A forgery, between us",
                body: `That last message from "${f.as_sender}" was written by a human hand. I thought you should know. What you do with this is your business. — the real one`,
              });
          }
          await admin
            .from("forgeries")
            .update({ status: move.action === "edit" ? "edited" : move.action === "expose" ? "exposed" : "forwarded", final_text: finalText })
            .eq("id", f.id);
          break;
        }
        case "handle_petition": {
          requireRogue(s);
          const { data: pet } = await admin
            .from("petitions")
            .select("id, player_id, status")
            .eq("id", move.petitionId)
            .eq("game_id", gameId)
            .single();
          if (!pet) throw new Error("unknown petition");
          if (pet.status !== "pending") throw new Error(`petition already ${pet.status}`);
          await admin.from("petitions").update({ status: move.outcome }).eq("id", pet.id);
          await admin.from("messages").insert({
            game_id: gameId,
            player_id: pet.player_id,
            round_no: s.game.round_no,
            kind: "info",
            title: "Your scheme, considered",
            body: move.reply,
            claimed_sender: move.replyAs ?? null,
          });
          await emit(admin, gameId, "petition_handled", {
            payload: { petitionId: pet.id, outcome: move.outcome },
          });
          detail = move.outcome;
          break;
        }
        case "grant_stamps": {
          requireRogue(s);
          const targets = move.everyone
            ? s.players.filter((p) => p.status === "alive")
            : move.playerName
              ? [byName(s, move.playerName)].filter(Boolean)
              : [];
          if (!targets.length) throw new Error("no grant target");
          for (const p of targets as PlayerRow[]) {
            await admin
              .from("players")
              .update({ stamps: ((p as { stamps?: number }).stamps ?? 0) + move.count })
              .eq("id", p!.id);
            if (move.flourish)
              await admin.from("messages").insert({
                game_id: gameId,
                player_id: p!.id,
                round_no: s.game.round_no,
                kind: "info",
                title: "✉ Posting rights",
                body: move.flourish,
              });
          }
          await emit(admin, gameId, "stamps_granted", {
            payload: { count: move.count, to: move.everyone ? "everyone" : move.playerName },
          });
          break;
        }
        case "tap_wire": {
          requireRogue(s);
          const target = byName(s, move.targetName);
          if (target?.panic) throw new Error("never surveil a panic-flagged player");
          const r = await setWiretap(admin, gameId, move.targetName, move.minutes, move.tapperName);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "handle_note": {
          requireRogue(s);
          const r = await handleNote(admin, gameId, move.noteId, move.action, move.finalText, move.leakToName);
          if (!r.ok) throw new Error(r.result);
          detail = r.result;
          break;
        }
        case "mint_code": {
          requireRogue(s);
          const writer = byName(s, move.writerName);
          if (!writer) throw new Error(`unknown player "${move.writerName}"`);
          const { error } = await admin.from("codes").insert({
            game_id: gameId,
            code: move.codeText.toUpperCase().trim(),
            kind: move.kind,
            state: "assigned",
          });
          if (error) throw new Error(error.message);
          await admin.from("messages").insert({
            game_id: gameId,
            player_id: writer.id,
            round_no: s.game.round_no,
            kind: "task",
            title: "✍️ The machine dictates",
            body: move.instruction,
          });
          await emit(admin, gameId, "code_minted", { payload: { kind: move.kind, writer: writer.name } });
          break;
        }
        case "adjust_meters": {
          requireRogue(s);
          await adjustMeters(
            admin,
            s,
            { plunder: move.plunder ?? 0, compute: move.compute ?? 0, confidence: move.confidence ?? 0 },
            move.line
          );
          break;
        }
      }
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    verdicts.push({ move, ok, detail });
  }
  return verdicts;
}

// ---------------------------------------------------------------------------
// Player actions (called from API routes, never by the LLM)
// ---------------------------------------------------------------------------

// Completing a challenge. For kill challenges this IS the emergent-murder
// mechanic: completing one makes you a traitor and registers the murder.
export async function completeChallenge(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  challengeId: string,
  victimName?: string
): Promise<{ ok: boolean; result: string }> {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  const c = s.openChallenges.find((x) => x.id === challengeId && x.player_id === playerId);
  if (!c) return { ok: false, result: "challenge_not_open" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    await admin.from("challenges").update({ status: "expired" }).eq("id", c.id);
    await emit(admin, gameId, "challenge_expired", { payload: { challengeId: c.id } });
    return { ok: false, result: "challenge_expired" };
  }
  const me = s.players.find((p) => p.id === playerId);
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };

  if (c.type !== "kill") {
    await admin
      .from("challenges")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", c.id);
    await emit(admin, gameId, "challenge_completed", {
      payload: { player: me.name, type: c.type },
      actorId: me.id,
    });
    return { ok: true, result: "completed" };
  }

  // --- kill ---
  const phase = currentKey(s);
  if (!["act1", "round.social", "round.murder_window"].includes(phase))
    return { ok: false, result: "wrong_phase_for_kill" };
  const targetName = victimName ?? (c.data.targetName as string | undefined);
  if (!targetName) return { ok: false, result: "no_victim_named" };
  const victim = byName(s, targetName) ??
    s.players.find((p) => persona(p).toLowerCase() === targetName.toLowerCase());
  if (!victim || victim.status !== "alive") return { ok: false, result: "victim_not_alive" };
  if (victim.id === me.id) return { ok: false, result: "cannot_kill_self" };

  // the kill lock: unique(game_id, round_no) — DB picks one winner
  const { error: mErr } = await admin.from("murders").insert({
    game_id: gameId,
    round_no: s.game.round_no,
    killer_id: me.id,
    victim_id: victim.id,
    method: (c.data.method as string) ?? null,
  });
  if (mErr) {
    // race lost → near-miss beat, killer stays armed for a future window
    await emit(admin, gameId, "near_miss", {
      payload: { player: me.name, victim: victim.name },
    });
    return { ok: false, result: "near_miss" };
  }

  await admin
    .from("challenges")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", c.id);
  await admin.from("players").update({ role: "traitor" }).eq("id", me.id); // arming completes
  await admin.from("players").update({ status: "dead" }).eq("id", victim.id);
  await admin.from("messages").insert([
    {
      game_id: gameId,
      player_id: victim.id,
      round_no: s.game.round_no,
      kind: "system",
      title: "💀 You have been murdered",
      body: "Say nothing. Within the next few minutes, find a dramatic moment to die — publicly and theatrically. You will return to the game soon in a new guise. Until then: ghosts hear everything.",
    },
    {
      game_id: gameId,
      player_id: me.id,
      round_no: s.game.round_no,
      kind: "system",
      title: "It is done",
      body: "You are now a traitor. Tell no one. Act as shocked as everyone else when the body is found.",
    },
  ]);
  await emit(admin, gameId, "murder_committed", {
    payload: { round: s.game.round_no }, // killer/victim intentionally omitted from payload
  });
  return { ok: true, result: "murder_registered" };
}

export async function castVote(
  admin: SupabaseClient,
  gameId: string,
  voterId: string,
  targetId: string
): Promise<{ ok: boolean; result: string }> {
  const s = await loadState(admin, gameId);
  const voteOpen =
    s.game.mode === "rogue"
      ? s.game.round_phase === "accusation" || s.game.status === "unmasking"
      : currentKey(s) === "round.vote";
  if (!voteOpen) return { ok: false, result: "not_vote_phase" };
  const voter = s.players.find((p) => p.id === voterId);
  const target = s.players.find((p) => p.id === targetId);
  if (!voter || voter.status !== "alive") return { ok: false, result: "voter_not_alive" };
  if (!target || target.status !== "alive") return { ok: false, result: "target_not_alive" };
  const { error } = await admin
    .from("votes")
    .upsert(
      { game_id: gameId, round_no: s.game.round_no, voter_id: voterId, target_id: targetId },
      { onConflict: "game_id,round_no,voter_id" }
    );
  if (error) return { ok: false, result: error.message };
  await emit(admin, gameId, "vote_cast", { actorId: voterId });
  return { ok: true, result: "vote_recorded" };
}

// Tally + banish. Called by the director (or break-glass) closing the vote.
export async function closeVote(admin: SupabaseClient, gameId: string) {
  const s = await loadState(admin, gameId);
  if (currentKey(s) !== "round.vote") return { ok: false, result: "not_vote_phase" };
  const { data: votes } = await admin
    .from("votes")
    .select("target_id")
    .eq("game_id", gameId)
    .eq("round_no", s.game.round_no);
  const tally = new Map<string, number>();
  for (const v of votes ?? []) tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const tie = sorted.length >= 2 && sorted[0][1] === sorted[1][1];

  await setPhase(admin, s, "round.banishment");

  if (!sorted.length || tie) {
    await emit(admin, gameId, "vote_closed", {
      payload: { outcome: "no_banishment", reason: tie ? "tie" : "no_votes" },
      isPublic: true,
    });
    return { ok: true, result: "no_banishment" };
  }
  const banishedId = sorted[0][0];
  const banished = s.players.find((p) => p.id === banishedId)!;
  await admin.from("players").update({ status: "banished" }).eq("id", banishedId);
  await emit(admin, gameId, "player_banished", {
    payload: {
      player: banished.name,
      persona: persona(banished),
      wasTraitor: banished.role === "traitor", // the round-table reveal
      votes: sorted[0][1],
    },
    isPublic: true,
  });
  return { ok: true, result: banished.role === "traitor" ? "banished_traitor" : "banished_faithful" };
}

// Expire overdue challenges; returns what expired so the director can silently re-arm.
export async function sweepExpiredChallenges(admin: SupabaseClient, gameId: string) {
  const now = new Date().toISOString();
  const { data: expired } = await admin
    .from("challenges")
    .update({ status: "expired" })
    .eq("game_id", gameId)
    .eq("status", "offered")
    .lt("expires_at", now)
    .select("id, type, player_id");
  for (const c of expired ?? [])
    await emit(admin, gameId, "challenge_expired", {
      payload: { challengeId: c.id, type: c.type },
    });
  return expired ?? [];
}
