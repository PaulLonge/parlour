import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { castVote } from "@/lib/engine/referee";

const Body = z.object({ code: z.string(), targetId: z.string().uuid() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await castVote(admin, caller.game.id, caller.player.id, parsed.data.targetId);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
