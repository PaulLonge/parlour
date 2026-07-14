import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Story, validateStoryStructure, type Character } from "@/lib/schemas/story";
import { RogueStory } from "@/lib/schemas/rogue";
import { emit } from "@/lib/engine/state";
import goldenJson from "@/content/golden-story.json";
import rogueReferenceJson from "@/content/rogue-reference-story.json";
import pubStoryJson from "@/content/pub-story.json";
import vaultStoryJson from "@/content/vault-story.json";

// D69: rogue scenarios seal one of these packs by key (content/scenarios.ts).
// Add a game = add a JSON here + a registry entry. No engine change.
const PACKS: Record<string, unknown> = {
  reference: rogueReferenceJson,
  pub: pubStoryJson,
  vault: vaultStoryJson,
};

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOLDEN = Story.parse(goldenJson);

const GEN_SYSTEM = `You write the complete story for a live social-deduction party game (Traitors backbone: rounds of social play, secret murders, round-table banishment votes). You are writing for REAL people at a REAL party, using their real names, occupations and relationships as INSPIRATION for fictional characters.

HARD RULES:
- Fictional sins only: invent affairs, debts, forgeries, feuds for the CHARACTERS. Never echo a real person's actual relationships, health, breakups, or anything a reasonable friend might find pointed. Real details (job, hobby) may be playfully transformed (a climber becomes 'the alpinist'), never mocked.
- Every character gets a secret worth hiding and at least two connections into the web.
- Kill methods must be physical acts doable at a house party in 10 seconds with no props beyond paper/glasses.
- Social challenges must be achievable while drunk; difficulty 1 = trivial, 3 = requires cunning.
- Entrance beats must work whenever the guest arrives — first or last.
- The twist should recontextualise the whole night when revealed. Aim for delight, not confusion. Vary the DEVICE between stories — a repertoire to draw from (never announce which you used until the reveal): the victim faked it; the house/announcer voice is a character in the story; the prize/inheritance never existed; two guests are secretly the same person's agents; the evening is a rehearsal/re-enactment of an older crime; a TIME LOOP — the story claims the evening has happened before and the dead "remember" (pairs beautifully with ghost knowledge and respawns); the detective figure is the guilty one; the real target of the crime is someone nobody suspected was important. Invent new devices freely in this spirit.
- Spare characters (for late arrivals and respawns) must be self-inserting: strangers, officials, relatives nobody could disprove.
- Tone: wit over gore. This is a birthday party.`;

export type GenerateResult = {
  ok: boolean;
  usedFallback: boolean;
  title: string;
  problems: string[];
};

// Assign a story's characters to real players (by forPlayer name, falling back
// to join order for unmatched), write rows, and seal the story on the game.
async function seal(
  admin: SupabaseClient,
  gameId: string,
  story: Story,
  players: { id: string; name: string }[]
) {
  const unassigned = [...story.characters];
  for (const p of players) {
    let idx = unassigned.findIndex(
      (c) => c.forPlayer?.toLowerCase() === p.name.toLowerCase()
    );
    if (idx === -1) idx = 0; // fallback: deal in order
    const character: Character | undefined = unassigned.splice(idx, 1)[0];
    if (character)
      await admin
        .from("players")
        .update({ character: { ...character, forPlayer: p.name } })
        .eq("id", p.id);
  }
  await admin
    .from("games")
    .update({
      sealed_story: story,
      story_public: { meta: story.meta, skin: story.skin },
    })
    .eq("id", gameId);
  await emit(admin, gameId, "story_sealed", {
    payload: { title: story.meta.title },
    isPublic: true,
  });
}

// ROGUE (gap #1): until the rogue generator exists, rogue games seal the
// hand-refined reference story (NO QUARTER). The PUBLIC branding pre-hijack is
// the COVER story's title — the app must look like the naff murder mystery it
// pretends to be. Act-1 personas are dealt in order (they die at the hijack
// anyway, D29).
export async function sealRogueReference(
  admin: SupabaseClient,
  gameId: string,
  storyKey: string = "reference"
): Promise<GenerateResult> {
  const story = RogueStory.parse(PACKS[storyKey] ?? rogueReferenceJson);
  const { data: players } = await admin
    .from("players")
    .select("id, name")
    .eq("game_id", gameId)
    .order("created_at");
  // THE FIELD TRIAL is persona-less (D45): empty pool → nobody gets a character
  const pool = [...story.characters, ...story.spares];
  if (pool.length)
    for (const [i, p] of (players ?? []).entries()) {
      const c = pool[i % pool.length];
      await admin
        .from("players")
        .update({ character: { ...c, forPlayer: p.name } })
        .eq("id", p.id);
    }
  await admin
    .from("games")
    .update({
      sealed_story: story,
      story_public: {
        meta: {
          title: story.meta.coverStoryTitle, // the lie IS the branding (D19)
          genre: "a murder mystery in three acts",
          tagline: story.meta.tagline, // D69: from the pack, so the skin is agnostic
          setting: story.meta.setting,
        },
      },
    })
    .eq("id", gameId);
  await emit(admin, gameId, "story_sealed", {
    payload: { title: story.meta.coverStoryTitle },
    isPublic: true,
  });
  return { ok: true, usedFallback: false, title: story.meta.coverStoryTitle, problems: [] };
}

export async function generateAndSealStory(
  admin: SupabaseClient,
  gameId: string
): Promise<GenerateResult> {
  const { data: players } = await admin
    .from("players")
    .select("id, name, intake, is_host")
    .eq("game_id", gameId);
  if (!players?.length) return { ok: false, usedFallback: false, title: "", problems: ["no players"] };

  const names = players.map((p) => p.name);
  const intakeDigest = players
    .map((p) => {
      const i = (p.intake ?? {}) as Record<string, unknown>;
      const rel = Array.isArray(i.relations)
        ? (i.relations as { name: string; how: string }[])
            .map((r) => `${r.name} (${r.how})`)
            .join(", ")
        : "";
      return `- ${p.name}${p.is_host ? " [THE HOST — the party is in their honour]" : ""}: age ${i.age ?? "?"}, ${i.occupation ?? "occupation unknown"}, knows host via: ${i.relationToHost ?? "?"}${rel ? `; also knows: ${rel}` : ""}`;
    })
    .join("\n");

  const exemplar = {
    meta: GOLDEN.meta,
    exampleCharacter: GOLDEN.characters[0],
    exampleKillMethod: GOLDEN.killMethods[0],
  };

  const prompt = [
    `Write a complete, ORIGINAL story (do NOT reuse the exemplar's plot, setting or names) for these ${players.length} real guests:`,
    intakeDigest,
    "",
    `Write exactly one character per guest (forPlayer = their real name, spelled exactly as above), plus at least ${Math.max(3, Math.ceil(players.length / 3))} spare characters for late arrivals and respawns.`,
    "Pick a fresh genre/setting — any era, any flavour (seance, ski lodge, space liner, regatta, gallery opening...). Surprise everyone.",
    "",
    "Exemplar of tone and shape (from the reference story):",
    JSON.stringify(exemplar),
  ].join("\n");

  const model = anthropic(process.env.STORY_MODEL ?? "claude-sonnet-5");

  let story: Story | null = null;
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2 && !story; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: Story,
        system: GEN_SYSTEM,
        prompt:
          attempt === 0
            ? prompt
            : `${prompt}\n\nYOUR PREVIOUS ATTEMPT FAILED THESE STRUCTURAL CHECKS — fix them:\n${problems.join("\n")}`,
      });
      problems = validateStoryStructure(object, names);
      if (problems.length === 0) story = object;
    } catch (e) {
      problems = [e instanceof Error ? e.message : String(e)];
    }
  }

  if (story) {
    await seal(admin, gameId, story, players);
    return { ok: true, usedFallback: false, title: story.meta.title, problems: [] };
  }

  // I5a fallback: the golden story. The party never depends on generation succeeding.
  await seal(admin, gameId, GOLDEN, players);
  await emit(admin, gameId, "story_fallback_used", { payload: { problems } });
  return { ok: true, usedFallback: true, title: GOLDEN.meta.title, problems };
}
