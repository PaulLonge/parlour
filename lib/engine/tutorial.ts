import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState, type GameState } from "./state";
import { applyDirectorMoves } from "./referee";
import { DirectorTool } from "@/lib/schemas/tools";
import {
  TUTORIAL_STEPS,
  type TutorialCondition,
  type TutorialStep,
} from "@/content/tutorial-script";

// ---------------------------------------------------------------------------
// THE INDUCTION driver (D47): a deterministic step-runner that replaces the
// LLM director for tutorial games. State lives in the event log — the latest
// `tutorial_step` event IS the pointer; a step advances when its completion
// condition is satisfied by REAL engine events/rows since that marker. All
// setup goes through applyDirectorMoves: the script proposes, the referee
// disposes, exactly like the real director.
// ---------------------------------------------------------------------------

type Names = { host: string; second: string | null; code: string; sym: string };

function names(s: GameState): Names {
  const host = s.players.find((p) => p.is_host);
  const others = s.players
    .filter((p) => !p.is_host)
    .sort((a, b) =>
      String((a as unknown as { created_at?: string }).created_at ?? "").localeCompare(
        String((b as unknown as { created_at?: string }).created_at ?? "")
      )
    );
  const sym =
    (s.game.story_public as { currency?: { symbol?: string } } | null)?.currency?.symbol ??
    (s.game.sealed_story as { currency?: { symbol?: string } } | null)?.currency?.symbol ??
    "◎";
  return { host: host?.name ?? "the host", second: others[0]?.name ?? null, code: s.game.code, sym };
}

// substitute {{placeholders}} in every string field of a move, depth-first
function fill<T>(v: T, map: Record<string, string>): T {
  if (typeof v === "string")
    return v.replace(/\{\{(\w+)\}\}/g, (_, k: string) => map[k] ?? `{{${k}}}`) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => fill(x, map)) as unknown as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, map)])) as unknown as T;
  return v;
}

// 0009: one tutorial_step / tutorial_step_done row per game+step (unique
// index) — a competing ticker's insert fails and it must simply stand down.
function lostRace(e: unknown): boolean {
  return e instanceof Error && e.message.includes("duplicate key value");
}

async function marker(admin: SupabaseClient, gameId: string) {
  const { data } = await admin
    .from("events")
    .select("id, payload")
    .eq("game_id", gameId)
    .eq("type", "tutorial_step")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: number; payload: { step?: number } } | null;
}

async function met(
  admin: SupabaseClient,
  gameId: string,
  cond: TutorialCondition,
  sinceEventId: number
): Promise<boolean> {
  switch (cond.kind) {
    case "auto":
      return true;
    case "players": {
      const { count } = await admin
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId);
      return (count ?? 0) >= cond.count;
    }
    case "arrived": {
      const { count } = await admin
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .not("arrived_at", "is", null);
      return (count ?? 0) >= cond.count;
    }
    case "event": {
      const { count } = await admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("type", cond.type)
        .gt("id", sinceEventId);
      return (count ?? 0) >= cond.count;
    }
    case "notes": {
      const { count } = await admin
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId);
      return (count ?? 0) >= cond.count;
    }
    case "votes": {
      const { data: g } = await admin.from("games").select("round_no").eq("id", gameId).single();
      const { count } = await admin
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("round_no", g?.round_no ?? -1);
      return (count ?? 0) >= cond.count;
    }
  }
}

async function startStep(admin: SupabaseClient, gameId: string, n: Names, idx: number) {
  const step = TUTORIAL_STEPS[idx];
  // marker FIRST: events emitted by this step's own moves land AFTER it, so a
  // step whose condition is satisfied by its own moves (e.g. close_accusation)
  // resolves on the very next tick.
  await emit(admin, gameId, "tutorial_step", {
    payload: { step: idx, key: step.key, title: step.title, of: TUTORIAL_STEPS.length },
    isPublic: true,
  });
  const map = { host: n.host, second: n.second ?? "your second", code: n.code, sym: n.sym };
  const moves = step.moves.map((m) => DirectorTool.parse(fill(m, map)));
  const verdicts = await applyDirectorMoves(admin, gameId, moves);
  // the conductor's record: every induction step is logged like a director tick
  await admin.from("director_log").insert({
    game_id: gameId,
    trigger: `tutorial:${step.key}`,
    input: { step: idx },
    proposals: { reasoning: `INDUCTION step ${idx + 1}/${TUTORIAL_STEPS.length}: ${step.title}`, moves },
    verdicts: { verdicts: verdicts.map((v) => ({ ok: v.ok, detail: v.detail })) },
  });
  return verdicts;
}

async function finish(admin: SupabaseClient, gameId: string, n: Names) {
  const { data: dones } = await admin
    .from("events")
    .select("payload")
    .eq("game_id", gameId)
    .eq("type", "tutorial_step_done")
    .order("id");
  const skipped = (dones ?? []).filter((d) => (d.payload as { skipped?: boolean })?.skipped);
  const passed = (dones ?? []).length - skipped.length;
  await emit(admin, gameId, "tutorial_complete", {
    payload: { passed, skipped: skipped.map((d) => (d.payload as { key?: string })?.key) },
    isPublic: true,
  });
  const summary =
    `Steps verified by the machinery itself: ${passed} of ${TUTORIAL_STEPS.length}.` +
    (skipped.length
      ? ` Skipped: ${skipped.map((d) => (d.payload as { key?: string })?.key).join(", ")} — re-run those before the real night.`
      : ` Nothing skipped. The instruments are in tune.`) +
    `\n\nEvery step that shows "verified" above was proven by the real mechanic on your real phones — this induction doubles as the QA record, and it is all in the event log.`;
  const s = await loadState(admin, gameId);
  for (const p of s.players)
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: p.id,
      round_no: s.game.round_no,
      kind: "system",
      title: "🎓 INDUCTION — the record",
      body: summary,
    });
  // sentinel marker: the pointer moves past the last step so later ticks see
  // "complete" instead of re-running the finale
  await emit(admin, gameId, "tutorial_step", {
    payload: { step: TUTORIAL_STEPS.length, key: "complete", title: "complete", of: TUTORIAL_STEPS.length },
    isPublic: true,
  });
}

// Host lever: force-advance past a stuck/unwanted step (noted in the record).
export async function skipTutorialStep(admin: SupabaseClient, gameId: string) {
  const s = await loadState(admin, gameId);
  const n = names(s);
  const m = await marker(admin, gameId);
  try {
    if (!m) {
      await startStep(admin, gameId, n, 0);
      return { ok: true, result: "started" };
    }
    const idx = m.payload?.step ?? 0;
    if (idx >= TUTORIAL_STEPS.length) return { ok: false, result: "already_complete" };
    await emit(admin, gameId, "tutorial_step_done", {
      payload: { step: idx, key: TUTORIAL_STEPS[idx].key, skipped: true, via: "host" },
      isPublic: true,
    });
    if (idx + 1 >= TUTORIAL_STEPS.length) {
      await finish(admin, gameId, n);
      return { ok: true, result: "complete" };
    }
    await startStep(admin, gameId, n, idx + 1);
    return { ok: true, result: `skipped_to_${idx + 2}` };
  } catch (e) {
    // a tick beat us to this exact step — the skip is moot, not an error
    if (lostRace(e)) return { ok: false, result: "already_advancing" };
    throw e;
  }
}

export async function tutorialTick(
  admin: SupabaseClient,
  s: GameState
): Promise<{ skipped?: string; moves?: number }> {
  const gameId = s.game.id;
  const n = names(s);

  // advance as far as conditions allow, one guard-railed loop per tick — some
  // steps satisfy their own condition (auto / self-emitted events) and must
  // not wait for a player action that will never come
  for (let guard = 0; guard < 4; guard++) {
    try {
      const m = await marker(admin, gameId);
      if (!m) {
        await startStep(admin, gameId, n, 0);
        return { skipped: "tutorial: step 1 started", moves: TUTORIAL_STEPS[0].moves.length };
      }
      const idx = m.payload?.step ?? 0;
      if (idx >= TUTORIAL_STEPS.length) return { skipped: "tutorial complete" };
      const step: TutorialStep = TUTORIAL_STEPS[idx];

      // steps that need the second player wait until they exist
      if (idx > 0 && !n.second) return { skipped: "tutorial: waiting for the second player" };

      const llmSkip = step.optional === "llm" && !process.env.ANTHROPIC_API_KEY;
      if (!llmSkip && !(await met(admin, gameId, step.done, m.id)))
        return { skipped: `tutorial: waiting on step ${idx + 1} (${step.key})` };

      await emit(admin, gameId, "tutorial_step_done", {
        payload: { step: idx, key: step.key, skipped: llmSkip, ...(llmSkip ? { why: "no ANTHROPIC_API_KEY" } : {}) },
        isPublic: true,
      });
      if (idx + 1 >= TUTORIAL_STEPS.length) {
        await finish(admin, gameId, n);
        return { skipped: "tutorial complete" };
      }
      await startStep(admin, gameId, n, idx + 1);
    } catch (e) {
      // a concurrent ticker (TV heartbeat, join auto-tick) advanced this exact
      // step first — its moves ran exactly once, ours must not run at all
      if (lostRace(e)) return { skipped: "tutorial: lost the race to a concurrent tick" };
      throw e;
    }
  }
  return { skipped: "tutorial: advanced (guard reached)" };
}
