import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { submitPetition } from "@/lib/engine/rogue";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string(), text: z.string().min(5).max(600) });

// D34: propose a scheme. The director grants it (formalized as a mission),
// declines in voice, or twists it. One pending petition per player.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await submitPetition(admin, caller.game.id, caller.player.id, parsed.data.text);
  if (result.ok)
    after(() => tickDirector(caller.game.id, "event:petition_submitted").catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
