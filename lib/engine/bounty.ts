import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState } from "./state";
import { credit } from "./economy";
import { matchAnswer } from "./verify";

// ---------------------------------------------------------------------------
// D63: claim a BOUNTY — a public race. First player to submit a correct answer
// wins the reward; the bounty closes atomically so exactly one claimant is paid.
// The answer is checked server-side (the bounties row is server-only), so nobody
// can read the solution off the wire.
// ---------------------------------------------------------------------------

export async function claimBounty(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  bountyId: string,
  answer: string
): Promise<{ ok: boolean; result: string; reward?: number }> {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  const me = s.players.find((p) => p.id === playerId);
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };

  const { data: b } = await admin
    .from("bounties")
    .select("*")
    .eq("id", bountyId)
    .eq("game_id", gameId)
    .single();
  if (!b) return { ok: false, result: "unknown_bounty" };
  if (b.status !== "open") return { ok: false, result: "already_claimed" };
  if (b.expires_at && new Date(b.expires_at) < new Date()) {
    await admin.from("bounties").update({ status: "expired" }).eq("id", b.id).eq("status", "open");
    return { ok: false, result: "too_late_—_it_expired" };
  }

  const accepted = Array.isArray(b.expected) ? (b.expected as string[]) : [];
  const good =
    b.kind === "code"
      ? accepted.some((x) => x.trim().toUpperCase() === answer.trim().toUpperCase())
      : (() => {
          const m = matchAnswer(accepted, answer);
          return m === "match" || m === "close";
        })();
  if (!good) return { ok: false, result: "not_it" };

  // atomic claim — exactly one racer wins the update, the rest bounce
  const { data: claimed } = await admin
    .from("bounties")
    .update({ status: "claimed", claimed_by: me.id })
    .eq("id", b.id)
    .eq("status", "open")
    .select("id");
  if (!claimed?.length) return { ok: false, result: "someone_beat_you_to_it" };

  await credit(admin, gameId, me.id, b.reward, `bounty — ${b.brief}`, "system");
  await emit(admin, gameId, "bounty_claimed", {
    payload: { bountyId: b.id, winner: me.name, reward: b.reward, brief: b.brief },
    isPublic: true, // the room sees who snatched it
  });
  return { ok: true, result: "claimed", reward: b.reward };
}
