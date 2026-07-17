import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tickDirector } from "@/lib/director/director";
import { GAME_STATUSES } from "@/lib/schemas/config";

// D71 follow-through: THE HEARTBEAT, venue-independent. Today the open /tv
// tab is the only metronome (app/tv/[code]/page.tsx polls /api/director/tick
// every heartbeatSeconds) — if nobody has it open, the game stalls between
// player actions. This route is the belt-and-braces: Supabase pg_cron
// (supabase/migrations/0010_heartbeat.sql, once applied) hits it once a
// minute with the shared secret, and it ticks EVERY active game itself —
// no game code needed, unlike /api/director/tick which is single-game and
// TV/manual-triggered.
//
// Cheap by construction: tickDirector() (lib/director/director.ts) coalesces
// internally — a game whose last director_log row is <15s old is skipped,
// tutorial games run the deterministic step-runner instead of the LLM, and a
// paused/ended game is skipped before any model call. So a cron tick landing
// seconds after (or before) the TV's own heartbeat for the same game costs a
// cheap read, not a second LLM call — see README "Optional: server-side
// heartbeat" for the one honest gap in that guard (it's a time-window check,
// not a lock).
//
// Bounded work per invocation: at most MAX_GAMES_PER_RUN games, oldest-ticked
// first, so one chatty game can never starve the others across runs — this
// keeps runtime well under serverless limits even called every minute forever.

const MAX_GAMES_PER_RUN = 25;
// "Active" = not lobby (nothing to direct until the host begins the evening)
// and not ended (game over). Paused games (break-glass) are filtered below.
const ACTIVE_STATUSES = GAME_STATUSES.filter((s) => s !== "lobby" && s !== "ended");

export async function POST(req: Request) {
  const secretOk =
    !!process.env.DIRECTOR_TICK_SECRET &&
    req.headers.get("x-tick-secret") === process.env.DIRECTOR_TICK_SECRET;
  if (!secretOk) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();

  // Candidate pool: active, unpaused games. Cast a wider net than
  // MAX_GAMES_PER_RUN so staleness ranking (below) has something to rank —
  // cheap because this stays a handful of concurrent games, ever (one party
  // engine, not a SaaS).
  const { data: candidates, error } = await admin
    .from("games")
    .select("id")
    .in("status", ACTIVE_STATUSES)
    .eq("paused", false)
    .limit(MAX_GAMES_PER_RUN * 4);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (candidates ?? []).map((g) => g.id as string);
  if (!ids.length) return NextResponse.json({ ticked: 0, skipped: 0 });

  // Rank by least-recently-ticked so no single busy game can starve the rest
  // across runs. director_log has no per-game "last ticked" column, so pull
  // recent rows for just these candidates (newest first) and keep the first
  // (= most recent) hit per game in JS; a game with no rows yet has never
  // been ticked and sorts first of all.
  const { data: recentLogs } = await admin
    .from("director_log")
    .select("game_id, created_at")
    .in("game_id", ids)
    .order("id", { ascending: false })
    .limit(MAX_GAMES_PER_RUN * 20);

  const lastTickedAt = new Map<string, number>();
  for (const row of recentLogs ?? []) {
    if (!lastTickedAt.has(row.game_id)) lastTickedAt.set(row.game_id, new Date(row.created_at).getTime());
  }

  const batch = [...ids]
    .sort((a, b) => (lastTickedAt.get(a) ?? 0) - (lastTickedAt.get(b) ?? 0))
    .slice(0, MAX_GAMES_PER_RUN);

  let ticked = 0;
  let skipped = 0;
  for (const gameId of batch) {
    try {
      // "heartbeat" trigger: same fast-model tier + coalescing path the TV
      // page uses (director.ts picks FAST_MODEL for trigger === "heartbeat").
      const result = await tickDirector(gameId, "heartbeat");
      if (result.skipped) skipped++;
      else ticked++;
    } catch {
      // One bad game (bad story JSON, a transient LLM error, whatever) must
      // never block the rest of the batch, and cron must never see a 500 —
      // pg_net would just keep retrying a route that's failing for one game.
      skipped++;
    }
  }

  return NextResponse.json({ ticked, skipped, candidates: ids.length });
}
