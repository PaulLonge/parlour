import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

export const maxDuration = 120;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Body = z.object({
  theme: z.string().default("a 1930s ocean liner"),
});

const Samples = z.object({
  socialChallenges: z
    .array(z.object({ brief: z.string(), difficulty: z.number().min(1).max(3) }))
    .min(8),
  killMethods: z
    .array(z.object({ name: z.string(), brief: z.string(), discoveryText: z.string() }))
    .min(3),
});

// D16: Paul's calibration valve. Generates THROWAWAY sample challenges from a
// theme that is NOT his party's, so he can vet generation quality without
// spoiling anything. No auth needed beyond having the URL — it leaks nothing.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const { object } = await generateObject({
    model: anthropic(process.env.STORY_MODEL ?? "claude-sonnet-5"),
    schema: Samples,
    system:
      "You write secret challenges for a live social-deduction party game. Kill methods = 10-second physical acts doable at a house party (no props beyond paper/glasses). Social challenges must be fun while drunk. Wit over gore.",
    prompt: `Theme: ${parsed.data.theme}. Write sample social challenges and kill methods for quality vetting.`,
  });
  return NextResponse.json(object);
}
