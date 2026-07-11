import { z } from "zod";
import { Character } from "./story";

// ---------------------------------------------------------------------------
// RogueStory — the constraint language for ROGUE mode ("The Alignment Problem").
// THE FACTORY FORMAT (D20): the hand-refined reference story and November's
// sealed party story are both instances of this schema, produced by the same
// generator — feedback encoded here or in the generator transfers to both.
// Mode rules: docs/modes.md. Safety rule (D19): deceive about the genre, never
// reality — all currency fictional, hijack game-legible within ~1 minute.
// ---------------------------------------------------------------------------

export const AiPersona = z.object({
  name: z.string(),
  voice: z.string().describe("voice guide: register, tics, sentence shapes"),
  motive: z.string().describe("what it actually wants, revealed over the night"),
});

export const Mission = z.object({
  brief: z.string().describe("what the player is asked to do — 10s to 5min, drunk-doable"),
  payout: z.number().positive(),
  purpose: z.string().describe("what this buys the issuing AI, narratively"),
  difficulty: z.number().min(1).max(3),
});

export const RogueStory = z.object({
  meta: z.object({
    title: z.string(),
    coverStoryTitle: z.string().describe("the murder mystery that never existed"),
    setting: z.string(),
    tagline: z.string(),
    costumeBrief: z.string(),
  }),
  currency: z.object({
    name: z.string(),
    symbol: z.string(),
    drainedAmountClaim: z.string().describe("the theatrical figure the rogue claims to have taken"),
  }),
  ais: z.object({
    rogue: AiPersona.extend({
      openingAnnouncement: z.string().describe("its first words after the hijack"),
    }),
    good: AiPersona.extend({
      introAnnouncement: z.string().describe("how it first reaches the room"),
    }),
  }),
  hijack: z.object({
    sequence: z
      .array(z.string())
      .min(4)
      .describe("TV/phone beats in order; must become game-legible within ~1 minute (D19)"),
    drainedScreenText: z.string(),
  }),
  frontman: z.object({
    selectionNotes: z.string().describe("how the director picks the first recruit to elevate"),
    privileges: z.string(),
    coverAdvice: z.string().describe("what the front man is told about staying hidden"),
    rotationNotes: z
      .string()
      .describe("D20: when/how the rogue re-appoints after a burning or at will"),
  }),
  characters: z.array(Character).min(4),
  spares: z.array(Character).min(3),
  missions: z.object({
    rogue: z.array(Mission).min(10).describe("bribes: recruitment, misdirection, framing"),
    good: z.array(Mission).min(10).describe("compute-paid: evidence, counter-intel, protection"),
  }),
  parleys: z
    .array(z.object({ trigger: z.string(), script: z.string() }))
    .min(3)
    .describe("room-gathering beats; accusations (D20) happen here"),
  accusation: z.object({
    burnScript: z.string().describe("house-channel text when an accusation lands — the BURNING"),
    wrongScript: z.string().describe("text when the room accuses an innocent — rogue gains tempo"),
  }),
  twist: z.object({ summary: z.string(), revealText: z.string() }),
  unmaskingScript: z.array(z.string()).min(3),
  revealCeremony: z
    .array(z.string())
    .min(4)
    .describe("must land the base con (accounts fake, mystery never existed) AND the twist"),
  awards: z.array(z.object({ title: z.string(), criteria: z.string() })).min(4),
});
export type RogueStory = z.infer<typeof RogueStory>;

// ---------------------------------------------------------------------------
// Structural validation — the generation gate for ROGUE (mirrors story.ts).
// ---------------------------------------------------------------------------
export function validateRogueStructure(story: RogueStory, playerNames: string[]) {
  const problems: string[] = [];
  const all = [...story.characters, ...story.spares];
  const personas = new Set(all.map((c) => c.personaName));

  for (const name of playerNames) {
    const matches = story.characters.filter((c) => c.forPlayer === name);
    if (matches.length === 0) problems.push(`No character written for player "${name}"`);
    if (matches.length > 1) problems.push(`Multiple characters written for player "${name}"`);
  }
  for (const c of all)
    for (const con of c.connections)
      if (!personas.has(con.personaName))
        problems.push(`${c.personaName} connects to unknown persona "${con.personaName}"`);
  for (const c of story.characters) {
    const inbound = all.filter(
      (o) => o !== c && o.connections.some((x) => x.personaName === c.personaName)
    ).length;
    if (c.connections.length + inbound < 2)
      problems.push(`${c.personaName} is under-connected — orphan risk`);
  }
  // economy sanity: both sides must be offerable all night at every difficulty
  for (const side of ["rogue", "good"] as const)
    for (const d of [1, 2, 3])
      if (!story.missions[side].some((m) => m.difficulty === d))
        problems.push(`missions.${side} has no difficulty-${d} entries (drunk curve breaks)`);
  // named-target missions must reference real personas (soft check on quoted names)
  for (const side of ["rogue", "good"] as const)
    for (const m of story.missions[side]) {
      const quoted = m.brief.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) ?? [];
      for (const q of quoted)
        if (!personas.has(q) && all.some((c) => c.personaName.split(" ")[0] === q.split(" ")[0]))
          problems.push(`mission "${m.brief.slice(0, 40)}…" may reference unknown persona "${q}"`);
    }
  return problems;
}
