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
  const { error: tErr } = await admin.from("transactions").insert({
    game_id: gameId,
    player_id: playerId,
    amount,
    memo,
    claimed_source: claimedSource,
  });
  if (tErr) throw new Error(`transaction failed: ${tErr.message}`);
  const { error: bErr } = await admin.rpc("increment_balance", {
    p_player_id: playerId,
    p_amount: amount,
  });
  // fallback if the RPC isn't installed: read-modify-write (fine at party scale)
  if (bErr) {
    const { data: p } = await admin.from("players").select("balance").eq("id", playerId).single();
    await admin
      .from("players")
      .update({ balance: (p?.balance ?? 0) + amount })
      .eq("id", playerId);
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
}
