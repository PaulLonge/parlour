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
});
export type GameConfig = z.infer<typeof GameConfig>;

export const GAME_STATUSES = ["lobby", "act1", "round", "endgame", "reveal", "ended"] as const;
export const ROUND_PHASES = [
  "none",
  "social",
  "murder_window",
  "body_found",
  "assembly",
  "vote",
  "banishment",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];
export type RoundPhase = (typeof ROUND_PHASES)[number];
