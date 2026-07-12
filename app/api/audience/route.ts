import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { credit } from "@/lib/engine/economy";
import { GameConfig } from "@/lib/schemas/config";

export const maxDuration = 60;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Body = z.object({
  code: z.string(),
  ai: z.enum(["rogue", "good"]),
  question: z.string().min(1).max(400),
});

// D33: an audience with the machine — the economy sink. One question, in
// voice, paid in currency. Context-scoped the paranoid way (I9): the model
// answering holds ONLY this player's own data + public events. It cannot leak
// the front man, other players' allegiances, or other purses — it doesn't
// have them.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const admin = supabaseAdmin();
  const game = caller.game;
  if (game.mode !== "rogue" || !game.hijacked_at)
    return NextResponse.json({ error: "the machines are not receiving" }, { status: 422 });
  if (game.paused) return NextResponse.json({ error: "game paused" }, { status: 422 });

  const cfg = GameConfig.parse(game.config ?? {});
  const me = caller.player;

  // cap + price
  const { count: held } = await admin
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("player_id", me.id)
    .eq("kind", "audience");
  if ((held ?? 0) >= cfg.audienceCap)
    return NextResponse.json({ error: "the machine is done with you tonight" }, { status: 422 });
  if (me.balance < cfg.audienceCost)
    return NextResponse.json(
      { error: `an audience costs ${cfg.audienceCost} — your purse disagrees` },
      { status: 422 }
    );

  // scoped context: OWN transactions + recent PUBLIC events only
  const [{ data: myTxns }, { data: pubEvents }] = await Promise.all([
    admin
      .from("transactions")
      .select("amount, memo, claimed_source")
      .eq("player_id", me.id)
      .order("id", { ascending: false })
      .limit(10),
    admin
      .from("events")
      .select("type, payload")
      .eq("game_id", game.id)
      .eq("is_public", true)
      .order("id", { ascending: false })
      .limit(15),
  ]);

  const story = game.sealed_story as Record<string, any> | null;
  const persona = parsed.data.ai === "rogue" ? story?.ais?.rogue : story?.ais?.good;
  const personaName = persona?.name ?? (parsed.data.ai === "rogue" ? "the machine" : "the other one");

  // pay FIRST — the conditional debit throws if the purse can't cover it, and
  // paying before the LLM call means a failed call refunds rather than a
  // successful answer going unpaid
  try {
    await credit(admin, game.id, me.id, -cfg.audienceCost, "audience — held in advance", parsed.data.ai);
  } catch {
    return NextResponse.json({ error: "your purse couldn't cover it" }, { status: 422 });
  }

  let answer: string;
  try {
    const r = await generateText({
      model: anthropic(process.env.FAST_MODEL ?? "claude-haiku-4-5-20251001"),
      system: `You are ${personaName} in a live party game, granting a paid one-question audience to the guest "${me.name}".
VOICE: ${persona?.voice ?? "in character for your side"}
HARD RULES (architectural, not optional): You only know what is in this prompt. You must NEVER state or confirm who the front man is, who any OTHER player serves, or anyone else's purse — deflect in voice instead (you are allowed to lie, tease, and mislead; you are not allowed to reveal). You may reference the asking guest's OWN dealings freely. 2-5 sentences. End before you get boring.`,
      prompt: [
        `The guest paid ${cfg.audienceCost} for one question.`,
        `Their own recent dealings: ${JSON.stringify(myTxns ?? [])}`,
        `Recent public record: ${(pubEvents ?? []).map((e) => e.type).join(", ")}`,
        `Their question: "${parsed.data.question}"`,
      ].join("\n"),
    });
    answer = r.text;
  } catch {
    await credit(admin, game.id, me.id, cfg.audienceCost, "audience refunded — the machine was elsewhere", "system").catch(() => {});
    return NextResponse.json({ error: "the machine was elsewhere — refunded, try again" }, { status: 503 });
  }

  await admin.from("messages").insert({
    game_id: game.id,
    player_id: me.id,
    round_no: game.round_no,
    kind: "audience",
    title: `You asked: "${parsed.data.question}"`,
    body: answer,
    claimed_sender: personaName,
  });
  await emit(admin, game.id, "audience_held", {
    payload: { player: me.name, ai: parsed.data.ai },
  });
  // D47: the induction's audience step completes on this event — nudge the runner
  if ((game.config as { tutorial?: boolean } | null)?.tutorial) {
    const { after } = await import("next/server");
    const { tickDirector } = await import("@/lib/director/director");
    after(() => tickDirector(game.id, "event:audience_held").catch(console.error));
  }
  return NextResponse.json({ ok: true, answer });
}
