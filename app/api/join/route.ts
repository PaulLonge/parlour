import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import type { Story, Character } from "@/lib/schemas/story";

const Body = z.object({
  code: z.string().min(3).max(8),
  name: z.string().min(1).max(40),
  takeover: z.boolean().default(false), // reclaim your name from a new device
  intake: z
    .object({
      age: z.union([z.string(), z.number()]).optional(),
      occupation: z.string().optional(),
      relationToHost: z.string().optional(),
      relations: z.array(z.object({ name: z.string(), how: z.string() })).optional(),
      expectedArrival: z.string().optional(),
    })
    .default({}),
});

export async function POST(req: Request) {
  const supa = await supabaseServer();
  let {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    const { data, error } = await supa.auth.signInAnonymously();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    user = data.user;
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { code, name, takeover, intake } = parsed.data;

  const admin = supabaseAdmin();
  const { data: game } = await admin
    .from("games")
    .select("id, status, sealed_story, mode, hijacked_at, config")
    .eq("code", code.toUpperCase())
    .single();
  if (!game) return NextResponse.json({ error: "game not found" }, { status: 404 });

  const { data: existing } = await admin
    .from("players")
    .select("id, auth_uid, name")
    .eq("game_id", game.id)
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    // pseudo-accounts (D14): tapping your own name on a new device = takeover
    if (existing.auth_uid && existing.auth_uid !== user!.id && !takeover)
      return NextResponse.json({ needsTakeover: true }, { status: 409 });
    const { error } = await admin
      .from("players")
      .update({ auth_uid: user!.id, intake })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ playerId: existing.id, rejoined: true });
  }

  // brand-new player. If the story is already sealed (late door-join),
  // hand them an unused spare character immediately.
  let character: Character | null = null;
  const story = game.sealed_story as Story | null;
  if (story && game.status !== "lobby") {
    const { data: others } = await admin
      .from("players")
      .select("character")
      .eq("game_id", game.id);
    const used = new Set(
      (others ?? []).map((p) => (p.character as Character | null)?.personaName).filter(Boolean)
    );
    character = story.spares.find((c) => !used.has(c.personaName)) ?? null;
  }

  // ROGUE: purses show the starting balance until the hijack "zeroes" them;
  // joiners after the hijack arrive already-plundered (their first message explains).
  const startingBalance =
    game.mode === "rogue" && !game.hijacked_at
      ? ((game.config as { startingBalance?: number })?.startingBalance ?? 1500)
      : 0;

  const { data: player, error } = await admin
    .from("players")
    .insert({
      game_id: game.id,
      auth_uid: user!.id,
      name,
      intake,
      character,
      status: game.status === "lobby" ? "lobby" : "alive",
      balance: startingBalance,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await emit(admin, game.id, "player_joined", {
    payload: { name },
    actorId: player.id,
    isPublic: true,
  });
  return NextResponse.json({ playerId: player.id, rejoined: false });
}
