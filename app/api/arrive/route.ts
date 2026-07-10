import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({ code: z.string() });

// Door check-in (QR at the entrance). Arrival is a STORY EVENT (I6):
// the director reacts with an entrance beat.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  if (!caller.player.arrived_at) {
    await admin
      .from("players")
      .update({
        arrived_at: new Date().toISOString(),
        status: caller.player.status === "lobby" ? "alive" : caller.player.status,
      })
      .eq("id", caller.player.id);
    await emit(admin, caller.game.id, "player_arrived", {
      payload: { name: caller.player.name },
      actorId: caller.player.id,
    });
    after(() => tickDirector(caller.game.id, `event:player_arrived:${caller.player.name}`).catch(console.error));
  }
  return NextResponse.json({ arrived: true });
}
