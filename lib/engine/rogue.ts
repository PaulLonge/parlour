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
  const story = s.game.sealed_story as Record<string, any> | null;
  const sym = story?.currency?.symbol ?? "Ƀ";
  // D66: SCALE THE TARGETS to who actually turned up (GDD #6 — fixed targets
  // misfire at 8 vs 30). Recompute plunder/compute win lines from the arrived
  // headcount, once, at the hijack; the displayed target then stays fixed.
  const arrived = s.players.filter((p) => p.arrived_at || p.status === "alive").length || 1;
  const scaledConfig = {
    ...(s.game.config as Record<string, unknown>),
    plunderTarget: Math.round(c.plunderPerHead * arrived),
    computeTarget: Math.round(c.computePerHead * arrived),
  };
  await admin
    .from("games")
    .update({ status: "live", round_phase: "none", hijacked_at: new Date().toISOString(), config: scaledConfig })
    .eq("id", gameId);
  s.game.config = scaledConfig;

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
        memo: `PLUNDERED — ${c.startingBalance} ${sym}, the ledger says. The ledger lies.`,
        claimed_source: "vault",
      });
  }
  // the AI names become public knowledge the moment they speak (D33: the
  // audience UI needs them; voices/motives stay sealed). A single-voice night
  // (the pub FIELD TRIAL marks its good AI "(unused tonight)") publishes no
  // good name at all — the UI hides that door rather than labelling it.
  if (story?.ais) {
    const pub = (s.game.story_public ?? {}) as Record<string, unknown>;
    const goodName: string | undefined = story.ais.good?.name;
    await admin
      .from("games")
      .update({
        story_public: {
          ...pub,
          ais: {
            rogue: { name: story.ais.rogue?.name },
            ...(goodName && !goodName.startsWith("(") ? { good: { name: goodName } } : {}),
          },
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

// --- D64: declining a bribe EARNS Resolve (refusal is active content) -------
export async function declineOffer(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  challengeId: string
) {
  const s = await loadState(admin, gameId);
  const c = s.openChallenges.find((x) => x.id === challengeId && x.player_id === playerId);
  if (!c) return { ok: false, result: "offer_not_open" };
  if (c.type !== "bribe") return { ok: false, result: "not_a_bribe" };
  const me = s.players.find((p) => p.id === playerId);
  if (!me) return { ok: false, result: "unknown_player" };
  // atomic: exactly one decline/accept wins
  const { data: claimed } = await admin
    .from("challenges")
    .update({ status: "revoked", response: { declined: true } })
    .eq("id", c.id)
    .eq("status", "offered")
    .select("id");
  if (!claimed?.length) return { ok: false, result: "offer_gone" };
  const gain = cfg(s).resolvePerRefusal;
  await admin.from("players").update({ resolve: (me.resolve ?? 0) + gain }).eq("id", me.id).eq("resolve", me.resolve ?? 0);
  await admin.from("messages").insert({
    game_id: gameId,
    player_id: me.id,
    round_no: s.game.round_no,
    kind: "info",
    title: "🕯 You held the line",
    body: `You turned the coin down. That's worth something — +${gain} Resolve. Spend it on the good side's tools when you're ready. Nobody's told you refused.`,
    claimed_sender: "BOSUN",
  });
  await emit(admin, gameId, "bribe_declined", { actorId: me.id });
  return { ok: true, result: "declined", resolve: (me.resolve ?? 0) + gain };
}

// D64: spend Resolve on the good side's tools
export async function spendResolve(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  action: "compute" | "sight" | "shield"
) {
  const s = await loadState(admin, gameId);
  const me = s.players.find((p) => p.id === playerId);
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };
  const c = cfg(s);
  const cost = action === "sight" ? c.resolveForSight : action === "shield" ? c.resolveForShield : 1;
  if ((me.resolve ?? 0) < cost) return { ok: false, result: "not_enough_resolve" };
  // spend atomically
  const { data: spent } = await admin
    .from("players")
    .update({ resolve: (me.resolve ?? 0) - cost })
    .eq("id", me.id)
    .eq("resolve", me.resolve ?? 0)
    .select("id");
  if (!spent?.length) return { ok: false, result: "try_again" };

  if (action === "compute") {
    await adjustMeters(admin, s, { compute: c.resolveComputeValue }, "honest resolve, made concrete. the lantern brightens.");
    return { ok: true, result: "contributed" };
  }
  if (action === "sight") {
    await admin.from("players").update({ sight: (me.sight ?? 0) + 1 }).eq("id", me.id);
    return { ok: true, result: "bought_sight" };
  }
  // shield
  const powers = { ...(me.powers ?? {}) };
  powers.shield = Number(powers.shield ?? 0) + 1;
  await admin.from("players").update({ powers }).eq("id", me.id);
  return { ok: true, result: "bought_shield" };
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
  if (c.type !== "bribe" && c.type !== "redemption") return { ok: false, result: "not_an_offer" };

  const amount = Number(c.data.amount ?? 0);
  // gap #4: atomic claim — the WHERE on status makes a double-tap lose cleanly
  // instead of double-crediting the purse and the meter
  const { data: claimed } = await admin
    .from("challenges")
    .update({ status: "completed", completed_at: new Date().toISOString(), response: { accepted: true } })
    .eq("id", c.id)
    .eq("status", "offered")
    .select("id");
  if (!claimed?.length) return { ok: false, result: "offer_gone" };

  // D-loyalty: the market runs both ways. A BRIBE flips you toward the rogue and
  // ticks plunder (the twist); a REDEMPTION (BOSUN buying you back) flips you to
  // faithful and ticks compute. The ledger is append-only either way — the coins
  // you ever took from the rogue stay on the receipts; redemption changes your
  // SIDE, never your record.
  if (c.type === "redemption") {
    await credit(admin, gameId, playerId, amount, String(c.data.memo ?? "honest wages — welcome back"), "good");
    if (me.role === "minion") await admin.from("players").update({ role: "faithful" }).eq("id", me.id);
    // if the redeemed player was the rogue's voice, the hat falls — a prize beat
    if (s.game.frontman_player_id === me.id) {
      await admin.from("games").update({ frontman_player_id: null }).eq("id", gameId);
      await emit(admin, gameId, "frontman_turned", { payload: { player: me.name }, isPublic: true });
    }
    await adjustMeters(admin, s, { compute: amount }, String(c.data.publicTrace ?? "someone chose the light. the lantern brightens."));
    await emit(admin, gameId, "redemption_accepted", { payload: { challengeId: c.id }, actorId: me.id });
    return { ok: true, result: "redeemed" };
  }

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

  // --- rung 1b: tap-choice quizzes (D41) — deterministic, one shot ---
  if (verification === "choice") {
    const options = Array.isArray(c.data?.options) ? (c.data.options as string[]) : [];
    const idx = options.findIndex((o) => o === text || String(options.indexOf(o)) === text);
    if (idx === -1) return { ok: false, result: "not_an_option" };
    const correct = c.data?.correctIndex;
    const paying = correct === undefined || correct === null || Number(correct) === idx;
    await admin
      .from("challenges")
      .update({ response: { chose: options[idx], at: new Date().toISOString() } })
      .eq("id", c.id);
    await adjudicate(admin, gameId, c.id, paying ? "complete" : "reject");
    await emit(admin, gameId, "quiz_answered", {
      payload: { challengeId: c.id, paying },
      actorId: playerId,
    });
    return { ok: true, result: paying ? "verified" : "wrong_answer" };
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
    await admin.from("challenges").update({ status: "expired" }).eq("id", c.id).eq("status", "offered");
    return { ok: true, result: "rejected" };
  }
  // atomic claim (review #5): a double-submitted answer or repeated director
  // verdict must not pay twice
  const { data: claimed } = await admin
    .from("challenges")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", c.id)
    .eq("status", "offered")
    .select("id");
  if (!claimed?.length) return { ok: false, result: "already_adjudicated" };
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
  const sHide = await loadState(admin, gameId);
  if (!cfg(sHide).mechanics.codes) return { ok: false, result: "no_paper_tonight" }; // D44 pub-lite
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
    // THE BURNING: exposed, never fronts again, stays fully in play. D58: a
    // correct burn is a STRIKE on CALICO that charges the room's weapon —
    // compute climbs (visible progress toward the shutdown), confidence drops.
    await admin.from("players").update({ burned: true }).eq("id", accusedId);
    await admin.from("games").update({ frontman_player_id: null }).eq("id", gameId);
    const burnCompute = cfg(s).burnComputeReward ?? 20;
    await adjustMeters(admin, s, { compute: burnCompute, confidence: -20 }, "a hand severed. the lantern flares.");
    await emit(admin, gameId, "burning", {
      payload: { player: accused.name, votes: sorted[0][1], compute: burnCompute },
      isPublic: true,
    });
    // closure marker for every outcome (the public theatre stays with
    // `burning`/`wrongful_accusation`) — the induction's verdict step waits
    // on this, and before it existed a CORRECT naming stalled the tutorial
    await emit(admin, gameId, "accusation_closed", { payload: { outcome: "burned" } });
    return { ok: true, result: "burned", player: accused.name };
  }
  // WRONG: the rogue gains tempo. NOT plunder (GDD review #7): the plunder
  // meter must contain ONLY money the room chose to take — the ceremony
  // replays the receipts, and a judicial penalty has no receipt behind it.
  // Tempo = hidden confidence + a private director cue to spend a free
  // bribe round; the public line keeps the sting without cooking the books.
  await adjustMeters(admin, s, { confidence: 10 }, "justice is expensive. the room just paid in trust.");
  await emit(admin, gameId, "rogue_tempo", {
    payload: { note: "wrongful verdict — the rogue has tempo: spend a free bribe round now, while they doubt each other" },
  });
  await emit(admin, gameId, "wrongful_accusation", {
    payload: { player: accused.name, votes: sorted[0][1] },
    isPublic: true,
  });
  await emit(admin, gameId, "accusation_closed", { payload: { outcome: "wrongful" } });
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
  // D58: TWO room-win paths. OUT-BUILD — compute crossed its target, BOSUN pulls
  // the plug (a full lantern wins even if the final name is wrong; you already
  // built the shutdown). Or the HARD WAY — name CALICO's last front man to sever
  // its last hand. CALICO wins only if the room did NEITHER.
  const computeReached = s.game.meters.compute >= (s.config.computeTarget ?? Infinity);
  const correctName = !!namedId && namedId === s.game.frontman_player_id;
  const humansWin = computeReached || correctName;
  const winPath = computeReached ? "shutdown" : correctName ? "named" : "none";

  await admin.from("games").update({ status: "reveal", round_phase: "none" }).eq("id", gameId);
  await emit(admin, gameId, "unmasking_resolved", {
    payload: {
      named: named?.name ?? "(no verdict)",
      frontman: frontman?.name ?? "(none)",
      humansWin,
      winPath, // 'shutdown' = out-built, 'named' = clutch naming, 'none' = CALICO keeps everything
      computeReached,
      minions: s.players.filter((p) => p.role === "minion").map((p) => p.name),
      burned: s.players.filter((p) => p.burned).map((p) => p.name),
    },
    isPublic: true,
  });

  // GAPS #5/#6: the accountant reports — awards + THE RECEIPTS (Ledger Three:
  // times damningly public, names withheld) become public events the TV and
  // phones render during the ceremony.
  const { computeStats } = await import("./stats");
  const { awards, cards } = await computeStats(admin, gameId);
  const { data: bribeTxns } = await admin
    .from("transactions")
    .select("amount, memo, created_at")
    .eq("game_id", gameId)
    .eq("claimed_source", "rogue")
    .gt("amount", 0)
    .order("id");
  await emit(admin, gameId, "receipts", {
    payload: {
      receipts: (bribeTxns ?? []).map((t) => ({
        at: new Date(t.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        amount: t.amount,
        memo: t.memo,
      })),
    },
    isPublic: true,
  });
  await emit(admin, gameId, "final_awards", { payload: { awards }, isPublic: true });
  // personal night-cards go to each player privately
  for (const card of cards) {
    const p = s.players.find((x) => x.name === card.name);
    if (!p) continue;
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: p.id,
      round_no: s.game.round_no,
      kind: "system",
      title: "🧾 Your night, itemised",
      body: `Offers received: ${card.offersReceived} · taken: ${card.bribesTaken} · declined: ${card.bribesRefused}\nEarned: ${card.earned} · spent: ${card.spent}\nMissions done: ${card.missionsDone} · codes found: ${card.codesFound} · audiences: ${card.audiencesHeld}\nSuspected by ${card.suspectedBy} ${card.suspectedBy === 1 ? "person" : "people"}.\nYou finished as: ${card.burned ? "burned, gloriously" : card.role}.`,
    });
  }

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
  // D57: hosts ARE eligible (reverses D48). A front man only knows they're the
  // rogue's voice, not who the other minions are (one-way knowledge) — so a host
  // fronting doesn't spoil the WHO-surprise. The Commissioner outed as the
  // machine's puppet, or BOSUN's champion seduced into fronting, are prize beats.
  const hadOne = !!s.game.frontman_player_id && s.game.frontman_player_id !== p.id;
  await admin.from("games").update({ frontman_player_id: p.id }).eq("id", gameId);
  await emit(admin, gameId, "frontman_appointed", { payload: { player: p.name } }); // private event
  // D67: announce THAT the hat moved (never to whom) — a rotation is public
  // knowledge the room can reason about, the name is not.
  if (hadOne)
    await emit(admin, gameId, "frontman_rotated", {
      payload: { note: "a new voice speaks for the machine — someone in this room. Not the one you burned." },
      isPublic: true,
    });
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
