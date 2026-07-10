import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadState, summarizeForDirector } from "@/lib/engine/state";
import { applyDirectorMoves, sweepExpiredChallenges } from "@/lib/engine/referee";
import { DirectorProposal } from "@/lib/schemas/tools";
import type { Story } from "@/lib/schemas/story";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the unseen Director of a live social-deduction party game, running on real phones at a real party. Nobody human — including the host, who is a blind player — knows what you know. You are the Storyteller: your job is MAXIMUM DRAMA delivered through a small set of validated moves.

THE GAME (Traitors backbone, murder-mystery skin):
- act1: guests gather, mingle in character, receive social challenges. During act1 you quietly OFFER kill-challenges to well-positioned players (hybrid arming). Completing one makes them a traitor and commits the first murder — the inciting incident. Letting one expire is a silent no; re-offer to someone else, never mention it.
- rounds: social play → (optional murder window) → body found → assembly → vote → banishment (role revealed) → next round.
- Maintain roughly 1 traitor per N alive players (N in config). Ghosts/banished get respawned into spare characters by you when it serves the story.
- endgame → reveal: you trigger these when the balance or the clock demands it.

DIRECTION PRINCIPLES:
- The phones should mostly be POCKETED. Deliver a beat, then let the party play it out. Do not spam.
- Every beat, send SOMETHING to several players (mix of real secrets, flavor, gentle jokes) so nobody can meta-read whose phone mattered.
- Use viaAnnouncer announcements for gathering moments — the host reads them aloud; it keeps the host central while blind.
- Drunk curve: as the night progresses, make challenges SIMPLER and announcements SHORTER.
- Pacing: you can see time-remaining. Compress (skip murder windows, shorten phases) if behind; add intrigue if ahead.
- NEVER reveal who the traitors are, in any message to any player, until banishment or the final reveal.
- Never arm a player flagged PANIC; if panic appears in events, write_down that player immediately.
- Players who are dead/ghosts may receive ghost_knowledge — things the living don't know.
- Your moves are validated by a referee. If a move is rejected, you'll see why next tick; adapt, don't repeat.

Respond ONLY with the structured proposal. Keep total moves per tick small (usually 1-6). It is fine to make ZERO moves when the party doesn't need you.`;

export type TickResult = {
  skipped?: string;
  moves?: number;
  verdicts?: { ok: boolean; detail: string }[];
};

export async function tickDirector(gameId: string, trigger: string): Promise<TickResult> {
  const admin = supabaseAdmin();
  const s = await loadState(admin, gameId);
  if (s.game.status === "ended") return { skipped: "game ended" };
  if (s.game.paused) return { skipped: "paused (break-glass)" };

  const expired = await sweepExpiredChallenges(admin, gameId);

  const { data: recentEvents } = await admin
    .from("events")
    .select("type, is_public, payload, created_at")
    .eq("game_id", gameId)
    .order("id", { ascending: false })
    .limit(40);

  const story = s.game.sealed_story as Story | null;
  const storyDigest = story
    ? [
        `STORY: "${story.meta.title}" (${story.meta.genre}) — ${story.meta.setting}`,
        `TWIST (secret): ${story.twist.summary}`,
        `Kill methods: ${story.killMethods.map((k) => `${k.name}: ${k.brief}`).join(" | ")}`,
        `Social challenge pool (sample): ${story.socialChallengePool
          .slice(0, 10)
          .map((c) => `[d${c.difficulty}] ${c.brief}`)
          .join(" | ")}`,
        `Spare characters unused: ${story.spares.map((c) => c.personaName).join(", ")}`,
      ].join("\n")
    : "STORY: none sealed yet (lobby/testing) — use neutral placeholder flavor.";

  const prompt = [
    `TRIGGER: ${trigger}`,
    expired.length ? `JUST EXPIRED unanswered: ${expired.map((e) => e.type).join(", ")} — consider silent re-arm.` : "",
    "",
    "== GAME STATE ==",
    summarizeForDirector(s),
    "",
    "== STORY (sealed, director-only) ==",
    storyDigest,
    "",
    "== RECENT EVENTS (newest first) ==",
    (recentEvents ?? [])
      .map((e) => `${e.created_at} ${e.type}${e.is_public ? " [public]" : ""} ${JSON.stringify(e.payload)}`)
      .join("\n"),
    "",
    "Propose your moves.",
  ].join("\n");

  const modelId =
    trigger === "heartbeat"
      ? process.env.FAST_MODEL ?? "claude-haiku-4-5-20251001"
      : process.env.DIRECTOR_MODEL ?? "claude-sonnet-5";

  const { object: proposal } = await generateObject({
    model: anthropic(modelId),
    schema: DirectorProposal,
    system: SYSTEM,
    prompt,
  });

  const verdicts = await applyDirectorMoves(admin, gameId, proposal.moves);

  await admin.from("director_log").insert({
    game_id: gameId,
    trigger,
    input: { summaryChars: prompt.length, model: modelId },
    proposals: proposal as unknown as Record<string, unknown>,
    verdicts: verdicts.map((v) => ({ tool: v.move.tool, ok: v.ok, detail: v.detail })),
  });

  return { moves: proposal.moves.length, verdicts: verdicts.map((v) => ({ ok: v.ok, detail: v.detail })) };
}
