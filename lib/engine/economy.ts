import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, type GameState, type Meters } from "./state";

// ---------------------------------------------------------------------------
// The economy (D21/ROGUE): transactions are append-only; balances are cached
// on players. THE RECEIPTS at the reveal replay straight from transactions.
// ---------------------------------------------------------------------------

export async function credit(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  amount: number,
  memo: string,
  claimedSource: "rogue" | "good" | "vault" | "system" = "system"
) {
  // DEBITS go through the conditional RPC — balances must never go negative
  // (review #12). Throws on refusal so callers can abort/rollback.
  if (amount < 0) {
    const { data: covered, error: dErr } = await admin.rpc("debit_if_covered", {
      p_player_id: playerId,
      p_amount: -amount,
    });
    if (dErr) throw new Error(`debit failed: ${dErr.message}`);
    if (!covered) throw new Error("insufficient_balance");
  }
  const { error: tErr } = await admin.from("transactions").insert({
    game_id: gameId,
    player_id: playerId,
    amount,
    memo,
    claimed_source: claimedSource,
  });
  if (tErr) {
    // keep ledger and cache consistent: undo the debit we just took
    if (amount < 0)
      try {
        await admin.rpc("increment_balance", { p_player_id: playerId, p_amount: -amount });
      } catch {}
    throw new Error(`transaction failed: ${tErr.message}`);
  }
  if (amount > 0) {
    const { error: bErr } = await admin.rpc("increment_balance", {
      p_player_id: playerId,
      p_amount: amount,
    });
    // no silent racy fallback (review #8): the RPC ships in the migration —
    // if it's missing, fail loudly so the operator installs it
    if (bErr) throw new Error(`increment_balance RPC failed/missing: ${bErr.message}`);
  }
}

export async function adjustMeters(
  admin: SupabaseClient,
  s: GameState,
  delta: Partial<Meters>,
  publicLine?: string
) {
  const meters: Meters = {
    plunder: Math.max(0, s.game.meters.plunder + (delta.plunder ?? 0)),
    compute: Math.max(0, s.game.meters.compute + (delta.compute ?? 0)),
    confidence: Math.min(100, Math.max(0, s.game.meters.confidence + (delta.confidence ?? 0))),
  };
  const { error } = await admin.from("games").update({ meters }).eq("id", s.game.id);
  if (error) throw new Error(`meters update failed: ${error.message}`);
  const crossedComputeTarget =
    s.game.meters.compute < (s.config.computeTarget ?? Infinity) &&
    meters.compute >= (s.config.computeTarget ?? Infinity);
  const crossedPlunderTarget =
    s.game.meters.plunder < (s.config.plunderTarget ?? Infinity) &&
    meters.plunder >= (s.config.plunderTarget ?? Infinity);
  s.game.meters = meters;
  await emit(admin, s.game.id, "meters_changed", {
    payload: { meters, line: publicLine ?? null },
    isPublic: true, // the evidence drumbeat: every tick is public and arguable
  });
  // GAPS #10: BOSUN's win condition is enforced, not just promised to a prompt —
  // the lantern filling emits a public event the director MUST answer.
  if (crossedComputeTarget && s.game.mode === "rogue" && s.game.status === "live")
    await emit(admin, s.game.id, "compute_complete", {
      payload: { note: "the lantern is full — the good AI has enough. Run its victory beat." },
      isPublic: true,
    });
  // review R3 #8: the rogue's win pressure is enforced symmetrically — one
  // AI's endgame cannot be code while the other's is vibes.
  if (crossedPlunderTarget && s.game.mode === "rogue" && s.game.status === "live")
    await emit(admin, s.game.id, "plunder_complete", {
      payload: { note: "the hold is full — the rogue has what it came for. Run its endgame pressure beat." },
      isPublic: true,
    });
}
