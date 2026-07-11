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
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
