import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findCode } from "@/lib/engine/rogue";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string(), slipCode: z.string().min(2).max(24) });

// D21: typing a found code — proof a physical event happened. Completes the
// hider's chain AND the finder's mission; the director pays both on its tick.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await findCode(admin, caller.game.id, caller.player.id, parsed.data.slipCode);
  if (result.ok)
    after(() => tickDirector(caller.game.id, "event:code_found").catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
