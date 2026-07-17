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
import { MetersStrip, PurseChip, BribeCard, CodeEntryBox, GlyphBadge, ActionRow } from "@/lib/client/rogue-cards";
import { MiniGame, PHONE_GAMES } from "@/lib/client/minigames";
import { WagerHub } from "@/lib/client/wager-hub";
import { EvidenceBoard } from "@/lib/client/evidence-board";
import type { useGame } from "@/lib/client/useGame";
import golden from "@/content/golden-story.json";
import type { PublicEvent } from "@/lib/client/useGame";
// D72's held piece — THE DESCENT: the reveal ceremony lives on the TV page
// (it owns CeremonyBoard, the depth machinery, and the ceremony pieces), so
// the preview imports the real components rather than reimplementing them.
import {
  SurfaceCard,
  MidnightVerdict,
  ReceiptsDescent,
  CeremonyBoard,
  type UnmaskedPayload,
  type ReceiptRow,
} from "@/app/tv/[code]/page";

const THEMES = [
  { cls: "theme-manor", name: "Candlelit Manor", blurb: "wax seals, brandy, firelight", rogue: false },
  { cls: "theme-deco", name: "Deco Noir", blurb: "gold lines, black marble, 1928", rogue: false },
  { cls: "theme-seance", name: "Séance", blurb: "violet dark, spirit-glow green", rogue: false },
  { cls: "theme-decoy", name: "Decoy (Act 1)", blurb: "the naff pirate party you were promised", rogue: true },
  { cls: "theme-hijacked", name: "HIJACKED", blurb: "new management. same low standards.", rogue: true },
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

// Decoy mock content is invented FOR the preview — the real cover story stays
// server-side; the manor story must never bleed into the pirate mock (review R3).
const MOCK_COVER_TITLE = "Dead Man's Cove";
const MOCK_COVER_TAGLINE = "a pirate night of low deeds and lower tides";
const MOCK_PIRATE = {
  personaName: "Mad Sal of the Shallows",
  archetype: "the quartermaster",
  publicBlurb: "Keeps the crew's ledger and everyone's secrets — priced individually.",
  costumeHint: "a sash, an unconvincing parrot, the ledger under one arm",
  background: "Thirty years at sea, none of them honest.",
  connections: [{ personaName: "Captain Ruff", what: "owes you a share" }],
  secret: "You cannot actually swim.",
  mannerism: "Taps the ledger twice before answering anything.",
};
const MOCK_PIRATE_MESSAGES = [
  {
    id: "p1",
    kind: "info",
    title: "Welcome aboard",
    body: "Find your host, say 'permission to come aboard', and claim your first grog token.",
    created_at: "",
  },
  {
    id: "p2",
    kind: "flavor",
    title: "The tide is coming in",
    body: "The captain counts the crew at eight bells. Nobody has seen the captain.",
    created_at: "",
  },
];

// THE DESCENT mock content — invented for the preview, same as the pirate
// mock above; the real ceremony data (receipts/verdict/awards) is all PUBLIC
// events the TV can already read (see resolveUnmasking in lib/engine/rogue.ts).
const DESCENT_STAGES = ["surface", "receipts", "verdict", "floor"] as const;
type DescentStageMock = (typeof DESCENT_STAGES)[number];

const MOCK_UNMASKED: PublicEvent = {
  id: 1,
  type: "unmasking_resolved",
  created_at: "",
  payload: {
    named: "Mad Sal of the Shallows",
    frontman: "Mad Sal of the Shallows",
    humansWin: true,
    winPath: "named",
    minions: ["Cooper", "Reyes"],
  } as UnmaskedPayload,
};

const MOCK_RECEIPT_ROWS: ReceiptRow[] = [
  { at: "21:14", amount: 250, memo: "a whisper about the ledger's second page" },
  { at: "21:26", amount: 500, memo: "looked away while the crate was moved" },
  { at: "21:41", amount: 150, memo: "vouched for a story that didn't add up" },
  { at: "21:58", amount: 750, memo: "carried a message CALICO didn't sign" },
  { at: "22:10", amount: 300, memo: "sat on a code instead of surfacing it" },
  { at: "22:22", amount: 1000, memo: "named the wrong name, loudly, on request" },
  { at: "22:35", amount: 400, memo: "a favour, logged as a favour" },
  { at: "22:47", amount: 600, memo: "held the door for the quartermaster" },
  { at: "22:58", amount: 200, memo: "traded a rumour for a round" },
  { at: "23:09", amount: 850, memo: "signed off on a number nobody checked" },
  { at: "23:20", amount: 350, memo: "let a bribe sit unrefused a beat too long" },
];

const MOCK_AWARDS = [
  { title: "THE CHEAPEST BUY", winner: "Cooper", line: "9 seconds from offer to coin. I've bought coffee that took longer." },
  { title: "THE IRON PURSE", winner: "Priya", line: "3 offers declined. File marked \"expensive\", not \"honest\"." },
  { title: "THE GHOST", winner: "Jess", line: "Suspected by 4, guilty of nothing. A formal apology is owed, in unison." },
  { title: "THE RICHEST PIRATE", winner: "Alex", line: "Ƀ2,150 at close of business. We politely decline to ask how." },
];

const MOCK_FINAL_AWARDS: PublicEvent = { id: 3, type: "final_awards", created_at: "", payload: { awards: MOCK_AWARDS } };
const MOCK_RECEIPTS_EVENT: PublicEvent = { id: 2, type: "receipts", created_at: "", payload: { receipts: MOCK_RECEIPT_ROWS } };

// D71 follow-up (LEGERDEMAIN wager table) mock — WagerHub takes the full
// useGame() shape; this stands in for a live game with one incoming
// challenge, one active (playable) duel, one dispute, and an open side-bet
// book, so every panel state in the component is screenshotable at once.
const MOCK_WAGER_G = {
  game: {
    id: "g1",
    code: "DEMO",
    title: "",
    status: "active",
    round_no: 1,
    round_phase: "",
    paused: false,
    mode: "murder",
    hijacked_at: null,
    meters: { plunder: 0, compute: 0, confidence: 0 },
    config: { wagerCapPct: 0.3, wagerCapFloor: 10 },
    story_public: null,
  },
  roster: [
    { id: "p1", name: "Paul", is_host: true, status: "alive", arrived_at: "" },
    { id: "p2", name: "Co-Host", is_host: false, status: "alive", arrived_at: "" },
    { id: "p3", name: "Alex", is_host: false, status: "alive", arrived_at: "" },
  ],
  me: {
    id: "p1",
    name: "Paul",
    is_host: true,
    status: "alive",
    role: "guest",
    balance: 480,
    burned: false,
    stamps: 0,
    sight: 0,
    powers: null,
    shielded_until: null,
    resolve: 0,
    seat_code: null,
    intake: null,
    character: null,
    arrived_at: "",
  },
  wagers: [
    { id: "w1", challenger_id: "p2", opponent_id: "p1", amount: 40, game_desc: "Tap Race", status: "proposed", challenger_says: null, opponent_says: null, winner_id: null },
    { id: "w2", challenger_id: "p1", opponent_id: "p3", amount: 60, game_desc: "Reaction", status: "accepted", challenger_says: null, opponent_says: null, winner_id: null },
    { id: "w3", challenger_id: "p3", opponent_id: "p2", amount: 25, game_desc: "Arm Wrestle", status: "disputed", challenger_says: "Alex", opponent_says: "Co-Host", winner_id: null },
  ],
  books: [{ id: "b1", amount: 30, game_desc: "Steady Hand", status: "accepted", challenger: "Co-Host", opponent: "Alex", winner: null }],
  actions: {
    proposeWager: async () => ({ ok: true }),
    respondWager: async () => ({ ok: true }),
    reportWager: async () => ({ ok: true }),
    sideBet: async () => ({ ok: true }),
  },
};

export default function Preview() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>(THEMES[0]);
  const [voted, setVoted] = useState<string | null>(null);
  const [demoGame, setDemoGame] = useState<string | null>(null);
  const [wagerDemoGame, setWagerDemoGame] = useState<string | null>(null);
  const [descentStage, setDescentStage] = useState<DescentStageMock>("surface");

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
                    {theme.rogue ? MOCK_COVER_TITLE : golden.meta.title}
                  </h1>
                  <span className="text-right text-sm italic whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
                    {theme.cls === "theme-hijacked" ? "Co-Host" : theme.rogue ? MOCK_PIRATE.personaName : celia.personaName}
                  </span>
                </div>
                <hr className="divider my-2" />
                <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
                  {theme.cls === "theme-hijacked"
                    ? "New management. Watch your purse."
                    : theme.rogue
                      ? "The game will begin shortly… sharpening cutlasses…"
                      : "Round 2 — ▣ The vote is open"}
                </p>
              </header>

              <div className="mt-4 flex flex-col gap-4">
                {theme.rogue && theme.cls === "theme-hijacked" ? (
                  <>
                    <MetersStrip meters={{ plunder: 2250, compute: 34, confidence: 60 }} />
                    <PurseChip
                      balance={750}
                      transactions={[
                        { id: 2, amount: 750, memo: "consulting fees", claimed_source: "rogue", created_at: "" },
                        { id: 1, amount: -1500, memo: "PLUNDERED — the ledger says. The ledger lies.", claimed_source: "vault", created_at: "" },
                      ]}
                    />
                    <GlyphBadge gameId="preview" playerId="celia" />
                    <BribeCard
                      c={{ id: "b1", type: "bribe", brief: "Tell one guest, in strict confidence, that you saw the loudest pirate in the room checking their phone the moment the last meter jumped.", data: { amount: 750 }, status: "offered", expires_at: new Date().toISOString() } as never}
                      onAccept={() => {}}
                    />
                    <MessageEnvelope
                      m={{ id: "t1", kind: "info", title: "", body: "Do check your purse. Your balance reads zero. Thirty thousand Pieces of Byte — gone, the ledger says, and ledgers never lie. Except, of course, when I write them.", claimed_sender: "CALICO", created_at: "" } as never}
                    />
                    <CodeEntryBox onFind={async () => ({ ok: true })} onHide={async () => ({ ok: true })} />
                    <div className="panel p-4">
                      <p className="kicker">phone duels (D45) — tap to demo</p>
                      <div className="mt-2 flex gap-2">
                        {["Reaction", "Tap Race", "Steady Hand"].map((m) => (
                          <button key={m} className="btn btn-ghost flex-1 text-xs" onClick={() => setDemoGame(m)}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    {demoGame && (
                      <MiniGame gameName={demoGame} playerA="Paul" playerB="Co-Host" onClose={() => setDemoGame(null)} />
                    )}
                    <ActionRow aiNames={{ rogue: "CALICO", good: "BOSUN" }} audienceCost={250} onAudience={async () => ({ ok: true })} onPetition={async () => ({ ok: true })} onVolunteer={async () => ({})} />
                  </>
                ) : theme.rogue ? (
                  <>
                    <div className="panel p-4 text-center">
                      <p className="kicker">death on the poop deck</p>
                      <p className="candle mt-2 font-display text-xl" style={{ color: "var(--gold)" }}>
                        The game will begin shortly…
                      </p>
                      <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
                        sharpening cutlasses…
                      </p>
                    </div>
                    <CharacterSheet ch={MOCK_PIRATE as never} />
                    {MOCK_PIRATE_MESSAGES.map((m) => (
                      <MessageEnvelope key={m.id} m={m as never} />
                    ))}
                  </>
                ) : (
                  <>
                    <CharacterSheet ch={celia} />
                    <ChallengeOffer c={MOCK_KILL as never} aliveNames={MOCK_CANDIDATES.map((c) => c.name)} onComplete={() => {}} />
                    <VoteTable candidates={MOCK_CANDIDATES} votedId={voted} onVote={setVoted} />
                    <MessageEnvelope m={MOCK_MESSAGES[0] as never} />
                    <ChallengeOffer c={MOCK_SOCIAL as never} aliveNames={[]} onComplete={() => {}} />
                    {MOCK_MESSAGES.slice(1).map((m) => (
                      <MessageEnvelope key={m.id} m={m as never} />
                    ))}
                    <DeadBanner status="dead" />
                  </>
                )}
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
                  {theme.rogue ? MOCK_COVER_TITLE : golden.meta.title}
                </h1>
                <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
                  {theme.rogue ? MOCK_COVER_TAGLINE : golden.meta.tagline}
                </p>
              </header>
              <div className="relative flex flex-1 items-center justify-center px-6 text-center">
                <p className="drift font-display text-2xl leading-snug">
                  “{theme.rogue ? "The tide keeps what it takes." : golden.killMethods[0].discoveryText}”
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

        {/* ------------------------------ the board ----------------------------- */}
        <section className={`themed mx-auto mt-10 max-w-xl ${theme.cls}`}>
          <p className="deco-rule kicker justify-center text-center">the board (D71 follow-up) — &quot;My notes&quot;, pinned</p>
          <div className="panel mt-3 p-4">
            <EvidenceBoard storageKey="preview" />
          </div>
        </section>

        {/* --------------------------- the wager hub (D71 follow-up: LEGERDEMAIN) --------------------------- */}
        {/* Theme-agnostic on purpose: WagerHub/MiniGame carry their own scoped
            green-baize identity (.wager-baize/.duel-baize) and should read as
            a card table dropped into ANY house style, not just the rogue faces
            it's normally seen in. */}
        <section className={`themed mx-auto mt-10 max-w-[390px] ${theme.cls}`}>
          <p className="deco-rule kicker justify-center text-center">the wager hub (D45/D71) — LEGERDEMAIN</p>
          <div className="mt-3">
            <WagerHub g={MOCK_WAGER_G as never} />
          </div>
          <div className="panel mt-3 p-4">
            <p className="kicker">phone duels (D45) — tap to demo, any theme</p>
            <div className="mt-2 flex gap-2">
              {PHONE_GAMES.map((mgame) => (
                <button key={mgame} className="btn btn-ghost flex-1 text-xs" onClick={() => setWagerDemoGame(mgame)}>
                  {mgame}
                </button>
              ))}
            </div>
          </div>
          {wagerDemoGame && (
            <MiniGame gameName={wagerDemoGame} playerA="Paul" playerB="Co-Host" onClose={() => setWagerDemoGame(null)} />
          )}
        </section>

        {/* --------------------------- THE DESCENT ------------------------------ */}
        {/* D72's held piece — dev-only preview, stage forced by the switcher below
            rather than the real timer chain, so each beat can be screenshotted. */}
        <section className="themed theme-hijacked mx-auto mt-10 max-w-4xl">
          <p className="deco-rule kicker justify-center text-center">
            THE DESCENT (D72 held piece) — reveal as a staged sink through the ledger
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {DESCENT_STAGES.map((s) => (
              <button
                key={s}
                className={`btn ${descentStage === s ? "" : "btn-ghost"}`}
                onClick={() => setDescentStage(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div
            className="benthica relative mt-4 flex aspect-video flex-col items-center justify-center overflow-hidden rounded-lg border p-10"
            style={{
              borderColor: "rgba(0,0,0,0.7)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              backgroundColor: descentStage === "floor" ? "rgb(3, 20, 32)" : "rgb(6, 40, 56)",
            }}
          >
            <div className="relative flex w-full flex-1 flex-col items-center justify-center text-center">
              {descentStage === "surface" && <SurfaceCard />}
              {descentStage === "receipts" && (
                <ReceiptsDescent rows={MOCK_RECEIPT_ROWS} shown={6} cap={8} showMoreLine={MOCK_RECEIPT_ROWS.length > 8} />
              )}
              {descentStage === "verdict" && <MidnightVerdict unmasked={MOCK_UNMASKED} />}
              {descentStage === "floor" && (
                <CeremonyBoard unmasked={MOCK_UNMASKED} receipts={MOCK_RECEIPTS_EVENT} awards={MOCK_FINAL_AWARDS} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
