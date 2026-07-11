import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// GAPS #5/#9: the stats & awards engine. Everything here is computed from the
// event log, transactions, challenges, and votes — the receipts were always
// being kept; this is the accountant. Runs once at the unmasking.
// ---------------------------------------------------------------------------

export type Award = { title: string; winner: string; line: string };
export type PlayerCard = {
  name: string;
  offersReceived: number;
  bribesTaken: number;
  bribesRefused: number;
  earned: number;
  spent: number;
  missionsDone: number;
  codesFound: number;
  audiencesHeld: number;
  suspectedBy: number; // votes cast against them across accusations + unmasking
  role: string;
  burned: boolean;
};

export async function computeStats(admin: SupabaseClient, gameId: string) {
  const [{ data: players }, { data: challenges }, { data: txns }, { data: votes }, { data: events }] =
    await Promise.all([
      admin.from("players").select("id, name, role, burned, balance, status").eq("game_id", gameId),
      admin
        .from("challenges")
        .select("player_id, type, status, data, offered_at, completed_at")
        .eq("game_id", gameId),
      admin.from("transactions").select("player_id, amount, memo, claimed_source, created_at").eq("game_id", gameId),
      admin.from("votes").select("voter_id, target_id, round_no").eq("game_id", gameId),
      admin
        .from("events")
        .select("type, payload, actor_id, created_at")
        .eq("game_id", gameId)
        .in("type", ["burning", "wrongful_accusation", "audience_held", "code_found"]),
    ]);

  const P = players ?? [];
  const nameOf = (id: string | null) => P.find((p) => p.id === id)?.name ?? "?";
  const frontmanless = P.filter((p) => p.role !== "minion" && !p.burned);

  // per-player cards
  const cards: PlayerCard[] = P.map((p) => {
    const mine = (challenges ?? []).filter((c) => c.player_id === p.id);
    const bribes = mine.filter((c) => c.type === "bribe");
    const myTx = (txns ?? []).filter((t) => t.player_id === p.id);
    return {
      name: p.name,
      offersReceived: bribes.length,
      bribesTaken: bribes.filter((c) => c.status === "completed").length,
      bribesRefused: bribes.filter((c) => c.status === "expired" || c.status === "revoked").length,
      earned: myTx.filter((t) => t.amount > 0 && t.claimed_source !== "vault").reduce((s, t) => s + t.amount, 0),
      spent: -myTx.filter((t) => t.amount < 0 && t.claimed_source !== "vault").reduce((s, t) => s + t.amount, 0),
      missionsDone: mine.filter((c) => c.type === "mission" && c.status === "completed").length,
      codesFound: (events ?? []).filter((e) => e.type === "code_found" && e.actor_id === p.id).length,
      audiencesHeld: (events ?? []).filter(
        (e) => e.type === "audience_held" && (e.payload as { player?: string })?.player === p.name
      ).length,
      suspectedBy: (votes ?? []).filter((v) => v.target_id === p.id).length,
      role: p.role,
      burned: p.burned,
    };
  });

  // ---- awards ----
  const awards: Award[] = [];

  // THE CHEAPEST BUY — fastest bribe acceptance
  const accepted = (challenges ?? [])
    .filter((c) => c.type === "bribe" && c.status === "completed" && c.completed_at)
    .map((c) => ({
      player: nameOf(c.player_id),
      secs: (new Date(c.completed_at!).getTime() - new Date(c.offered_at).getTime()) / 1000,
    }))
    .sort((a, b) => a.secs - b.secs);
  if (accepted[0])
    awards.push({
      title: "THE CHEAPEST BUY",
      winner: accepted[0].player,
      line: `${Math.max(1, Math.round(accepted[0].secs))} seconds from offer to coin. I've bought coffee that took longer.`,
    });

  // THE IRON PURSE — most offers refused, none taken
  const iron = cards
    .filter((c) => c.bribesTaken === 0 && c.bribesRefused > 0)
    .sort((a, b) => b.bribesRefused - a.bribesRefused)[0];
  if (iron)
    awards.push({
      title: "THE IRON PURSE",
      winner: iron.name,
      line: `${iron.bribesRefused} offer${iron.bribesRefused === 1 ? "" : "s"} declined. File marked "expensive", not "honest".`,
    });

  // THE WRONG'UN — most votes cast against the eventually-innocent
  const innocentIds = new Set(frontmanless.map((p) => p.id));
  const wrongTally = new Map<string, number>();
  for (const v of votes ?? [])
    if (innocentIds.has(v.target_id))
      wrongTally.set(v.voter_id, (wrongTally.get(v.voter_id) ?? 0) + 1);
  const wrong = [...wrongTally.entries()].sort((a, b) => b[1] - a[1])[0];
  if (wrong && wrong[1] >= 2)
    awards.push({
      title: "THE WRONG'UN",
      winner: nameOf(wrong[0]),
      line: `${wrong[1]} confident fingers pointed at the blameless. The foam finger is theirs.`,
    });

  // THE PHOENIX — burned, then kept playing (any post-burn completion)
  const burnEvent = (events ?? []).find((e) => e.type === "burning");
  if (burnEvent) {
    const burnedName = (burnEvent.payload as { player?: string })?.player;
    const burnedP = P.find((p) => p.name === burnedName);
    const postBurn = burnedP
      ? (challenges ?? []).some(
          (c) => c.player_id === burnedP.id && c.status === "completed" && (c.completed_at ?? "") > burnEvent.created_at
        )
      : false;
    if (burnedName && postBurn)
      awards.push({
        title: "THE PHOENIX OF PORT PERJURY",
        winner: burnedName,
        line: "Burned, and came back swinging. I don't rehire. I'm beginning to see why others do.",
      });
  }

  // THE GHOST — most suspected innocent
  const ghost = cards
    .filter((c) => c.role !== "minion" && !c.burned && c.suspectedBy > 0)
    .sort((a, b) => b.suspectedBy - a.suspectedBy)[0];
  if (ghost)
    awards.push({
      title: "THE GHOST",
      winner: ghost.name,
      line: `Suspected by ${ghost.suspectedBy}, guilty of nothing. A formal apology is owed, in unison.`,
    });

  // THE RICHEST PIRATE — terminal purse value (GAPS #9 resolved: money's endgame
  // meaning is a podium moment)
  const rich = [...P].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))[0];
  if (rich && (rich.balance ?? 0) > 0)
    awards.push({
      title: "THE RICHEST PIRATE",
      winner: rich.name,
      line: `Ƀ${rich.balance} at close of business. We politely decline to ask how.`,
    });

  return { awards, cards };
}
