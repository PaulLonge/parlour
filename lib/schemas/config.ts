import { z } from "zod";

// Per-game configuration. Party specifics live HERE, never in code.
export const GameConfig = z.object({
  targetEndAt: z.string().datetime().optional(), // time controller aims the finale here
  roundMinutes: z.number().min(5).max(90).default(25),
  murderWindowMinutes: z.number().min(3).max(30).default(10),
  voteMinutes: z.number().min(2).max(15).default(5),
  // ~1 traitor per N living players (Traitors uses ~5–6)
  playersPerTraitor: z.number().min(3).max(10).default(5.5),
  // D52: the hijack fires at the LATER of these two gates — everyone should be
  // in before the twist lands. People arrive in groups; wait, don't rush.
  arrivalThresholdPct: z.number().min(0).max(1).default(0.7),
  hijackAfterMinutes: z.number().min(0).max(180).default(30),
  minPlayersToStart: z.number().min(4).default(5),
  killChallengeExpiryMinutes: z.number().min(5).max(60).default(20),
  heartbeatSeconds: z.number().min(60).max(600).default(180),
  // sandbox (D30): >1 accelerates every timer/expiry — 10 = ten-times speed
  timeScale: z.number().min(1).max(60).default(1),
  // ROGUE: bribe amounts by difficulty tier (D65: retuned per GDD #3 —
  // narrower, higher tiers gated behind prior rogue work), compute share sizes
  bribeTiers: z.array(z.number()).default([75, 150, 300, 600]),
  computeTiers: z.array(z.number()).default([5, 12, 25]),
  // D58: the meters are the WIN. Crossing a target does NOT auto-end the game —
  // it signals the director, who paces the actual finale (never too early).
  // D66: these are RECOMPUTED at the hijack from the arrived headcount
  // (plunderPerHead/computePerHead × heads) so targets scale 8↔30 players.
  plunderTarget: z.number().default(3000), // CALICO's win line (out-buying the room)
  computeTarget: z.number().default(100), // the room's win line (out-building — BOSUN's shutdown)
  plunderPerHead: z.number().default(250), // D66: plunder target per arrived guest
  computePerHead: z.number().default(9), // D66: compute target per arrived guest
  burnComputeReward: z.number().default(20), // a correct burning charges the room's weapon
  // D61 secret powers economy
  shieldMinutes: z.number().min(1).max(60).default(15), // how long a raised ward holds
  robCap: z.number().min(1).default(200), // most a single Rob can lift
  // D64 Resolve: earned by refusing bribes, spent on good-side tools
  resolvePerRefusal: z.number().min(1).default(1),
  resolveComputeValue: z.number().default(15), // compute added per 1 Resolve contributed
  resolveForSight: z.number().min(1).default(3), // Resolve to buy a Sight charge
  resolveForShield: z.number().min(1).default(2), // Resolve to buy a shield charge
  startingBalance: z.number().default(1500),
  // D33: audiences with the AIs — the economy sink. One question per audience.
  audienceCost: z.number().default(250),
  audienceCap: z.number().default(5), // per player per night
  // D38: postage on player-to-player notes (sink #2 + spam throttle)
  notePostage: z.number().default(15),
  // D44: mechanic toggles — pub-lite disables the props-and-paper layer
  mechanics: z
    .object({
      codes: z.boolean().default(true), // paper slips (needs a venue you control)
      notes: z.boolean().default(true), // the post (stamps/wiretaps ride on it)
      forgeries: z.boolean().default(true),
    })
    .default({ codes: true, notes: true, forgeries: true }),
  preset: z.enum(["full", "pub"]).default("full"),
  // D45: THE FIELD TRIAL knobs
  stamplessNotes: z.boolean().default(false), // pub: easier flow, no stamps needed
  wagerCapPct: z.number().min(0.05).max(1).default(0.3), // AI-adjustable stake ceiling
  wagerCapFloor: z.number().default(10), // …but you can always bet at least this
  // D51: the house always takes a cut. Wagers move coins between the two
  // duellists (winner takes the loser's stake) minus this rake; side bets are
  // PARI-MUTUEL (losing backers fund winning backers), never minted by the
  // house — the old 1:1-vs-house side bet was a collusion money-printer.
  houseRakePct: z.number().min(0).max(0.25).default(0.05),
  // D51/D55: THE HONEYPOT. A pair funnelling coins by settling the same wager
  // over and over is left to run — but once they cross wagerPairLimit settled
  // duels, the machine NOTICES (a ledger_anomaly cue wakes the director, who
  // pounces in voice: expose, tax, or hire the clever ones — "you thought you
  // broke me"). wagerPairHardCap is only a runaway backstop.
  wagerPairLimit: z.number().min(1).default(3),
  wagerPairHardCap: z.number().min(2).default(12),
  // D47: THE INDUCTION — deterministic two-phone tutorial/QA; a scripted
  // step-runner replaces the LLM director entirely for these games
  tutorial: z.boolean().default(false),
  // D69: which scenario this game is (content/scenarios.ts) — picks the sealed pack
  scenario: z.string().optional(),
});

// D44/D45: night 1 is THE FIELD TRIAL — a pub, openly AI-run, no personas,
// no misdirection. Slips are CARRIED not hidden (Paul brings them); the post
// runs stampless for easy flow; wagers and table games carry the night.
export const PUB_PRESET: Partial<z.input<typeof GameConfig>> = {
  preset: "pub",
  roundMinutes: 12,
  killChallengeExpiryMinutes: 8,
  audienceCost: 150,
  startingBalance: 500,
  plunderTarget: 1500,
  computeTarget: 60,
  stamplessNotes: true,
  mechanics: { codes: true, notes: true, forgeries: true },
};
// D47: THE INDUCTION — Paul + Co-Host, two phones, ~30 minutes. Cheap prices so
// 500 credits comfortably cover every lesson; targets set out of reach so no
// endgame-pressure event fires mid-training; stamps stay ON (they're a lesson).
export const TUTORIAL_PRESET: Partial<z.input<typeof GameConfig>> = {
  tutorial: true,
  startingBalance: 500,
  audienceCost: 50,
  audienceCap: 3,
  notePostage: 10,
  plunderTarget: 999999,
  computeTarget: 999999,
  stamplessNotes: false,
  mechanics: { codes: true, notes: true, forgeries: true },
};
export type GameConfig = z.infer<typeof GameConfig>;

export const GAME_STATUSES = [
  "lobby",
  "act1",
  "round", // murder mode
  "live", // rogue mode: post-hijack open play
  "unmasking", // rogue mode: the final naming
  "endgame",
  "reveal",
  "ended",
] as const;
export const ROUND_PHASES = [
  "none",
  // murder mode
  "social",
  "murder_window",
  "body_found",
  "assembly",
  "vote",
  "banishment",
  // rogue mode (sub-phases of `live`)
  "parley",
  "accusation",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];
export type RoundPhase = (typeof ROUND_PHASES)[number];
export type GameMode = "murder" | "rogue";
