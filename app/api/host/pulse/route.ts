import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Body = z.object({ code: z.string() });

// D43: the conductor's readout — a live, host-only, ANONYMIZED view of what the
// machine is doing. Aggregates and plain words only: the host stays blind to
// WHO (D24), never to whether the night has a pulse.
const PLAIN: Record<string, string> = {
  bribe_offered: "a coin was dangled",
  bribe_accepted: "a coin was taken",
  mission_offered: "work was assigned",
  challenge_offered: "a challenge went out",
  challenge_completed: "work was completed",
  challenge_expired: "an offer died quietly",
  message_sent: "a letter went out",
  note_sent: "mail moved",
  note_held: "mail was intercepted",
  note_handled: "held mail was ruled on",
  parley_called: "a parley was called",
  parley_ended: "the parley closed",
  accusation_opened: "an accusation opened",
  meters_changed: "the meters moved",
  stamps_granted: "stamps were issued",
  quiz_answered: "a quiz was answered",
  code_hidden: "something was hidden",
  code_found: "something was found",
  audience_held: "an audience was granted",
  petition_submitted: "a scheme was pitched",
  petition_handled: "a scheme was ruled on",
  frontman_appointed: "the hat found a head",
  wiretap_set: "a wire was tapped",
  forgery_submitted: "a forgery entered the wire",
  glyph_verified: "a handshake was proven",
  player_arrived: "a guest arrived",
  hijack: "the takeover",
  burning: "a burning",
  wrongful_accusation: "a wrongful accusation",
};

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
  if (!caller.player.is_host) return NextResponse.json({ error: "hosts only" }, { status: 403 });

  const admin = supabaseAdmin();
  const gameId = caller.game.id;

  const [{ data: recent }, { data: lastPhase }, { data: lastFlag }, { data: lastTick }] =
    await Promise.all([
      admin
        .from("events")
        .select("type, created_at")
        .eq("game_id", gameId)
        .order("id", { ascending: false })
        .limit(60),
      admin
        .from("events")
        .select("created_at")
        .eq("game_id", gameId)
        .eq("type", "phase_advanced")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("events")
        .select("created_at, actor_id")
        .eq("game_id", gameId)
        .eq("type", "flagged_dragging")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("director_log")
        .select("created_at")
        .eq("game_id", gameId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const mins = (iso?: string | null) =>
    iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null;

  // director moves since the last host flag — "was I heard, and what happened?"
  const flagAt = lastFlag?.created_at ?? null;
  const movesSinceFlag = flagAt
    ? (recent ?? []).filter((e) => e.created_at > flagAt && e.type !== "flagged_dragging").length
    : null;

  // last ~8 interesting actions, plain words, no names
  const ticker = (recent ?? [])
    .filter((e) => PLAIN[e.type])
    .slice(0, 8)
    .map((e) => ({ what: PLAIN[e.type], minsAgo: mins(e.created_at) }));

  return NextResponse.json({
    phase:
      caller.game.status === "live"
        ? caller.game.round_phase === "none"
          ? "live play"
          : caller.game.round_phase
        : caller.game.status,
    minutesInPhase: mins(lastPhase?.created_at ?? caller.game.hijacked_at),
    machineLastActedMinsAgo: mins(lastTick?.created_at),
    flag: flagAt
      ? { minsAgo: mins(flagAt), mine: lastFlag?.actor_id === caller.player.id, movesSince: movesSinceFlag }
      : null,
    ticker,
    meters: caller.game.mode === "rogue" ? (caller.game as { meters?: unknown }).meters : null,
  });
}
