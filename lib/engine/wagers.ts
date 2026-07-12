import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState } from "./state";
import { credit } from "./economy";
import { GameConfig } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// D45: wagers — challenge someone to win their coins. Stakes ESCROW on accept;
// both parties report the winner; a match settles, a mismatch goes to the
// machine. Side bets ride accepted wagers, 1:1 against the house.
// ---------------------------------------------------------------------------

export function wagerCap(balance: number, cfg: GameConfig): number {
  return Math.max(cfg.wagerCapFloor, Math.floor(balance * cfg.wagerCapPct));
}

export async function proposeWager(
  admin: SupabaseClient,
  gameId: string,
  challengerId: string,
  opponentName: string,
  amount: number,
  gameDesc: string
) {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  if (s.game.mode !== "rogue" || !s.game.hijacked_at)
    return { ok: false, result: "the_book_is_closed" };
  const me = s.players.find((p) => p.id === challengerId);
  const them = s.players.find((p) => p.name.toLowerCase() === opponentName.toLowerCase());
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };
  if (!them || them.status !== "alive") return { ok: false, result: "opponent_not_here" };
  if (them.id === me.id) return { ok: false, result: "duel_yourself_in_the_mirror" };
  const cfg = GameConfig.parse(s.game.config ?? {});
  const cap = wagerCap(me.balance, cfg);
  if (amount > cap) return { ok: false, result: "over_cap", cap };
  if (amount > me.balance) return { ok: false, result: "insufficient_coins" };

  const { data: w, error } = await admin
    .from("wagers")
    .insert({
      game_id: gameId,
      challenger_id: me.id,
      opponent_id: them.id,
      amount,
      game_desc: gameDesc.slice(0, 80),
    })
    .select("id")
    .single();
  if (error) return { ok: false, result: error.message };

  await admin.from("messages").insert({
    game_id: gameId,
    player_id: them.id,
    round_no: s.game.round_no,
    kind: "info",
    title: `🎲 ${me.name} challenges you`,
    body: `${gameDesc} — for ${amount}. Accept on your Now screen. Decline and nobody will ever know. (They will absolutely know.)`,
  });
  await emit(admin, gameId, "wager_proposed", { payload: { wagerId: w.id }, actorId: me.id });
  return { ok: true, result: "thrown_down", wagerId: w.id };
}

export async function respondWager(
  admin: SupabaseClient,
  gameId: string,
  responderId: string,
  wagerId: string,
  accept: boolean
) {
  const s = await loadState(admin, gameId);
  const { data: w } = await admin.from("wagers").select("*").eq("id", wagerId).eq("game_id", gameId).single();
  if (!w) return { ok: false, result: "unknown_wager" };
  if (w.opponent_id !== responderId) return { ok: false, result: "not_your_duel" };
  if (w.status !== "proposed") return { ok: false, result: `already_${w.status}` };

  if (!accept) {
    await admin.from("wagers").update({ status: "declined" }).eq("id", wagerId);
    await emit(admin, gameId, "wager_declined", { payload: { wagerId } });
    return { ok: true, result: "declined" };
  }

  const challenger = s.players.find((p) => p.id === w.challenger_id);
  const opponent = s.players.find((p) => p.id === w.opponent_id);
  if (!challenger || !opponent) return { ok: false, result: "players_missing" };
  if (challenger.balance < w.amount || opponent.balance < w.amount)
    return { ok: false, result: "stakes_no_longer_covered" };

  // atomic-ish acceptance gate, then ESCROW both stakes
  const { data: claimed } = await admin
    .from("wagers")
    .update({ status: "accepted" })
    .eq("id", wagerId)
    .eq("status", "proposed")
    .select("id");
  if (!claimed?.length) return { ok: false, result: "already_handled" };
  await credit(admin, gameId, challenger.id, -w.amount, `stake — ${w.game_desc}`, "system");
  await credit(admin, gameId, opponent.id, -w.amount, `stake — ${w.game_desc}`, "system");

  await emit(admin, gameId, "wager_accepted", {
    payload: { wagerId, challenger: challenger.name, opponent: opponent.name, amount: w.amount, game: w.game_desc },
    isPublic: true, // the book is open — side bets welcome
  });
  return { ok: true, result: "on" };
}

export async function reportWager(
  admin: SupabaseClient,
  gameId: string,
  reporterId: string,
  wagerId: string,
  winnerName: string
) {
  const s = await loadState(admin, gameId);
  const { data: w } = await admin.from("wagers").select("*").eq("id", wagerId).eq("game_id", gameId).single();
  if (!w) return { ok: false, result: "unknown_wager" };
  if (w.status !== "accepted") return { ok: false, result: `not_in_play_(${w.status})` };
  if (reporterId !== w.challenger_id && reporterId !== w.opponent_id)
    return { ok: false, result: "not_your_duel" };
  const winner = s.players.find((p) => p.name.toLowerCase() === winnerName.toLowerCase());
  if (!winner || (winner.id !== w.challenger_id && winner.id !== w.opponent_id))
    return { ok: false, result: "winner_must_be_a_contestant" };

  const field = reporterId === w.challenger_id ? "challenger_says" : "opponent_says";
  await admin.from("wagers").update({ [field]: winner.id }).eq("id", wagerId);
  const { data: updated } = await admin.from("wagers").select("*").eq("id", wagerId).single();

  if (!updated?.challenger_says || !updated?.opponent_says)
    return { ok: true, result: "awaiting_the_other_account" };

  if (updated.challenger_says === updated.opponent_says) {
    return settleWager(admin, gameId, wagerId, updated.challenger_says);
  }
  // two testimonies, one lie
  await admin.from("wagers").update({ status: "disputed" }).eq("id", wagerId);
  await emit(admin, gameId, "wager_disputed", { payload: { wagerId } });
  return { ok: true, result: "disputed_—_the_machine_will_rule" };
}

export async function settleWager(
  admin: SupabaseClient,
  gameId: string,
  wagerId: string,
  winnerId: string | null // null = void, refund stakes
) {
  const { data: w } = await admin.from("wagers").select("*").eq("id", wagerId).eq("game_id", gameId).single();
  if (!w) return { ok: false, result: "unknown_wager" };
  if (!["accepted", "disputed"].includes(w.status)) return { ok: false, result: `already_${w.status}` };
  const s = await loadState(admin, gameId);
  const challenger = s.players.find((p) => p.id === w.challenger_id);
  const opponent = s.players.find((p) => p.id === w.opponent_id);

  if (!winnerId) {
    await admin.from("wagers").update({ status: "voided" }).eq("id", wagerId);
    await credit(admin, gameId, w.challenger_id, w.amount, "stake refunded — the machine voids the book", "system");
    await credit(admin, gameId, w.opponent_id, w.amount, "stake refunded — the machine voids the book", "system");
    // refund side bets
    const { data: bets } = await admin.from("side_bets").select("*").eq("wager_id", wagerId).eq("status", "open");
    for (const b of bets ?? []) {
      await credit(admin, gameId, b.bettor_id, b.amount, "side bet refunded", "system");
      await admin.from("side_bets").update({ status: "refunded" }).eq("id", b.id);
    }
    await emit(admin, gameId, "wager_voided", { payload: { wagerId }, isPublic: true });
    return { ok: true, result: "voided" };
  }

  const winner = winnerId === w.challenger_id ? challenger : opponent;
  const loser = winnerId === w.challenger_id ? opponent : challenger;
  await admin.from("wagers").update({ status: "settled", winner_id: winnerId }).eq("id", wagerId);
  await credit(admin, gameId, winnerId, w.amount * 2, `won — ${w.game_desc}`, "system");

  // side bets: 1:1 against the house
  const { data: bets } = await admin.from("side_bets").select("*").eq("wager_id", wagerId).eq("status", "open");
  for (const b of bets ?? []) {
    if (b.backing_id === winnerId) {
      await credit(admin, gameId, b.bettor_id, b.amount * 2, `side bet won — backed ${winner?.name}`, "rogue");
      await admin.from("side_bets").update({ status: "won" }).eq("id", b.id);
    } else {
      await admin.from("side_bets").update({ status: "lost" }).eq("id", b.id);
    }
  }

  await emit(admin, gameId, "wager_settled", {
    payload: { wagerId, winner: winner?.name, loser: loser?.name, amount: w.amount, game: w.game_desc },
    isPublic: true, // pub content: the Spyglass announces who took whose coins
  });
  return { ok: true, result: "settled" };
}

export async function placeSideBet(
  admin: SupabaseClient,
  gameId: string,
  bettorId: string,
  wagerId: string,
  backingName: string,
  amount: number
) {
  const s = await loadState(admin, gameId);
  const { data: w } = await admin.from("wagers").select("*").eq("id", wagerId).eq("game_id", gameId).single();
  if (!w || w.status !== "accepted") return { ok: false, result: "book_closed" };
  if (bettorId === w.challenger_id || bettorId === w.opponent_id)
    return { ok: false, result: "contestants_cannot_side_bet" };
  const me = s.players.find((p) => p.id === bettorId);
  const backing = s.players.find((p) => p.name.toLowerCase() === backingName.toLowerCase());
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };
  if (!backing || (backing.id !== w.challenger_id && backing.id !== w.opponent_id))
    return { ok: false, result: "back_a_contestant" };
  const cfg = GameConfig.parse(s.game.config ?? {});
  const cap = wagerCap(me.balance, cfg);
  if (amount > cap || amount > me.balance) return { ok: false, result: "over_cap", cap };

  const { error } = await admin.from("side_bets").insert({
    game_id: gameId,
    wager_id: wagerId,
    bettor_id: me.id,
    backing_id: backing.id,
    amount,
  });
  if (error)
    return { ok: false, result: error.message.includes("duplicate") ? "one_bet_per_book" : error.message };
  await credit(admin, gameId, me.id, -amount, `side bet — backing ${backing.name}`, "system");
  await emit(admin, gameId, "side_bet_placed", { payload: { wagerId }, actorId: me.id });
  return { ok: true, result: "the_house_notes_your_confidence" };
}
