import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tickDirector } from "@/lib/director/director";

const Body = z.object({
  code: z.string().optional(),
  gameId: z.string().uuid().optional(),
  trigger: z.string().default("heartbeat"),
});

// Heartbeat entry point. Called by (a) Supabase pg_cron, (b) the house-channel
// TV page every config.heartbeatSeconds, (c) manual curl. Debounced server-side
// so spamming it cannot make the director fire more than ~once/minute.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const { code, gameId, trigger } = parsed.data;

  const secretOk =
    req.headers.get("x-tick-secret") === process.env.DIRECTOR_TICK_SECRET &&
    !!process.env.DIRECTOR_TICK_SECRET;

  const admin = supabaseAdmin();
  let id = gameId ?? null;
  if (!id && code) {
    const { data } = await admin.from("games").select("id").eq("code", code.toUpperCase()).single();
    id = data?.id ?? null;
  }
  if (!id) return NextResponse.json({ error: "game not found" }, { status: 404 });

  // debounce heartbeats from untrusted callers (the TV page carries no secret)
  if (!secretOk) {
    const { data: last } = await admin
      .from("director_log")
      .select("created_at")
      .eq("game_id", id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 60_000)
      return NextResponse.json({ skipped: "debounced" });
  }

  const result = await tickDirector(id, trigger).catch((e) => ({
    skipped: `error: ${e instanceof Error ? e.message : e}`,
  }));
  return NextResponse.json(result);
}
