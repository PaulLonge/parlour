import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string() });

// I3: long-press "I need out". Private, never visible to others, routes to the
// director which writes the player into a gentler track. Rate limited by design:
// once set, it stays set until the director handles it.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  await admin.from("players").update({ panic: true }).eq("id", caller.player.id);
  await emit(admin, caller.game.id, "panic_pressed", {
    payload: { player: caller.player.name },
    actorId: caller.player.id,
  });
  after(() => tickDirector(caller.game.id, "event:panic_pressed").catch(console.error));
  return NextResponse.json({ ok: true });
}
