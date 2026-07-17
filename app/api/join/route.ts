import { NextResponse, after } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";
import type { Story, Character } from "@/lib/schemas/story";

const Body = z.object({
  code: z.string().min(3).max(8),
  name: z.string().min(1).max(40),
  password: z.string().max(30).optional(), // D45: the night selector word
  takeover: z.boolean().default(false), // reclaim your name from a new device
  seatCode: z.string().max(8).optional(), // D53: the seat's re-entry code (takeover only)
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
  const { code, name, password, takeover, seatCode, intake } = parsed.data;

  const admin = supabaseAdmin();
  const { data: game } = await admin
    .from("games")
    .select("id, status, sealed_story, mode, hijacked_at, config, join_password")
    .eq("code", code.toUpperCase())
    .single();
  if (!game) return NextResponse.json({ error: "game not found" }, { status: 404 });

  // D45: the night-selector word — stops phones wandering into the wrong night
  if (game.join_password && password?.trim().toLowerCase() !== game.join_password)
    return NextResponse.json({ needsPassword: true, error: "tonight's word, please" }, { status: 401 });

  // exact case-insensitive match in JS — .ilike() treats the joiner's name as
  // a PATTERN, so "%" or "_ave" could seize an arbitrary player's purse
  // (review #7, security)
  const { data: allPlayers } = await admin
    .from("players")
    .select("id, auth_uid, name, seat_code")
    .eq("game_id", game.id);
  const existing =
    (allPlayers ?? []).find((p) => p.name.toLowerCase() === name.trim().toLowerCase()) ?? null;

  if (existing) {
    // pseudo-accounts (D14): tapping your own name on a new device = takeover
    const crossDevice = !!existing.auth_uid && existing.auth_uid !== user!.id;
    if (crossDevice && !takeover) return NextResponse.json({ needsTakeover: true }, { status: 409 });
    // D53: cross-device takeover needs the seat's code — a friend grabbing your
    // name can't read your mail/alignment/purse. Legacy rows without a code
    // (or same-device rejoin) pass straight through. Host can look codes up.
    if (crossDevice && existing.seat_code && (seatCode?.trim() ?? "") !== existing.seat_code)
      return NextResponse.json(
        { needsSeatCode: true, error: "seat code, please — check your other phone, or ask the host" },
        { status: 403 }
      );
    // One session holds ONE seat per game: release any other seat this user
    // occupies before taking this one. Without this, sandbox possession (and
    // any same-device player switch) leaves BOTH rows carrying this auth_uid,
    // and the client's who-am-I lookup — one row per game — errors into null:
    // "Play as …" blanks and /g falls back to the join screen for good.
    const { error: detachErr } = await admin
      .from("players")
      .update({ auth_uid: null })
      .eq("game_id", game.id)
      .eq("auth_uid", user!.id)
      .neq("id", existing.id);
    if (detachErr) return NextResponse.json({ error: detachErr.message }, { status: 500 });
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
    // ?. — rogue/tutorial stories may carry no murder-shaped spares
    character = story.spares?.find((c) => !used.has(c.personaName)) ?? null;
  }

  // ROGUE: purses show the starting balance until the hijack "zeroes" them;
  // joiners after the hijack arrive already-plundered (their first message explains).
  const startingBalance =
    game.mode === "rogue" && !game.hijacked_at
      ? ((game.config as { startingBalance?: number })?.startingBalance ?? 1500)
      : 0;

  // D53: mint the seat's re-entry code — 4 digits, easy to say/remember, no
  // lookalike ambiguity. Shown to the owner in More; needed to take the seat
  // from another device.
  const seat = String(Math.floor(1000 + Math.random() * 9000));
  // same seat hygiene as the takeover path: this session releases any seat it
  // already holds in this game before sitting down as someone new
  const { error: detachErr } = await admin
    .from("players")
    .update({ auth_uid: null })
    .eq("game_id", game.id)
    .eq("auth_uid", user!.id);
  if (detachErr) return NextResponse.json({ error: detachErr.message }, { status: 500 });
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
      seat_code: seat,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await emit(admin, game.id, "player_joined", {
    payload: { name },
    actorId: player.id,
    isPublic: true,
  });
  // D47: the induction's first step waits for the second phone — joins advance it
  if ((game.config as { tutorial?: boolean } | null)?.tutorial)
    after(() => tickDirector(game.id, "event:player_joined").catch(console.error));
  return NextResponse.json({ playerId: player.id, rejoined: false, seatCode: seat });
}
