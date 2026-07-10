import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { completeChallenge } from "@/lib/engine/referee";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({
  code: z.string(),
  challengeId: z.string().uuid(),
  victimName: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const result = await completeChallenge(
    admin,
    caller.game.id,
    caller.player.id,
    parsed.data.challengeId,
    parsed.data.victimName
  );
  // murder committed / challenge completed → the director reacts (body-found timing etc.)
  if (result.ok)
    after(() => tickDirector(caller.game.id, `event:challenge_${result.result}`).catch(console.error));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
