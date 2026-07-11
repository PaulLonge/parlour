"use client";

// Design preview — NO database or env needed. Renders the real game components
// with sample content from the golden story, switchable across the three themes.
// Run `npm run dev` and open /preview.

import { useState } from "react";
import {
  CharacterSheet,
  ChallengeOffer,
  MessageEnvelope,
  VoteTable,
  DeadBanner,
} from "@/lib/client/cards";
import golden from "@/content/golden-story.json";

const THEMES = [
  { cls: "theme-manor", name: "Candlelit Manor", blurb: "wax seals, brandy, firelight" },
  { cls: "theme-deco", name: "Deco Noir", blurb: "gold lines, black marble, 1928" },
  { cls: "theme-seance", name: "Séance", blurb: "violet dark, spirit-glow green" },
] as const;

const celia = golden.characters[1];

const MOCK_MESSAGES = [
  {
    id: "m1",
    kind: "secret",
    title: "A whisper as you arrive…",
    body: celia.entrance.starterSecret,
    created_at: "",
  },
  {
    id: "m2",
    kind: "task",
    title: "Someone new has arrived",
    body: "Welcome the newcomer warmly, then mention — casually — that the will was rewritten in spring.",
    created_at: "",
  },
  {
    id: "m3",
    kind: "flavor",
    title: "The house notices you",
    body: "Someone has been in the study. The fire was lit twice today.",
    created_at: "",
  },
];

const MOCK_KILL = {
  id: "c1",
  type: "kill",
  brief:
    "Hand Major Tom Radley a drink you have 'prepared' — any drink — and say the word 'cheers' as he takes it. Do this before the clock next strikes, or the offer passes to another.",
  data: { targetName: "Major Tom Radley", method: "The Marked Glass" },
  status: "offered",
  expires_at: new Date().toISOString(),
};

const MOCK_SOCIAL = {
  id: "c2",
  type: "social",
  brief: "Work the phrase 'the second fire' into three separate conversations.",
  data: {},
  status: "offered",
  expires_at: null,
};

const MOCK_CANDIDATES = [
  { id: "1", name: "Paul" },
  { id: "2", name: "Co-Host" },
  { id: "3", name: "Alex" },
  { id: "4", name: "Jess" },
];

export default function Preview() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>(THEMES[0]);
  const [voted, setVoted] = useState<string | null>(null);

  return (
    <div className={`themed min-h-dvh ${theme.cls}`}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* switcher */}
        <header className="mb-8 text-center">
          <p className="deco-rule kicker justify-center">design preview — pick a house style</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {THEMES.map((t) => (
              <button
                key={t.cls}
                className={`btn ${theme.cls === t.cls ? "" : "btn-ghost"}`}
                onClick={() => setTheme(t)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            {theme.blurb}
          </p>
        </header>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center">
          {/* ------------------------------- phone ------------------------------- */}
          <section
            className="w-full max-w-[390px] overflow-hidden rounded-[2.2rem] border-4"
            style={{ borderColor: "rgba(0,0,0,0.6)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
          >
            <div className="themed max-h-[720px] overflow-y-auto p-4 pb-16" style={{ backgroundAttachment: "local" }}>
              <header>
                <div className="flex items-baseline justify-between gap-3">
                  <h1 className="font-display text-2xl leading-tight" style={{ color: "var(--gold)" }}>
                    {golden.meta.title}
                  </h1>
                  <span className="text-right text-sm italic whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
                    {celia.personaName}
                  </span>
                </div>
                <hr className="divider my-2" />
                <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
                  Round 2 — 🗳️ The vote is open
                </p>
              </header>

              <div className="mt-4 flex flex-col gap-4">
                <CharacterSheet ch={celia} />
                <ChallengeOffer c={MOCK_KILL as never} aliveNames={MOCK_CANDIDATES.map((c) => c.name)} onComplete={() => {}} />
                <VoteTable candidates={MOCK_CANDIDATES} votedId={voted} onVote={setVoted} />
                <MessageEnvelope m={MOCK_MESSAGES[0] as never} />
                <ChallengeOffer c={MOCK_SOCIAL as never} aliveNames={[]} onComplete={() => {}} />
                {MOCK_MESSAGES.slice(1).map((m) => (
                  <MessageEnvelope key={m.id} m={m as never} />
                ))}
                <DeadBanner status="dead" />
              </div>
            </div>
          </section>

          {/* -------------------------------- tv --------------------------------- */}
          <section className="w-full max-w-[720px]">
            <div
              className="themed relative flex aspect-video flex-col overflow-hidden rounded-lg border p-8"
              style={{ borderColor: "rgba(0,0,0,0.7)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
            >
              <div className="vignette !absolute" />
              <header className="relative text-center">
                <p className="deco-rule kicker justify-center text-[0.55rem]">the house is listening</p>
                <h1 className="candle font-display mt-2 text-4xl" style={{ color: "var(--gold)" }}>
                  {golden.meta.title}
                </h1>
                <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
                  {golden.meta.tagline}
                </p>
              </header>
              <div className="relative flex flex-1 items-center justify-center px-6 text-center">
                <p className="drift font-display text-2xl leading-snug">
                  “{golden.killMethods[0].discoveryText}”
                </p>
              </div>
              <footer className="relative flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-dim)" }}>
                <span>Paul ✦</span>
                <span>Co-Host</span>
                <span className="line-through opacity-40">Sam</span>
                <span>👻 Jess</span>
                <span>Alex</span>
                <span>Tom</span>
                <span>Priya</span>
                <span>Dan</span>
              </footer>
            </div>
            <p className="mt-3 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
              the house channel — lives on the television all night
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
