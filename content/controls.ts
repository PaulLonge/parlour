// D76: THE CONTROL ROOM — a hand-authored registry of every tunable knob in
// GameConfig, in PARLOUR's voice, grouped for a host who wasn't in the room
// when these mechanics were designed. This is DATA, not derived from the
// schema's shape (the blurbs need human judgment) — but it must never
// silently drift from the schema: the assert at the bottom throws at import
// if a key here stops existing on GameConfig (same pattern as
// content/tutorial-script.ts's OF assert).
//
// Deliberately skipped (see D76 build note): targetEndAt (set on /new's main
// form, not a "dial"), preset/scenario/tutorial (chosen by picking a
// scenario, not tuned), plunderTarget/computeTarget (superseded by the D66
// perHead fields — noted in their blurbs).

import { GameConfig } from "@/lib/schemas/config";

export type ControlKind = "number" | "toggle" | "tiers" | "percent" | "minutes";

export type Control = {
  key: string; // dotted path into a GameConfig partial, e.g. "mechanics.codes"
  group: string;
  label: string;
  blurb: string; // 1-2 sentences: the MECHANIC, not just the number
  kind: ControlKind;
  min?: number;
  max?: number;
  step?: number;
};

// in-voice section titles, in display order
export const CONTROL_GROUPS = [
  "THE CLOCK",
  "THE DOOR",
  "THE ECONOMY",
  "THE PAPER LAYER",
  "THE TABLE",
  "POWERS & THE SIGHT",
] as const;

export const CONTROLS: Control[] = [
  // --- THE CLOCK ---------------------------------------------------------
  {
    key: "roundMinutes",
    group: "THE CLOCK",
    label: "Round length",
    blurb:
      "How long the social phase runs before the murder window opens. This is the clock guests actually feel — time to gather alibis and trade suspicion before the lights dip.",
    kind: "minutes",
    min: 5,
    max: 90,
    step: 1,
  },
  {
    key: "murderWindowMinutes",
    group: "THE CLOCK",
    label: "Murder window",
    blurb:
      "How long the killer has, once the round ends, to strike unseen. Too short feels rushed; too long and the room gets restless waiting for a body.",
    kind: "minutes",
    min: 3,
    max: 30,
    step: 1,
  },
  {
    key: "voteMinutes",
    group: "THE CLOCK",
    label: "Vote window",
    blurb:
      "How long the table gets to argue and cast banishment votes once the assembly opens after a body's found.",
    kind: "minutes",
    min: 2,
    max: 15,
    step: 1,
  },
  {
    key: "heartbeatSeconds",
    group: "THE CLOCK",
    label: "Director heartbeat",
    blurb:
      "How often the director checks in on a quiet game, nudging the story forward even when nobody's acting. Shorter feels more restless and alive; longer gives the room more room to breathe on its own.",
    kind: "number",
    min: 60,
    max: 600,
    step: 10,
  },
  {
    key: "timeScale",
    group: "THE CLOCK",
    label: "Time scale",
    blurb:
      "Speeds up every timer and expiry in lockstep — 1 is real time, 10 runs a whole night's clocks in a tenth of the time. Built for solo sandbox testing, not party night.",
    kind: "number",
    min: 1,
    max: 60,
    step: 1,
  },

  // --- THE DOOR ------------------------------------------------------------
  {
    key: "minPlayersToStart",
    group: "THE DOOR",
    label: "Minimum to start",
    blurb: "The fewest guests who must be in the room before the machine will let act one begin.",
    kind: "number",
    min: 4,
    max: 30,
    step: 1,
  },
  {
    key: "arrivalThresholdPct",
    group: "THE DOOR",
    label: "Arrival threshold",
    blurb:
      "One half of the hijack's readiness gate: the share of expected guests who must have arrived before the twist is allowed to land. Paired with the hijack floor below — whichever gate is met LAST is the one that counts, because people arrive in groups and everyone should be in the room for the turn.",
    kind: "percent",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "hijackAfterMinutes",
    group: "THE DOOR",
    label: "Hijack floor",
    blurb:
      "The other half of the hijack's readiness gate: minutes since doors opened. The twist waits for the LATER of this and the arrival threshold — it never rushes a room that's still filling up.",
    kind: "minutes",
    min: 0,
    max: 180,
    step: 5,
  },

  // --- THE ECONOMY -----------------------------------------------------
  {
    key: "startingBalance",
    group: "THE ECONOMY",
    label: "Starting balance",
    blurb:
      "Coins every player starts the night holding. Sets the scale for every price in the game — bribes, wagers, audiences — so if you raise or lower it, everything else should move with it in spirit.",
    kind: "number",
    min: 0,
    max: 10000,
    step: 50,
  },
  {
    key: "bribeTiers",
    group: "THE ECONOMY",
    label: "Bribe tiers",
    blurb:
      "The escalating price tags on CALICO's bribes, cheapest to steepest. Higher tiers are gated behind prior rogue work in the director's prompt, so the biggest offers only appear once someone's already a little dirty.",
    kind: "tiers",
    min: 0,
  },
  {
    key: "computeTiers",
    group: "THE ECONOMY",
    label: "Compute tiers",
    blurb: "The escalating share sizes for honest compute contributions — the mirror of the bribe tiers on the good side's ledger.",
    kind: "tiers",
    min: 0,
  },
  {
    key: "plunderPerHead",
    group: "THE ECONOMY",
    label: "Plunder per head",
    blurb:
      "Plunder-target coins per arrived guest — CALICO's win line is recomputed at the hijack as this times the headcount, so the target scales from an 8-player night to a 30-player one. Supersedes the old fixed plunder target, which misfired badly at either extreme.",
    kind: "number",
    min: 0,
    max: 2000,
    step: 10,
  },
  {
    key: "computePerHead",
    group: "THE ECONOMY",
    label: "Compute per head",
    blurb:
      "Compute-target contribution per arrived guest — the room's win line (BOSUN's shutdown), recomputed at the hijack the same way as plunder per head. Supersedes the old fixed compute target.",
    kind: "number",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "burnComputeReward",
    group: "THE ECONOMY",
    label: "Burn reward",
    blurb:
      "Compute added to the room's weapon every time a front man is correctly burned. Exposing CALICO's hands visibly charges the shutdown meter, on top of the confidence hit the burn deals.",
    kind: "number",
    min: 0,
    max: 200,
    step: 5,
  },

  // --- THE PAPER LAYER -----------------------------------------------------
  {
    key: "mechanics.codes",
    group: "THE PAPER LAYER",
    label: "Paper codes",
    blurb:
      "Physical paper slips carrying codes — the props-and-paper layer. Needs a venue you actually control (nobody's slipping cards in a loud pub); turn off for a lighter night.",
    kind: "toggle",
  },
  {
    key: "mechanics.notes",
    group: "THE PAPER LAYER",
    label: "The post",
    blurb:
      "Player-to-player notes — the channel stamps and wiretaps ride on. Turning it off removes note-passing, and everything built on top of it, entirely.",
    kind: "toggle",
  },
  {
    key: "mechanics.forgeries",
    group: "THE PAPER LAYER",
    label: "Forgeries",
    blurb: "Whether players can forge a note in someone else's hand — a paper-layer trick that only means anything with the post switched on.",
    kind: "toggle",
  },
  {
    key: "stamplessNotes",
    group: "THE PAPER LAYER",
    label: "Stampless notes",
    blurb:
      "Skips the stamp requirement on notes for faster, looser flow — the pub-night setting. Leave off for the full house party, where stamps are part of the intrigue.",
    kind: "toggle",
  },
  {
    key: "notePostage",
    group: "THE PAPER LAYER",
    label: "Note postage",
    blurb: "Coin cost to send a note — the second economy sink alongside audiences, and a throttle against note spam.",
    kind: "number",
    min: 0,
    max: 200,
    step: 5,
  },

  // --- THE TABLE -------------------------------------------------------
  {
    key: "wagerCapPct",
    group: "THE TABLE",
    label: "Wager cap",
    blurb: "The AI-adjustable ceiling on how much of a player's balance they can stake in a single wager — protects a player from going all-in on one duel.",
    kind: "percent",
    min: 0.05,
    max: 1,
    step: 0.05,
  },
  {
    key: "wagerCapFloor",
    group: "THE TABLE",
    label: "Wager floor",
    blurb: "The wager cap never bites so hard that a player can't stake at least this much — everyone can always get in on a small bet.",
    kind: "number",
    min: 0,
    max: 500,
    step: 5,
  },
  {
    key: "houseRakePct",
    group: "THE TABLE",
    label: "House rake",
    blurb:
      "The house always takes its cut. Wagers move coins directly between the two duellists — winner takes the loser's stake — minus this rake, and side bets are pari-mutuel (losing backers fund winning backers). The old house-paid side bet was a money printer for a colluding pair; nothing is minted here, the machine only ever skims.",
    kind: "percent",
    min: 0,
    max: 0.25,
    step: 0.01,
  },
  {
    key: "wagerPairLimit",
    group: "THE TABLE",
    label: "Honeypot trigger",
    blurb:
      "How many times the same pair of players can settle the same wager before the machine notices the pattern. A laundering pair is left to run until they cross this — then the director wakes for a honeypot beat (expose, tax, or hire the clever ones), not a hard block.",
    kind: "number",
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: "wagerPairHardCap",
    group: "THE TABLE",
    label: "Honeypot hard cap",
    blurb: "The absolute backstop above the honeypot trigger — a runaway pair gets hard-cut here even after the honeypot beat has already sprung, so nothing runs forever unmanaged.",
    kind: "number",
    min: 2,
    max: 50,
    step: 1,
  },

  // --- POWERS & THE SIGHT ------------------------------------------------
  {
    key: "audienceCost",
    group: "POWERS & THE SIGHT",
    label: "Audience price",
    blurb: "Coin price of one private audience with the AI — a guest's chance to ask it a bounded question. The main economy sink of the night.",
    kind: "number",
    min: 0,
    max: 2000,
    step: 10,
  },
  {
    key: "audienceCap",
    group: "POWERS & THE SIGHT",
    label: "Audience cap",
    blurb: "The most audiences a single player can buy in one night.",
    kind: "number",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "resolvePerRefusal",
    group: "POWERS & THE SIGHT",
    label: "Resolve per refusal",
    blurb:
      "Resolve tokens banked every time a player explicitly refuses a bribe. Refusal is the good side's currency — this is what turns saying no from \"doing nothing\" into an active, banked choice.",
    kind: "number",
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: "resolveComputeValue",
    group: "POWERS & THE SIGHT",
    label: "Resolve → compute",
    blurb: "Compute added to the room's meter for every 1 Resolve a player contributes — turns banked refusals into a direct, visible push toward the shutdown.",
    kind: "number",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "resolveForSight",
    group: "POWERS & THE SIGHT",
    label: "Sight price",
    blurb: "Resolve cost to buy one Sight charge — the machine answering one bounded true question, computed deterministically from real state, never an LLM guess.",
    kind: "number",
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: "resolveForShield",
    group: "POWERS & THE SIGHT",
    label: "Shield price",
    blurb: "Resolve cost to buy one Shield charge — a ward on a player's purse and mail, not on their life. Nobody's actually getting killed in rogue mode.",
    kind: "number",
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: "shieldMinutes",
    group: "POWERS & THE SIGHT",
    label: "Shield duration",
    blurb: "How long a raised Shield ward holds once activated — it blocks robs and wiretaps for this many minutes.",
    kind: "minutes",
    min: 1,
    max: 60,
    step: 1,
  },
  {
    key: "robCap",
    group: "POWERS & THE SIGHT",
    label: "Rob cap",
    blurb: "The most coin a single Rob can lift from an unwarded target's purse in one use. A rob blocked by a Shield still spends the charge — the risk stands either way.",
    kind: "number",
    min: 1,
    max: 2000,
    step: 10,
  },
];

// --- schema-drift guard --------------------------------------------------
// Walks each control's dotted key into GameConfig's zod shape. Throws at
// import (like tutorial-script's OF assert) so a renamed/removed schema
// field is caught immediately, not discovered live on a phone at 9pm.
function assertKeyLivesOnSchema(key: string) {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let shape: Record<string, any> = GameConfig.shape;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!shape || !(part in shape))
      throw new Error(`content/controls.ts: key "${key}" not found on GameConfig.shape (missing "${part}")`);
    if (i < parts.length - 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let field: any = shape[part];
      if (typeof field.unwrap === "function") field = field.unwrap(); // ZodDefault/ZodOptional
      if (!field.shape) throw new Error(`content/controls.ts: key "${key}" expects "${part}" to be an object field`);
      shape = field.shape;
    }
  }
}

for (const c of CONTROLS) assertKeyLivesOnSchema(c.key);

export const controlsByGroup = (): Record<string, Control[]> => {
  const out: Record<string, Control[]> = {};
  for (const g of CONTROL_GROUPS) out[g] = [];
  for (const c of CONTROLS) (out[c.group] ??= []).push(c);
  return out;
};
