import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { declineOffer } from "@/lib/engine/rogue";

const Body = z.object({ code: z.string(), challengeId: z.string().uuid() });

// D64: decline a bribe → bank Resolve. Refusal is active content.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
  const admin = supabaseAdmin();
  const r = await declineOffer(admin, caller.game.id, caller.player.id, parsed.data.challengeId);
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
