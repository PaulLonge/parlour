import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usePower } from "@/lib/engine/powers";

const Body = z.object({
  code: z.string(),
  power: z.enum(["rob", "swap", "copy", "shield"]),
  targetName: z.string().max(40).optional(),
});

// D61: use a secret power. Effects are computed server-side and reach any
// victim as a message + a balance change — never a live query of the attacker.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const r = await usePower(admin, caller.game.id, caller.player.id, parsed.data.power, parsed.data.targetName);
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
