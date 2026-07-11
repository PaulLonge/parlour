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
  claimedSender: z
    .string()
    .optional()
    .describe("ROGUE: which AI this message CLAIMS to be from — impersonation is content (D28)"),
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

// ------------------------- ROGUE mode tools (D19–D31) -------------------------

export const Hijack = z.object({
  tool: z.literal("hijack"),
}).describe("Fire THE HIJACK once, at arrival threshold: act1 pre-game theatre → live");

export const OfferBribe = z.object({
  tool: z.literal("offer_bribe"),
  playerName: z.string(),
  amount: z.number().min(1),
  memo: z.string().describe("transaction memo theatre: 'consulting fees'"),
  mission: z.string().describe("the small task that comes with the coin"),
  publicTrace: z.string().describe("the arguable public meter line: 'someone just sold the map room'"),
  expiresInMinutes: z.number().min(1).max(60).default(3),
});

export const OfferMission = z.object({
  tool: z.literal("offer_mission"),
  playerName: z.string(),
  side: z.enum(["good", "rogue"]),
  brief: z.string(),
  amount: z.number().min(1),
  verification: z
    .enum(["submission", "cross", "code", "self", "forgery"])
    .describe("D21: how completion is proven; 'forgery' grants the hacked-AI compose right"),
  codeText: z.string().optional().describe("for code missions: which slip code is involved"),
  expiresInMinutes: z.number().min(3).max(90).default(20),
});

export const Adjudicate = z.object({
  tool: z.literal("adjudicate"),
  challengeId: z.string().uuid(),
  verdict: z.enum(["complete", "reject"]),
  payout: z.number().optional(),
});

export const AppointFrontman = z.object({
  tool: z.literal("appoint_frontman"),
  playerName: z.string().describe("must be a minion, never burned, never panic"),
});

export const CallParley = z.object({
  tool: z.literal("call_parley"),
  script: z.string().describe("what the caller says — spoken by an AI on the channel or handed to the front man"),
  calledBy: z.enum(["rogue", "good", "frontman"]).default("rogue"),
});

export const EndParley = z.object({ tool: z.literal("end_parley") });

export const OpenAccusation = z.object({
  tool: z.literal("open_accusation"),
}).describe("the room votes to name a suspected front man; right = BURNING, wrong = rogue tempo");

export const CloseAccusation = z.object({ tool: z.literal("close_accusation") });

export const OpenUnmasking = z.object({
  tool: z.literal("open_unmasking"),
}).describe("the final naming — two-sided stakes");

export const ResolveUnmasking = z.object({ tool: z.literal("resolve_unmasking") });

export const HandleForgery = z.object({
  tool: z.literal("handle_forgery"),
  forgeryId: z.string().uuid(),
  action: z.enum(["forward", "edit", "expose", "reject"]),
  finalText: z.string().optional().describe("for edit: what actually gets delivered"),
  toPlayerName: z.string().optional().describe("recipient of the forged message"),
  tellPlayerName: z.string().optional().describe("for expose: who is quietly told it's forged"),
});

export const AdjustMeters = z.object({
  tool: z.literal("adjust_meters"),
  plunder: z.number().optional(),
  compute: z.number().optional(),
  confidence: z.number().optional(),
  line: z.string().optional().describe("public one-liner accompanying the tick"),
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
  Hijack,
  OfferBribe,
  OfferMission,
  Adjudicate,
  AppointFrontman,
  CallParley,
  EndParley,
  OpenAccusation,
  CloseAccusation,
  OpenUnmasking,
  ResolveUnmasking,
  HandleForgery,
  AdjustMeters,
]);
export type DirectorTool = z.infer<typeof DirectorTool>;

export const DirectorProposal = z.object({
  reasoning: z.string().describe("One short paragraph: read of the room, why these moves"),
  moves: z.array(DirectorTool).max(12),
});
export type DirectorProposal = z.infer<typeof DirectorProposal>;
