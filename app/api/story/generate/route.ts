import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller } from "@/lib/engine/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateAndSealStory } from "@/lib/director/generate";

export const maxDuration = 300; // story generation is a long LLM call

const Body = z.object({ code: z.string() });

// Host taps "seal the story" once everyone has registered (or at the party's
// start). The host NEVER sees the result — only that it sealed (I1).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const caller = await getCaller(parsed.data.code);
  if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
  if (!caller.player.is_host) return NextResponse.json({ error: "hosts only" }, { status: 403 });
  if (caller.game.sealed_story)
    return NextResponse.json({ error: "story already sealed" }, { status: 422 });

  const admin = supabaseAdmin();
  const result = await generateAndSealStory(admin, caller.game.id);
  // deliberately vague response — the seal stays intact
  return NextResponse.json({
    sealed: result.ok,
    title: result.title, // title is public (it's on the invitation)
    note: result.usedFallback
      ? "generation fell back to the reference story"
      : "an original story was written and sealed",
  });
}
