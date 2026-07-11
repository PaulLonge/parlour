import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string() });

// D34: the lean-in flag — inverse of panic. "Give me more." Routes privately
// to the director, which escalates: juicier missions, front-man candidacy.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  await admin.from("players").update({ eager: true, panic: false }).eq("id", caller.player.id);
  await emit(admin, caller.game.id, "volunteered", {
    payload: { player: caller.player.name },
    actorId: caller.player.id,
  });
  after(() => tickDirector(caller.game.id, "event:volunteered").catch(console.error));
  return NextResponse.json({ ok: true, result: "the_machine_has_noticed_you" });
}
