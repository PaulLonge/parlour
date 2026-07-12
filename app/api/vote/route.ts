import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { castVote } from "@/lib/engine/referee";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string(), targetId: z.string().uuid() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await castVote(admin, caller.game.id, caller.player.id, parsed.data.targetId);
  // the director must be able to close a completed vote promptly even with no
  // TV heartbeat running (pub night) — and the induction advances on votes (D47)
  if (result.ok)
    after(() => tickDirector(caller.game.id, "event:vote_cast").catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
