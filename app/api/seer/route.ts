import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consultSeer } from "@/lib/engine/seer";

const Body = z.object({
  code: z.string(),
  question: z.enum(["is_bought", "has_taken_coin", "count_bought", "name_frontman"]),
  targetName: z.string().max(40).optional(),
  confirm: z.boolean().default(false), // forbidden question: confirm you'll spend the charge for a clue
});

// D56: consult THE SIGHT. Answers are computed server-side (the caller could
// never query allegiance directly) and delivered as a private message.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const r = await consultSeer(
    admin,
    caller.game.id,
    caller.player.id,
    parsed.data.question,
    parsed.data.targetName,
    parsed.data.confirm
  );
  return NextResponse.json(r, { status: r.ok ? 200 : r.result === "forbidden" ? 200 : 422 });
}
