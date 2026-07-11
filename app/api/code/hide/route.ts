import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hideCode } from "@/lib/engine/rogue";

const Body = z.object({
  code: z.string(),
  slipCode: z.string().min(2).max(24),
  locationHint: z.string().max(200).default(""),
});

// D21 paper-slip layer: "I hid slip BLACKTIDE behind the wall map."
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await hideCode(
    admin,
    caller.game.id,
    caller.player.id,
    parsed.data.slipCode,
    parsed.data.locationHint
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
