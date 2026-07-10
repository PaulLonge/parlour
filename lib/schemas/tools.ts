import { z } from "zod";

// ---------------------------------------------------------------------------
// The director's tool vocabulary (invariant I10: director PROPOSES, the
// referee DISPOSES). The LLM emits an array of these; every one is validated
// for legality against live game state before anything mutates.
// ---------------------------------------------------------------------------

export const SendMessage = z.object({
  tool: z.literal("send_message"),
  playerName: z.string(),
  kind: z.enum(["secret", "task", "flavor", "info", "ghost_knowledge"]),
  title: z.string(),
  body: z.string(),
});

export const OfferChallenge = z.object({
  tool: z.literal("offer_challenge"),
  playerName: z.string(),
  type: z.enum(["kill", "social"]),
  brief: z.string(),
  targetName: z.string().optional().describe("victim persona/player for kill challenges"),
  method: z.string().optional().describe("kill method name from the story"),
  expiresInMinutes: z.number().min(3).max(90).default(20),
});

export const Announce = z.object({
  tool: z.literal("announce"),
  text: z.string(),
  // announcer=true → this is a card sent to the HOST to read aloud (I12)
  viaAnnouncer: z.boolean().default(false),
});

export const AdvancePhase = z.object({
  tool: z.literal("advance_phase"),
  to: z.enum([
    "act1",
    "round.social",
    "round.murder_window",
    "round.body_found",
    "round.assembly",
    "round.vote",
    "round.banishment",
    "endgame",
    "reveal",
    "ended",
  ]),
});

export const RunEntrance = z.object({
  tool: z.literal("run_entrance"),
  playerName: z.string(),
});

export const Respawn = z.object({
  tool: z.literal("respawn"),
  playerName: z.string(),
  spareIndex: z.number().min(0).optional(),
});

export const WriteDown = z.object({
  tool: z.literal("write_down"),
  playerName: z.string(),
  note: z.string().describe("why — e.g. panic pressed; player gets a gentler track"),
});

export const Pacing = z.object({
  tool: z.literal("pacing"),
  action: z.enum(["compress", "extend", "note"]),
  note: z.string(),
});

export const CloseVote = z.object({
  tool: z.literal("close_vote"),
});

export const DirectorTool = z.discriminatedUnion("tool", [
  SendMessage,
  OfferChallenge,
  Announce,
  AdvancePhase,
  RunEntrance,
  Respawn,
  WriteDown,
  Pacing,
  CloseVote,
]);
export type DirectorTool = z.infer<typeof DirectorTool>;

export const DirectorProposal = z.object({
  reasoning: z.string().describe("One short paragraph: read of the room, why these moves"),
  moves: z.array(DirectorTool).max(12),
});
export type DirectorProposal = z.infer<typeof DirectorProposal>;
