import { NextResponse, after } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GameConfig } from "@/lib/schemas/config";
import { emit } from "@/lib/engine/state";
import { TUTORIAL_STORY, TUTORIAL_STORY_PUBLIC } from "@/content/tutorial-script";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({
  title: z.string().min(1).max(80).default("The Gathering"),
  hostName: z.string().min(1).max(40),
  mode: z.enum(["murder", "rogue"]).default("murder"),
  password: z.string().max(30).optional(), // D45: the night selector word
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
  const { title, hostName, mode, password, config } = parsed.data;

  const admin = supabaseAdmin();
  const code = Array.from(
    { length: 4 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");

  const fullConfig = GameConfig.parse(config);
  // D47: induction games are rogue-mode and arrive pre-sealed with the tiny
  // training story (gives the hijack an AI name, the Ask tab a voice, the UI
  // a currency) — no generation, nothing to spoil, safe to re-run forever
  const tutorial = fullConfig.tutorial === true;
  const effectiveMode = tutorial ? "rogue" : mode;
  const { data: game, error: gErr } = await admin
    .from("games")
    .insert({
      code,
      title: tutorial && title === "The Gathering" ? "THE INDUCTION" : title,
      mode: effectiveMode,
      config: fullConfig,
      join_password: password?.trim().toLowerCase() || null,
      ...(tutorial ? { sealed_story: TUTORIAL_STORY, story_public: TUTORIAL_STORY_PUBLIC } : {}),
    })
    .select()
    .single();
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  const { error: pErr } = await admin.from("players").insert({
    game_id: game.id,
    auth_uid: user!.id,
    name: hostName,
    is_host: true,
    balance: effectiveMode === "rogue" ? fullConfig.startingBalance : 0,
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  await emit(admin, game.id, "game_created", { payload: { title }, isPublic: true });
  // D47: kick the induction's first step so the host's welcome letter is
  // waiting when their phone loads
  if (tutorial) after(() => tickDirector(game.id, "tutorial:create").catch(console.error));
  return NextResponse.json({ code: game.code, gameId: game.id });
}
