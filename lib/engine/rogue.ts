import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState, type GameState } from "./state";
import { credit, adjustMeters } from "./economy";
import { GameConfig } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// ROGUE mode mechanics (docs/modes.md, docs/interaction-model.md).
// Everything here is called by the referee (director tools) or API routes
// (player actions) — never directly by the LLM.
// ---------------------------------------------------------------------------

const cfg = (s: GameState) => GameConfig.parse(s.game.config ?? {});

// --- THE HIJACK (D19/D27): act1 pre-game theatre → live. Fired ONCE. -------
export async function fireHijack(admin: SupabaseClient, gameId: string) {
  const s = await loadState(admin, gameId);
  if (s.game.mode !== "rogue") return { ok: false, result: "not_rogue_mode" };
  if (s.game.hijacked_at) return { ok: false, result: "already_hijacked" };
  if (s.game.status !== "act1") return { ok: false, result: "hijack_requires_act1" };

  const c = cfg(s);
  await admin
    .from("games")
    .update({ status: "live", round_phase: "none", hijacked_at: new Date().toISOString() })
    .eq("id", gameId);

  // the vault lie: everyone's balance "reads zero" — the display trick that IS the twist
  for (const p of s.players.filter((x) => x.status !== "lobby" || x.arrived_at)) {
    if (p.balance !== 0)
      await credit(admin, gameId, p.id, -p.balance, "PLUNDERED — balance reads zero", "vault");
    else if (c.startingBalance)
      // never credited yet: write the lie as a zero-sum pair so the receipts replay correctly
      await admin.from("transactions").insert({
        game_id: gameId,
        player_id: p.id,
        amount: 0,
        memo: `PLUNDERED — ${c.startingBalance} Ƀ, the ledger says. The ledger lies.`,
        claimed_source: "vault",
      });
  }
  // the AI names become public knowledge the moment they speak (D33: the
  // audience UI needs them; voices/motives stay sealed)
  const story = s.game.sealed_story as Record<string, any> | null;
  if (story?.ais) {
    const pub = (s.game.story_public ?? {}) as Record<string, unknown>;
    await admin
      .from("games")
      .update({
        story_public: {
          ...pub,
          ais: { rogue: { name: story.ais.rogue?.name }, good: { name: story.ais.good?.name } },
          currency: story.currency ? { name: story.currency.name, symbol: story.currency.symbol } : undefined,
        },
      })
      .eq("id", gameId);
  }

  await emit(admin, gameId, "hijack", {
    payload: { beat: "the game is dead, long live the game" },
    isPublic: true,
  });
  return { ok: true, result: "hijacked" };
}

// --- BRIBES & MISSIONS: accepting a bribe IS the arming (D19) --------------
// The director offers via challenges (type 'bribe' | 'mission', data.amount,
// data.side, data.verification...). Accepting a bribe credits + converts.
export async function acceptOffer(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  challengeId: string
) {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  const c = s.openChallenges.find((x) => x.id === challengeId && x.player_id === playerId);
  if (!c) return { ok: false, result: "offer_not_open" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    await admin.from("challenges").update({ status: "expired" }).eq("id", c.id);
    await emit(admin, gameId, "challenge_expired", { payload: { challengeId: c.id } });
    return { ok: false, result: "offer_expired" };
  }
  const me = s.players.find((p) => p.id === playerId);
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };
  if (c.type !== "bribe") return { ok: false, result: "not_a_bribe" };

  const amount = Number(c.data.amount ?? 0);
  await admin
    .from("challenges")
    .update({ status: "completed", completed_at: new Date().toISOString(), response: { accepted: true } })
    .eq("id", c.id);
  await credit(admin, gameId, playerId, amount, String(c.data.memo ?? "consulting fees"), "rogue");
  if (me.role === "faithful") await admin.from("players").update({ role: "minion" }).eq("id", me.id);
  // the twist engine: the plunder meter is secretly a live tally of accepted bribes
  await adjustMeters(admin, s, { plunder: amount }, String(c.data.publicTrace ?? "coins have moved."));
  await emit(admin, gameId, "bribe_accepted", { payload: { challengeId: c.id }, actorId: me.id });
  return { ok: true, result: "bought" };
}

// Submissions & cross-confirmations (D21/D32): the verification ladder.
// Deterministic first (glyphs are tapped; expected-answer missions match
// locally), AI adjudication only for open answers and near-misses.
export async function submitResponse(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  challengeId: string,
  text: string
) {
  const s = await loadState(admin, gameId);
  const c = s.openChallenges.find((x) => x.id === challengeId && x.player_id === playerId);
  if (!c) return { ok: false, result: "challenge_not_open" };

  const verification = String(c.data?.verification ?? "submission");

  // --- rung 1: the glyph handshake — fully deterministic, retryable ---
  if (verification === "glyph") {
    const shownName = String(c.data?.shownPlayerName ?? c.data?.targetName ?? "");
    const shown = s.players.find((p) => p.name.toLowerCase() === shownName.toLowerCase());
    if (!shown) return { ok: false, result: "glyph_target_unknown" };
    const { glyphMatches } = await import("./glyphs");
    if (glyphMatches(gameId, shown.id, text.trim().toLowerCase())) {
      await admin
        .from("challenges")
        .update({ response: { tapped: text, at: new Date().toISOString() } })
        .eq("id", c.id);
      await adjudicate(admin, gameId, c.id, "complete");
      await emit(admin, gameId, "glyph_verified", { payload: { challengeId: c.id }, actorId: playerId });
      return { ok: true, result: "verified" };
    }
    return { ok: false, result: "glyph_mismatch" }; // retry allowed — maybe they showed you an old window
  }

  // --- rung 2: expected-answer missions (passphrases, signals, tokens) ---
  const expected = Array.isArray(c.data?.expected) ? (c.data.expected as string[]) : null;
  if (expected?.length) {
    const { matchAnswer } = await import("./verify");
    const m = matchAnswer(expected, text);
    await admin
      .from("challenges")
      .update({ response: { text, matched: m, at: new Date().toISOString() } })
      .eq("id", c.id);
    if (m === "match" || m === "close") {
      await adjudicate(admin, gameId, c.id, "complete");
      return { ok: true, result: "verified" };
    }
    // miss → falls through to the AI as backup judge on its next tick
    await emit(admin, gameId, "response_submitted", {
      payload: { challengeId: c.id, deterministic: "miss" },
      actorId: playerId,
    });
    return { ok: true, result: "submitted_for_judgment" };
  }

  // --- rung 3: open answers — the AI judges ---
  await admin
    .from("challenges")
    .update({ response: { text, at: new Date().toISOString() } })
    .eq("id", c.id);
  await emit(admin, gameId, "response_submitted", {
    payload: { challengeId: c.id, chars: text.length },
    actorId: playerId,
  });
  return { ok: true, result: "submitted" };
}

// Director verdict on a submission: complete + pay, or reject with a note.
export async function adjudicate(
  admin: SupabaseClient,
  gameId: string,
  challengeId: string,
  verdict: "complete" | "reject",
  payout?: number
) {
  const { data: c } = await admin
    .from("challenges")
    .select("id, player_id, type, data")
    .eq("id", challengeId)
    .eq("game_id", gameId)
    .single();
  if (!c) return { ok: false, result: "unknown_challenge" };
  const s = await loadState(admin, gameId);
  if (verdict === "reject") {
    await admin.from("challenges").update({ status: "expired" }).eq("id", c.id);
    return { ok: true, result: "rejected" };
  }
  await admin
    .from("challenges")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", c.id);
  const side = String((c.data as Record<string, unknown>)?.side ?? "good");
  const amount = payout ?? Number((c.data as Record<string, unknown>)?.amount ?? 0);
  if (side === "good") {
    await credit(admin, gameId, c.player_id, amount, "compute shares — honest work", "good");
    await adjustMeters(admin, s, { compute: amount }, "the lantern burns a little brighter.");
  } else {
    await credit(admin, gameId, c.player_id, amount, "services rendered", "rogue");
    await adjustMeters(admin, s, { plunder: amount }, "coins have moved.");
  }
  await emit(admin, gameId, "challenge_completed", { payload: { challengeId: c.id, side } });
  return { ok: true, result: "completed" };
}

// --- CODES: the paper-slip layer (D21) --------------------------------------
export async function hideCode(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  codeText: string,
  locationHint: string
) {
  const { data: code } = await admin
    .from("codes")
    .select("id, state")
    .eq("game_id", gameId)
    .eq("code", codeText.toUpperCase().trim())
    .maybeSingle();
  if (!code) return { ok: false, result: "unknown_code" };
  if (!["printed", "assigned"].includes(code.state)) return { ok: false, result: "code_not_hideable" };
  await admin
    .from("codes")
    .update({ state: "hidden", hider_id: playerId, location_hint: locationHint, hidden_at: new Date().toISOString() })
    .eq("id", code.id);
  await emit(admin, gameId, "code_hidden", { payload: { codeId: code.id }, actorId: playerId });
  return { ok: true, result: "hidden" };
}

export async function findCode(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  codeText: string
) {
  const { data: code } = await admin
    .from("codes")
    .select("id, state, hider_id")
    .eq("game_id", gameId)
    .eq("code", codeText.toUpperCase().trim())
    .maybeSingle();
  if (!code) return { ok: false, result: "unknown_code" };
  if (code.state === "found") return { ok: false, result: "already_found" };
  if (code.hider_id === playerId) return { ok: false, result: "cannot_find_own_code" };
  await admin
    .from("codes")
    .update({ state: "found", finder_id: playerId, found_at: new Date().toISOString() })
    .eq("id", code.id);
  // chain verification: finding a code completes the hider's hide-mission AND
  // any find-mission the finder holds — the director pays both on next tick.
  await emit(admin, gameId, "code_found", {
    payload: { codeId: code.id, hiderId: code.hider_id },
    actorId: playerId,
  });
  return { ok: true, result: "found" };
}

// --- ACCUSATIONS: burn, don't eliminate (D20) --------------------------------
export async function closeAccusation(admin: SupabaseClient, gameId: string) {
  const s = await loadState(admin, gameId);
  if (s.game.status !== "live" || s.game.round_phase !== "accusation")
    return { ok: false, result: "no_open_accusation" };
  const { data: votes } = await admin
    .from("votes")
    .select("target_id")
    .eq("game_id", gameId)
    .eq("round_no", s.game.round_no);
  const tally = new Map<string, number>();
  for (const v of votes ?? []) tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  await admin.from("games").update({ round_phase: "none" }).eq("id", gameId);
  s.game.round_phase = "none";

  if (!sorted.length || (sorted.length > 1 && sorted[0][1] === sorted[1][1])) {
    await emit(admin, gameId, "accusation_closed", {
      payload: { outcome: "no_verdict" },
      isPublic: true,
    });
    return { ok: true, result: "no_verdict" };
  }
  const accusedId = sorted[0][0];
  const accused = s.players.find((p) => p.id === accusedId)!;
  const wasFrontman = s.game.frontman_player_id === accusedId;

  if (wasFrontman) {
    // THE BURNING: exposed, never fronts again, stays fully in play
    await admin.from("players").update({ burned: true }).eq("id", accusedId);
    await admin.from("games").update({ frontman_player_id: null }).eq("id", gameId);
    await adjustMeters(admin, s, { confidence: -20 });
    await emit(admin, gameId, "burning", {
      payload: { player: accused.name, votes: sorted[0][1] },
      isPublic: true,
    });
    return { ok: true, result: "burned", player: accused.name };
  }
  // WRONG: the rogue gains tempo — free bribe round is the director's to spend
  await adjustMeters(admin, s, { plunder: 120, confidence: 10 }, "justice is expensive. you were just billed for it.");
  await emit(admin, gameId, "wrongful_accusation", {
    payload: { player: accused.name, votes: sorted[0][1] },
    isPublic: true,
  });
  return { ok: true, result: "wrongful", player: accused.name };
}

// --- THE UNMASKING: one final naming, two-sided stakes ----------------------
export async function resolveUnmasking(admin: SupabaseClient, gameId: string) {
  const s = await loadState(admin, gameId);
  if (s.game.status !== "unmasking") return { ok: false, result: "not_unmasking" };
  const { data: votes } = await admin
    .from("votes")
    .select("target_id")
    .eq("game_id", gameId)
    .eq("round_no", s.game.round_no);
  const tally = new Map<string, number>();
  for (const v of votes ?? []) tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const namedId = sorted[0]?.[0] ?? null;
  const named = s.players.find((p) => p.id === namedId);
  const frontman = s.players.find((p) => p.id === s.game.frontman_player_id);
  const humansWin = !!namedId && namedId === s.game.frontman_player_id;

  await admin.from("games").update({ status: "reveal", round_phase: "none" }).eq("id", gameId);
  await emit(admin, gameId, "unmasking_resolved", {
    payload: {
      named: named?.name ?? "(no verdict)",
      frontman: frontman?.name ?? "(none)",
      humansWin,
      minions: s.players.filter((p) => p.role === "minion").map((p) => p.name),
      burned: s.players.filter((p) => p.burned).map((p) => p.name),
    },
    isPublic: true,
  });
  return { ok: true, result: humansWin ? "humans_win" : "rogue_wins" };
}

// --- front man appointment (director-only; rotates per D20) -----------------
export async function appointFrontman(admin: SupabaseClient, gameId: string, playerName: string) {
  const s = await loadState(admin, gameId);
  const p = s.players.find((x) => x.name.toLowerCase() === playerName.toLowerCase());
  if (!p) return { ok: false, result: "unknown_player" };
  if (p.role !== "minion") return { ok: false, result: "frontman_must_be_minion" };
  if (p.burned) return { ok: false, result: "burned_players_never_front_again" };
  if (p.panic) return { ok: false, result: "never_appoint_panic" };
  await admin.from("games").update({ frontman_player_id: p.id }).eq("id", gameId);
  await emit(admin, gameId, "frontman_appointed", { payload: { player: p.name } }); // private event
  return { ok: true, result: "appointed" };
}

// --- player agency (D34): petitions — propose your own scheme ---------------
export async function submitPetition(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  text: string
) {
  const { count } = await admin
    .from("petitions")
    .select("*", { count: "exact", head: true })
    .eq("player_id", playerId)
    .eq("status", "pending");
  if ((count ?? 0) > 0) return { ok: false, result: "one_scheme_at_a_time" };
  const { data: p, error } = await admin
    .from("petitions")
    .insert({ game_id: gameId, player_id: playerId, text })
    .select("id")
    .single();
  if (error) return { ok: false, result: error.message };
  await emit(admin, gameId, "petition_submitted", { payload: { petitionId: p.id }, actorId: playerId });
  return { ok: true, result: "the_machine_will_consider_it" };
}

// --- forgeries: the hacked-AI mission (D28) ----------------------------------
export async function submitForgery(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  asSender: string,
  draft: string
) {
  const s = await loadState(admin, gameId);
  // must hold an open challenge granting the compose right
  const grant = s.openChallenges.find(
    (c) => c.player_id === playerId && c.data?.verification === "forgery"
  );
  if (!grant) return { ok: false, result: "no_compose_rights" };
  const { data: f, error } = await admin
    .from("forgeries")
    .insert({ game_id: gameId, author_id: playerId, as_sender: asSender, draft })
    .select("id")
    .single();
  if (error) return { ok: false, result: error.message };
  await admin.from("challenges").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", grant.id);
  await emit(admin, gameId, "forgery_submitted", { payload: { forgeryId: f.id } });
  return { ok: true, result: "awaiting_the_machine" };
}
