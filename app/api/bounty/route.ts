import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { claimBounty } from "@/lib/engine/bounty";

const Body = z.object({
  code: z.string(),
  bountyId: z.string().uuid(),
  answer: z.string().min(1).max(200),
});

// D63: claim a public bounty. First correct answer wins; the answer is checked
// server-side against the (server-only) bounty row.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const r = await claimBounty(admin, caller.game.id, caller.player.id, parsed.data.bountyId, parsed.data.answer);
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
