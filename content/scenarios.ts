import { PUB_PRESET } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// D69: SCENARIOS — the agnostic game registry. A "game" is DATA, not code: a
// mode + a sealed content pack + a config preset + a skin. The rogue engine is
// theme-agnostic (the pub and the vault prove it), so adding a game =
// adding an entry here + a story JSON. No engine changes. `/new` renders this
// list; game/create resolves the mode + preset; story/generate seals the pack.
// ---------------------------------------------------------------------------

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  emoji: string;
  mode: "murder" | "rogue";
  // rogue scenarios seal a content pack by key (see lib/director/generate.ts PACKS)
  storyKey?: "reference" | "pub" | "vault";
  preset?: Record<string, unknown>; // a GameConfig input partial (validated at create)
  // murder scenarios GENERATE a bespoke story instead of sealing a pack
  generates?: boolean;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "long-con",
    label: "The Long Con",
    blurb: "The pirate murder mystery that never was — a rogue AI hijacks the night and hires the room. The full house party.",
    emoji: "🏴",
    mode: "rogue",
    storyKey: "reference",
  },
  {
    id: "field-trial",
    label: "The Field Trial",
    blurb: "The pub night: the machine in the open. Stipends, wagers, side bets, phone duels, dares. Lighter, faster, nothing to print.",
    emoji: "🍺",
    mode: "rogue",
    storyKey: "pub",
    preset: PUB_PRESET as Record<string, unknown>,
  },
  {
    id: "the-vault",
    label: "The Vault",
    blurb: "A casino heist reskin — MIDAS the house vs LEDGER the auditor. Same engine, black tie instead of eyepatches. Proof the machine is theme-agnostic.",
    emoji: "🎰",
    mode: "rogue",
    storyKey: "vault",
  },
  {
    id: "classic-murder",
    label: "Classic Murder",
    blurb: "One killer among the guests, an AI-written whodunnit, a final accusation. The original engine.",
    emoji: "🗡",
    mode: "murder",
    generates: true,
  },
];

export const scenarioById = (id: string | undefined): Scenario | undefined =>
  SCENARIOS.find((s) => s.id === id);

export const DEFAULT_SCENARIO = "long-con";
