import type { SupabaseClient } from "@supabase/supabase-js";
import { GameConfig, type GameStatus, type RoundPhase } from "@/lib/schemas/config";
import type { Story } from "@/lib/schemas/story";

export type PlayerRow = {
  id: string;
  game_id: string;
  auth_uid: string | null;
  name: string;
  is_host: boolean;
  intake: Record<string, unknown>;
  status: "lobby" | "alive" | "dead" | "ghost" | "banished";
  role: "faithful" | "traitor" | "minion"; // minion = bought by the rogue (ROGUE mode)
  character: Record<string, unknown> | null;
  arrived_at: string | null;
  panic: boolean;
  balance: number;
  burned: boolean; // exposed ex-front-man (ROGUE) — stays in play, never fronts again
  eager: boolean; // D34 lean-in flag — wants a bigger role
  stamps: number; // D38a — posting rights, granted by the director
  sight: number; // D56 — Seer charges, granted by the good AI for standout work
  powers: Record<string, number>; // D61 — secret one-use power inventory (rob/swap/copy/shield)
  shielded_until: string | null; // D61 — while future, purse can't be robbed / mail can't be tapped
  resolve: number; // D64 — banked by declining bribes; spent on good-side tools
};

export type Meters = { plunder: number; compute: number; confidence: number };

export type GameRow = {
  id: string;
  code: string;
  title: string;
  status: GameStatus;
  round_no: number;
  round_phase: RoundPhase;
  paused: boolean;
  mode: "murder" | "rogue";
  hijacked_at: string | null;
  meters: Meters;
  frontman_player_id: string | null; // server-only column (revoked from clients)
  config: Record<string, unknown>;
  story_public: Record<string, unknown> | null;
  sealed_story: Story | Record<string, unknown> | null; // RogueStory in rogue mode
};

export type ChallengeRow = {
  id: string;
  game_id: string;
  player_id: string;
  type: "kill" | "social" | "secret" | "bribe" | "mission" | "redemption";
  brief: string;
  data: Record<string, unknown>;
  status: "offered" | "completed" | "expired" | "revoked";
  response: Record<string, unknown> | null;
  offered_at: string;
  expires_at: string | null;
};

export type GameState = {
  game: GameRow;
  config: GameConfig;
  players: PlayerRow[];
  openChallenges: ChallengeRow[];
  alive: PlayerRow[];
  traitorsAlive: PlayerRow[];
  recentDragFlags: string[]; // player names who flagged "dragging" in the last 15 min (D42)
};

export async function loadState(admin: SupabaseClient, gameId: string): Promise<GameState> {
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  const [
    { data: game, error: ge },
    { data: players, error: pe },
    { data: challenges, error: ce },
    { data: dragEvents },
  ] = await Promise.all([
    admin.from("games").select("*").eq("id", gameId).single(),
    admin.from("players").select("*").eq("game_id", gameId),
    admin.from("challenges").select("*").eq("game_id", gameId).eq("status", "offered"),
    admin
      .from("events")
      .select("payload")
      .eq("game_id", gameId)
      .eq("type", "flagged_dragging")
      .gte("created_at", since),
  ]);
  if (ge || !game) throw new Error(`loadState: game not found (${ge?.message})`);
  if (pe) throw new Error(`loadState: players failed (${pe.message})`);
  if (ce) throw new Error(`loadState: challenges failed (${ce.message})`);

  const cfg = GameConfig.parse(game.config ?? {});
  const alive = (players ?? []).filter((p: PlayerRow) => p.status === "alive");
  return {
    game: game as GameRow,
    config: cfg,
    players: (players ?? []) as PlayerRow[],
    openChallenges: (challenges ?? []) as ChallengeRow[],
    alive,
    traitorsAlive: alive.filter((p: PlayerRow) => p.role === "traitor"),
    recentDragFlags: [
      ...new Set((dragEvents ?? []).map((e) => String((e.payload as { player?: string })?.player ?? "?"))),
    ],
  };
}

export async function emit(
  admin: SupabaseClient,
  gameId: string,
  type: string,
  opts: { payload?: Record<string, unknown>; actorId?: string | null; isPublic?: boolean } = {}
) {
  const { error } = await admin.from("events").insert({
    game_id: gameId,
    type,
    actor_id: opts.actorId ?? null,
    is_public: opts.isPublic ?? false,
    payload: opts.payload ?? {},
  });
  if (error) throw new Error(`emit(${type}) failed: ${error.message}`);
}

// Compressed textual state summary the director reads each tick.
export function summarizeForDirector(s: GameState): string {
  const lines: string[] = [];
  const g = s.game;
  lines.push(
    `Game "${g.title}" — status=${g.status} round=${g.round_no} phase=${g.round_phase} paused=${g.paused}`
  );
  if (s.config.targetEndAt) {
    const mins = Math.round((new Date(s.config.targetEndAt).getTime() - Date.now()) / 60000);
    lines.push(`Time remaining to target end: ~${mins} min`);
  }
  const fmt = (p: PlayerRow) =>
    `${p.name}${p.is_host ? " (HOST)" : ""} [${p.status}${
      p.role !== "faithful" ? `/${p.role.toUpperCase()}` : ""
    }${p.burned ? "/BURNED" : ""}${p.panic ? "/PANIC" : ""}${p.eager ? "/EAGER" : ""}]${
      s.game.mode === "rogue" ? ` Ƀ${p.balance}` : ""
    } as ${(p.character as { personaName?: string } | null)?.personaName ?? "(uncast)"}`;
  lines.push(`Players (${s.players.length}):`);
  for (const p of s.players) lines.push(`  - ${fmt(p)}`);
  if (s.game.mode === "rogue") {
    const m = s.game.meters;
    lines.push(
      `Meters: plunder=${m.plunder} compute=${m.compute} confidence=${m.confidence}. ` +
        `Front man: ${s.players.find((p) => p.id === s.game.frontman_player_id)?.name ?? "NONE APPOINTED"}. ` +
        `Minions: ${s.players.filter((p) => p.role === "minion").map((p) => p.name).join(", ") || "none yet"}.`
    );
    if (!s.game.hijacked_at && s.game.status === "act1")
      lines.push(`HIJACK NOT YET FIRED — act1 is pre-game theatre; fire it at arrival threshold.`);
  }
  if (s.openChallenges.length) {
    lines.push(`Open challenges:`);
    for (const c of s.openChallenges) {
      const holder = s.players.find((p) => p.id === c.player_id)?.name ?? "?";
      lines.push(`  - [${c.type}] for ${holder}: "${c.brief}" (expires ${c.expires_at ?? "never"})`);
    }
  }
  const faithful = s.alive.length - s.traitorsAlive.length;
  lines.push(`Balance: ${s.traitorsAlive.length} traitor(s) vs ${faithful} faithful alive.`);
  if (s.config.preset === "pub" || !s.config.mechanics.codes || !s.config.mechanics.notes)
    lines.push(
      `TONIGHT'S TABLE${s.config.preset === "pub" ? " (PUB-LITE)" : ""}: paper codes ${
        s.config.mechanics.codes ? "on" : "OFF"
      }, the post ${s.config.mechanics.notes ? "on" : "OFF"}, forgeries ${
        s.config.mechanics.forgeries ? "on" : "OFF"
      }. Never offer a mission that needs a disabled mechanic; lean on glyph handshakes, quizzes, bribes, audiences, and spoken passphrases.`
    );
  if (s.recentDragFlags.length)
    lines.push(
      `PACING (D42a): HOST flag(s) in the last 15 min from: ${s.recentDragFlags.join(", ")} — the hosts find this stretch slow. This is a strong, trusted signal: energize NOW (a mission wave, a quiz burst, a parley, or compress the phase). Both hosts flagging = compress immediately unless a vote is open. Never announce that a flag happened.`
    );
  if (s.traitorsAlive.length === 0 && g.status === "round")
    lines.push(`NOTE: no traitors alive — consider arming or moving to endgame.`);
  if (s.traitorsAlive.length >= faithful && g.status === "round")
    lines.push(`NOTE: traitors have reached parity — endgame condition.`);
  return lines.join("\n");
}
