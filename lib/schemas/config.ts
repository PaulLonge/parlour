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
});
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
