import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { proposeWager, respondWager, reportWager, placeSideBet } from "@/lib/engine/wagers";
import { tickDirector } from "@/lib/director/director";

// D45: one route, four verbs — propose / respond / report / sidebet.
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("propose"),
    code: z.string(),
    opponent: z.string(),
    amount: z.number().int().positive(),
    game: z.string().min(2).max(80),
  }),
  z.object({
    action: z.literal("respond"),
    code: z.string(),
    wagerId: z.string().uuid(),
    accept: z.boolean(),
  }),
  z.object({
    action: z.literal("report"),
    code: z.string(),
    wagerId: z.string().uuid(),
    winner: z.string(),
  }),
  z.object({
    action: z.literal("sidebet"),
    code: z.string(),
    wagerId: z.string().uuid(),
    backing: z.string(),
    amount: z.number().int().positive(),
  }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const b = parsed.data;
  const caller = await getCaller(b.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const gid = caller.game.id;
  const me = caller.player.id;

  let result;
  switch (b.action) {
    case "propose":
      result = await proposeWager(admin, gid, me, b.opponent, b.amount, b.game);
      break;
    case "respond":
      result = await respondWager(admin, gid, me, b.wagerId, b.accept);
      break;
    case "report":
      result = await reportWager(admin, gid, me, b.wagerId, b.winner);
      if (result.ok && result.result.startsWith("disputed"))
        after(() => tickDirector(gid, "event:wager_disputed").catch(console.error));
      break;
    case "sidebet":
      result = await placeSideBet(admin, gid, me, b.wagerId, b.backing, b.amount);
      break;
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
