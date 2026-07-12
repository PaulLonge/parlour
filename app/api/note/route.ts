import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNote } from "@/lib/engine/notes";

const Body = z.object({
  code: z.string(),
  to: z.string().min(1).max(40),
  text: z.string().min(1).max(300),
});

// D38: pass a note. Postage applies. The house carries your letters — held,
// edited, dropped, or copied to whoever's tapping the wire. The sender is
// deliberately never told which. No director tick here: held mail waits for
// the next natural tick, which is exactly the delay surveillance deserves.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await sendNote(admin, caller.game.id, caller.player.id, parsed.data.to, parsed.data.text);
  // D47 only: the induction's post-office step completes on delivery. Real
  // games keep the no-tick rule above — surveillance deserves its delay.
  if (result.ok && (caller.game.config as { tutorial?: boolean } | null)?.tutorial) {
    const { after } = await import("next/server");
    const { tickDirector } = await import("@/lib/director/director");
    after(() => tickDirector(caller.game.id, "event:note_sent").catch(console.error));
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
