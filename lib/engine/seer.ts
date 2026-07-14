import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState } from "./state";

// ---------------------------------------------------------------------------
// D56: THE SIGHT — the Seer. A scarce charge (players.sight) lets a player ask
// the machine ONE bounded true thing. Everything here is DETERMINISTIC (no LLM):
// the answers are computed from real state, delivered as a private message, and
// cannot be faked. The truth DOMAIN is narrow on purpose — the front man is
// never confirmed; asking for it deflects to a true partial clue (Paul's idea).
// ---------------------------------------------------------------------------

export type SeerQuestion = "is_bought" | "has_taken_coin" | "count_bought" | "name_frontman";

export async function consultSeer(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  question: SeerQuestion,
  targetName: string | undefined,
  confirm: boolean
): Promise<{ ok: boolean; result: string; warn?: string }> {
  const s = await loadState(admin, gameId);
  if (s.game.mode !== "rogue" || !s.game.hijacked_at) return { ok: false, result: "the_sight_sleeps" };
  const me = s.players.find((p) => p.id === playerId);
  if (!me) return { ok: false, result: "unknown_player" };
  if ((me.sight ?? 0) < 1) return { ok: false, result: "no_sight" };

  const target =
    question === "count_bought"
      ? null
      : s.players.find((p) => p.name.toLowerCase() === (targetName ?? "").toLowerCase());
  if (question !== "count_bought" && !target) return { ok: false, result: "who?" };
  if (target && target.id === me.id) return { ok: false, result: "you_already_know_your_own_heart" };

  // --- the forbidden question: the front man is never handed over -----------
  // Warn first (no charge spent); only on confirm do we spend it for a TRUE clue.
  if (question === "name_frontman") {
    if (!confirm)
      return {
        ok: false,
        result: "forbidden",
        warn:
          "I don't hand over my own voice for a single favour. Ask me that and I'll give you a CLUE, not a name — and it will cost you your sight all the same. Ask something I'll answer plainly instead, or say the word and take the clue.",
      };
    // a true, partial clue drawn from real state — never the name
    const fm = s.players.find((p) => p.id === s.game.frontman_player_id);
    let clue: string;
    if (!fm) {
      clue = "No one speaks for me yet. When someone does, I'll still never name them — but there will be more to see.";
    } else {
      const { data: txns } = await admin
        .from("transactions")
        .select("amount, claimed_source")
        .eq("game_id", gameId)
        .eq("player_id", fm.id);
      const coins = (txns ?? []).filter((t) => t.claimed_source === "rogue" && t.amount > 0).length;
      const parts = [
        coins > 0
          ? `has taken ${coins > 2 ? "at least three" : coins === 2 ? "two" : "one"} of my coins`
          : "has been paid in ways you haven't seen",
        "still wears an unburned face",
        fm.arrived_at ? "was among you before the lights went out" : "came late to the wreck",
      ];
      clue = `The one who speaks for me ${parts[0]}, ${parts[1]}, and ${parts[2]}. Make of it what you will.`;
    }
    await spend(admin, me.id, me.sight ?? 0);
    await deliver(admin, gameId, me.id, s.game.round_no, `👁 THE SIGHT — a clue, not a name`, clue);
    await emit(admin, gameId, "seer_consulted", { payload: { question, forbidden: true }, actorId: me.id });
    return { ok: true, result: "clue_given" };
  }

  // --- the answerable domain: deterministic, true ---------------------------
  let answer: string;
  if (question === "count_bought") {
    const n = s.players.filter((p) => p.role === "minion").length;
    answer = n === 0 ? "No one in this room serves the rogue. Yet." : `${n} ${n === 1 ? "soul serves" : "souls serve"} the rogue right now. I don't say which.`;
  } else if (question === "is_bought") {
    answer = target!.role === "minion" ? `${target!.name} serves the rogue. Right now.` : `${target!.name} is, as far as my ledger shows, still clean. For now.`;
  } else {
    // has_taken_coin — differs from is_bought once loyalties can flip (D-two-way)
    const { data: txns } = await admin
      .from("transactions")
      .select("amount, claimed_source")
      .eq("game_id", gameId)
      .eq("player_id", target!.id);
    const took = (txns ?? []).some((t) => t.claimed_source === "rogue" && t.amount > 0);
    answer = took ? `${target!.name} has taken my coin at least once tonight. What they are NOW is another question.` : `${target!.name} has never taken a coin from me. Draw your own conclusions.`;
  }

  await spend(admin, me.id, me.sight ?? 0);
  await deliver(admin, gameId, me.id, s.game.round_no, `👁 THE SIGHT`, answer);
  await emit(admin, gameId, "seer_consulted", { payload: { question }, actorId: me.id });
  return { ok: true, result: "seen" };
}

// optimistic-concurrency decrement, like stamps — two taps can't share a charge
async function spend(admin: SupabaseClient, playerId: string, current: number) {
  await admin.from("players").update({ sight: Math.max(0, current - 1) }).eq("id", playerId).eq("sight", current);
}

async function deliver(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  roundNo: number,
  title: string,
  body: string
) {
  await admin.from("messages").insert({
    game_id: gameId,
    player_id: playerId,
    round_no: roundNo,
    kind: "secret",
    title,
    body,
    claimed_sender: "THE SIGHT",
  });
}
