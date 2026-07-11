import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acceptOffer } from "@/lib/engine/rogue";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string(), challengeId: z.string().uuid() });

// ROGUE: taking the coin. Accepting a bribe credits the purse, converts the
// player to a minion, and ticks the plunder meter — the twist engine (D19).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await acceptOffer(admin, caller.game.id, caller.player.id, parsed.data.challengeId);
  if (result.ok)
    after(() => tickDirector(caller.game.id, "event:bribe_accepted").catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
