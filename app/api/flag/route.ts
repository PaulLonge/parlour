import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string() });

// D42a: the "this is dragging" flag — HOSTS ONLY (Paul + co-host), the room's two
// calibrated sensors. A soft private nudge below break-glass: no ceremony, no
// public tally, advisory during votes. Guests' individual boredom is the
// director's job via behavior telemetry (open missions, completions, recency),
// not self-report. Cooldown: one flag per 10 min per host.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
  if (!caller.player.is_host)
    return NextResponse.json({ error: "hosts only" }, { status: 403 });

  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 10 * 60000).toISOString();
  const { count } = await admin
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("game_id", caller.game.id)
    .eq("type", "flagged_dragging")
    .eq("actor_id", caller.player.id)
    .gte("created_at", since);
  if ((count ?? 0) > 0)
    return NextResponse.json({ ok: true, result: "heard_you_the_first_time" });

  await emit(admin, caller.game.id, "flagged_dragging", {
    payload: { player: caller.player.name },
    actorId: caller.player.id,
  });
  after(() => tickDirector(caller.game.id, "event:flagged_dragging").catch(console.error));
  return NextResponse.json({ ok: true, result: "noted" });
}
