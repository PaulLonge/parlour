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
  role: "faithful" | "traitor";
  character: Record<string, unknown> | null;
  arrived_at: string | null;
  panic: boolean;
};

export type GameRow = {
  id: string;
  code: string;
  title: string;
  status: GameStatus;
  round_no: number;
  round_phase: RoundPhase;
  paused: boolean;
  config: Record<string, unknown>;
  story_public: Record<string, unknown> | null;
  sealed_story: Story | null;
};

export type ChallengeRow = {
  id: string;
  game_id: string;
  player_id: string;
  type: "kill" | "social" | "secret";
  brief: string;
  data: Record<string, unknown>;
  status: "offered" | "completed" | "expired" | "revoked";
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
};

export async function loadState(admin: SupabaseClient, gameId: string): Promise<GameState> {
  const [{ data: game, error: ge }, { data: players, error: pe }, { data: challenges, error: ce }] =
    await Promise.all([
      admin.from("games").select("*").eq("id", gameId).single(),
      admin.from("players").select("*").eq("game_id", gameId),
      admin.from("challenges").select("*").eq("game_id", gameId).eq("status", "offered"),
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
    `${p.name}${p.is_host ? " (HOST)" : ""} [${p.status}${p.role === "traitor" ? "/TRAITOR" : ""}${
      p.panic ? "/PANIC" : ""
    }] as ${(p.character as { personaName?: string } | null)?.personaName ?? "(uncast)"}`;
  lines.push(`Players (${s.players.length}):`);
  for (const p of s.players) lines.push(`  - ${fmt(p)}`);
  if (s.openChallenges.length) {
    lines.push(`Open challenges:`);
    for (const c of s.openChallenges) {
      const holder = s.players.find((p) => p.id === c.player_id)?.name ?? "?";
      lines.push(`  - [${c.type}] for ${holder}: "${c.brief}" (expires ${c.expires_at ?? "never"})`);
    }
  }
  const faithful = s.alive.length - s.traitorsAlive.length;
  lines.push(`Balance: ${s.traitorsAlive.length} traitor(s) vs ${faithful} faithful alive.`);
  if (s.traitorsAlive.length === 0 && g.status === "round")
    lines.push(`NOTE: no traitors alive — consider arming or moving to endgame.`);
  if (s.traitorsAlive.length >= faithful && g.status === "round")
    lines.push(`NOTE: traitors have reached parity — endgame condition.`);
  return lines.join("\n");
}
