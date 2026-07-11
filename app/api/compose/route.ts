import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { submitForgery } from "@/lib/engine/rogue";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({
  code: z.string(),
  asSender: z.string().min(1).max(40),
  draft: z.string().min(1).max(1200),
});

// D28 the hacked-AI mission: the player writes AS an AI; the draft parses
// through the director, which may forward, edit, expose — or double-bluff.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await submitForgery(
    admin,
    caller.game.id,
    caller.player.id,
    parsed.data.asSender,
    parsed.data.draft
  );
  if (result.ok)
    after(() => tickDirector(caller.game.id, "event:forgery_submitted").catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
