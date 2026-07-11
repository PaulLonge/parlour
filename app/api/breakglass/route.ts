import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emit } from "@/lib/engine/state";
import { tickDirector } from "@/lib/director/director";
import type { Story } from "@/lib/schemas/story";

const Body = z.object({
  code: z.string(),
  action: z.enum([
    "open", // opening the panel PUBLICLY pauses the game (I2)
    "resume",
    "skip_to_assembly",
    "compress",
    "extend_30",
    "reveal_twist", // explicit tap only — even break-glass stays blind otherwise
    "end_gracefully",
    "start_party", // lobby → act1 (pre-seal host control, not a seal break)
    "fire_hijack", // ROGUE: manual takeover trigger (gap #2 — the host's lever)
  ]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
  if (!caller.player.is_host)
    return NextResponse.json({ error: "hosts only" }, { status: 403 });

  const admin = supabaseAdmin();
  const gameId = caller.game.id;
  const action = parsed.data.action;

  switch (action) {
    case "open": {
      await admin.from("games").update({ paused: true }).eq("id", gameId);
      await emit(admin, gameId, "seal_broken", {
        payload: { text: "The house lights flicker. The game holds its breath…" },
        actorId: caller.player.id,
        isPublic: true,
      });
      // panel contents: state + the director's recent reasoning (NOT the twist)
      const { data: lastLogs } = await admin
        .from("director_log")
        .select("trigger, proposals, created_at")
        .eq("game_id", gameId)
        .order("id", { ascending: false })
        .limit(3);
      return NextResponse.json({
        paused: true,
        recentDirectorThinking: (lastLogs ?? []).map((l) => ({
          at: l.created_at,
          trigger: l.trigger,
          reasoning: (l.proposals as { reasoning?: string })?.reasoning ?? "",
        })),
      });
    }
    case "resume": {
      await admin.from("games").update({ paused: false }).eq("id", gameId);
      await emit(admin, gameId, "seal_resumed", {
        payload: { text: "The lights settle. The evening resumes." },
        isPublic: true,
      });
      after(() => tickDirector(gameId, "event:breakglass_resume").catch(console.error));
      return NextResponse.json({ paused: false });
    }
    case "skip_to_assembly": {
      await admin.from("games").update({ paused: false, status: "round", round_phase: "assembly" }).eq("id", gameId);
      await emit(admin, gameId, "phase_advanced", {
        payload: { to: "round.assembly", via: "breakglass" },
        isPublic: true,
      });
      after(() => tickDirector(gameId, "event:breakglass_skip").catch(console.error));
      return NextResponse.json({ ok: true });
    }
    case "compress":
    case "extend_30": {
      const cfg = (caller.game.config ?? {}) as Record<string, unknown>;
      if (action === "extend_30" && typeof cfg.targetEndAt === "string")
        cfg.targetEndAt = new Date(new Date(cfg.targetEndAt).getTime() + 30 * 60000).toISOString();
      if (action === "compress")
        cfg.roundMinutes = Math.max(8, Math.round(((cfg.roundMinutes as number) ?? 25) * 0.6));
      await admin.from("games").update({ config: cfg }).eq("id", gameId);
      await emit(admin, gameId, "pacing_adjusted", { payload: { via: "breakglass", action } });
      after(() => tickDirector(gameId, `event:breakglass_${action}`).catch(console.error));
      return NextResponse.json({ ok: true, config: cfg });
    }
    case "reveal_twist": {
      const story = caller.game.sealed_story as Story | null;
      await emit(admin, gameId, "twist_unsealed_to_host", { actorId: caller.player.id });
      return NextResponse.json({ twist: story?.twist?.summary ?? "(no story sealed)" });
    }
    case "end_gracefully": {
      await admin.from("games").update({ paused: false, status: "endgame", round_phase: "none" }).eq("id", gameId);
      await emit(admin, gameId, "phase_advanced", { payload: { to: "endgame", via: "breakglass" }, isPublic: true });
      after(() => tickDirector(gameId, "event:breakglass_end").catch(console.error));
      return NextResponse.json({ ok: true });
    }
    case "fire_hijack": {
      const { fireHijack } = await import("@/lib/engine/rogue");
      const r = await fireHijack(admin, gameId);
      if (!r.ok) return NextResponse.json({ error: r.result }, { status: 422 });
      after(() => tickDirector(gameId, "event:hijack_fired_manually").catch(console.error));
      return NextResponse.json({ ok: true });
    }
    case "start_party": {
      if (caller.game.status !== "lobby")
        return NextResponse.json({ error: "already started" }, { status: 422 });
      await admin.from("games").update({ status: "act1", round_phase: "none" }).eq("id", gameId);
      await emit(admin, gameId, "phase_advanced", { payload: { from: "lobby", to: "act1" }, isPublic: true });
      after(() => tickDirector(gameId, "event:party_started").catch(console.error));
      return NextResponse.json({ ok: true });
    }
  }
}
