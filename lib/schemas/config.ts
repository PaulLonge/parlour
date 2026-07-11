import { z } from "zod";

// Per-game configuration. Party specifics live HERE, never in code.
export const GameConfig = z.object({
  targetEndAt: z.string().datetime().optional(), // time controller aims the finale here
  roundMinutes: z.number().min(5).max(90).default(25),
  murderWindowMinutes: z.number().min(3).max(30).default(10),
  voteMinutes: z.number().min(2).max(15).default(5),
  // ~1 traitor per N living players (Traitors uses ~5–6)
  playersPerTraitor: z.number().min(3).max(10).default(5.5),
  // start the game proper at % of expected guests arrived, or when host forces it
  arrivalThresholdPct: z.number().min(0).max(1).default(0.7),
  minPlayersToStart: z.number().min(4).default(5),
  killChallengeExpiryMinutes: z.number().min(5).max(60).default(20),
  heartbeatSeconds: z.number().min(60).max(600).default(180),
  // sandbox (D30): >1 accelerates every timer/expiry — 10 = ten-times speed
  timeScale: z.number().min(1).max(60).default(1),
  // ROGUE: bribe amounts by difficulty tier, compute share sizes, targets
  bribeTiers: z.array(z.number()).default([50, 120, 250, 750]),
  computeTiers: z.array(z.number()).default([5, 12, 25]),
  plunderTarget: z.number().default(3000), // meter full = rogue endgame pressure
  computeTarget: z.number().default(100),
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
});

// D44: night 1 is a pub — no props to hide, no TV, shorter and louder.
// Glyphs, quizzes, bribes, audiences, accusations all shine in a pub; paper
// chains and the postal service don't.
export const PUB_PRESET: Partial<z.input<typeof GameConfig>> = {
  preset: "pub",
  roundMinutes: 12,
  killChallengeExpiryMinutes: 8,
  audienceCost: 150,
  mechanics: { codes: false, notes: false, forgeries: true },
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
