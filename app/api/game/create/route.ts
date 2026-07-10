import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GameConfig } from "@/lib/schemas/config";
import { emit } from "@/lib/engine/state";

const Body = z.object({
  title: z.string().min(1).max(80).default("The Gathering"),
  hostName: z.string().min(1).max(40),
  config: GameConfig.partial().default({}),
});

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no lookalikes

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
  const { title, hostName, config } = parsed.data;

  const admin = supabaseAdmin();
  const code = Array.from(
    { length: 4 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");

  const { data: game, error: gErr } = await admin
    .from("games")
    .insert({ code, title, config: GameConfig.parse(config) })
    .select()
    .single();
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  const { error: pErr } = await admin.from("players").insert({
    game_id: game.id,
    auth_uid: user!.id,
    name: hostName,
    is_host: true,
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  await emit(admin, game.id, "game_created", { payload: { title }, isPublic: true });
  return NextResponse.json({ code: game.code, gameId: game.id });
}
