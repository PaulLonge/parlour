import { z } from "zod";

// ---------------------------------------------------------------------------
// The Story schema — the constraint language for generated content (D12/D13).
// A Story is everything the AI writes for one party: characters woven from the
// real intake, spare characters for door-joins & respawns, the twist, the
// challenge pools, and the reveal ceremony. The engine executes; the story means.
// ---------------------------------------------------------------------------

export const EntranceBeat = z.object({
  announcement: z.string().describe("House-channel line when this character arrives"),
  starterSecret: z.string().describe("A secret hooking the newcomer to someone already present"),
  nudgeTask: z.string().describe("Task sent to an existing player to pull the newcomer in"),
});

export const Character = z.object({
  forPlayer: z
    .string()
    .nullable()
    .describe("Real player name this was written for; null for spare/respawn characters"),
  personaName: z.string(),
  archetype: z.string().describe("e.g. 'the estranged sibling', 'the family solicitor'"),
  publicBlurb: z.string().describe("What anyone could learn by chatting to them"),
  costumeHint: z.string(),
  background: z.string().describe("Private: who you are, why you're here tonight"),
  connections: z
    .array(z.object({ personaName: z.string(), what: z.string() }))
    .min(1)
    .describe("Private: your relationships to other characters"),
  secret: z.string().describe("Private: the thing you're hiding. Everyone hides something."),
  mannerism: z.string().describe("One playable quirk — easy to act while drunk"),
  entrance: EntranceBeat,
});

export const Story = z.object({
  meta: z.object({
    title: z.string(),
    genre: z.string(),
    tagline: z.string(),
    setting: z.string().describe("Where/when the fiction takes place"),
    houseVoiceIntro: z.string().describe("The house channel's opening announcement"),
  }),
  skin: z.object({
    palette: z.object({ bg: z.string(), accent: z.string(), text: z.string() }),
    motif: z.string().describe("One-word visual motif, e.g. 'wax-seal', 'neon', 'frost'"),
  }),
  characters: z.array(Character).min(4),
  spares: z
    .array(Character)
    .min(3)
    .describe("Characters for late door-joins and respawns (inspector, stranded stranger...)"),
  twist: z.object({
    summary: z.string().describe("The hidden truth of the night — sealed until reveal"),
    revealText: z.string().describe("How the house voice announces it at the ceremony"),
  }),
  killMethods: z
    .array(
      z.object({
        name: z.string(),
        brief: z.string().describe("The physical act the killer performs, e.g. 'hand them the marked napkin'"),
        discoveryText: z.string().describe("House-channel line when the body is found"),
      })
    )
    .min(2),
  socialChallengePool: z
    .array(z.object({ brief: z.string(), difficulty: z.number().min(1).max(3) }))
    .min(8)
    .describe("Renewable secret challenges; difficulty must fall as the night gets drunker"),
  revealScript: z.array(z.string()).min(3).describe("House-channel reveal ceremony, line by line"),
  awards: z.array(z.object({ title: z.string(), criteria: z.string() })).min(3),
});
export type Story = z.infer<typeof Story>;
export type Character = z.infer<typeof Character>;

// ---------------------------------------------------------------------------
// Structural validation beyond shape: the checks that make a story PLAYABLE.
// (The mechanical validator that replaced the bot harness — see DECISIONS.md)
// ---------------------------------------------------------------------------
export function validateStoryStructure(story: Story, playerNames: string[]) {
  const problems: string[] = [];
  const personas = new Set([
    ...story.characters.map((c) => c.personaName),
    ...story.spares.map((c) => c.personaName),
  ]);

  // every real player has exactly one character
  for (const name of playerNames) {
    const matches = story.characters.filter((c) => c.forPlayer === name);
    if (matches.length === 0) problems.push(`No character written for player "${name}"`);
    if (matches.length > 1) problems.push(`Multiple characters written for player "${name}"`);
  }
  // every connection points at a persona that exists
  for (const c of [...story.characters, ...story.spares]) {
    for (const con of c.connections) {
      if (!personas.has(con.personaName))
        problems.push(`${c.personaName} connects to unknown persona "${con.personaName}"`);
    }
  }
  // every character is reachable by ≥2 threads (own connections + others pointing at them)
  for (const c of story.characters) {
    const inbound = [...story.characters, ...story.spares].filter(
      (o) => o !== c && o.connections.some((con) => con.personaName === c.personaName)
    ).length;
    const threads = c.connections.length + inbound;
    if (threads < 2)
      problems.push(`${c.personaName} is under-connected (${threads} thread[s]) — orphan risk`);
  }
  return problems;
}
