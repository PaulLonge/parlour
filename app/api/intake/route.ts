import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Body = z.object({
  code: z.string(),
  intake: z.object({
    age: z.string().max(10).optional(),
    occupation: z.string().max(80).optional(),
    relationToHost: z.string().max(120).optional(),
    relations: z.array(z.object({ name: z.string().max(40), how: z.string().max(80) })).max(10).optional(),
    expectedArrival: z.string().max(20).optional(),
  }),
});

// GAPS #8: the slim intake finally has somewhere to be typed. Updates only the
// caller's own row; all fields optional — skipping still gets you a character.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const merged = { ...(caller.player.intake ?? {}), ...parsed.data.intake };
  const { error } = await admin.from("players").update({ intake: merged }).eq("id", caller.player.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
