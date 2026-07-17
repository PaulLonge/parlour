"use client";

// MOCK — direction two: THE DECK. Jackbox-style tap-through onboarding: one
// idea per full-screen card, giant type, dealt to you in under a minute.
// Guest-safe content only.

import { useState } from "react";

const CARDS: {
  kicker: string;
  title: string;
  body: string;
  shot?: { file: string; w: number; h: number; alt: string };
}[] = [
  {
    kicker: "the deal",
    title: "Your phone is your seat.",
    body: "No installs. No accounts. A web address and your name — that's the whole ticket.",
    shot: { file: "01-landing.png", w: 390, h: 844, alt: "The PARLOUR landing screen" },
  },
  {
    kicker: "getting in",
    title: "Tap your own name.",
    body: "You'll be handed four letters at the door. Enter them, find yourself on the guest list, sit down.",
    shot: { file: "03-join-screen.png", w: 390, h: 844, alt: "The guest list join screen" },
  },
  {
    kicker: "the post",
    title: "Your letters are sealed.",
    body: "Private mail lands in your Inbox. Nobody else can read it. Act accordingly.",
    shot: { file: "08-inbox-letter.png", w: 390, h: 844, alt: "A sealed letter in the Inbox" },
  },
  {
    kicker: "the table",
    title: "Votes happen in-app.",
    body: "When the room must decide, the table comes to your phone. Change your mind until time is called.",
    shot: { file: "21-vote-table.png", w: 350, h: 236, alt: "The vote table" },
  },
  {
    kicker: "the big screen",
    title: "A TV, if there is one.",
    body: "A spare screen can wear the house's face — codes, announcements, the finale. The game never needs it.",
    shot: { file: "06-tv-lobby.png", w: 1920, h: 1080, alt: "The house channel on a TV" },
  },
  {
    kicker: "always",
    title: "The door is never locked.",
    body: "Hold the small ◦ button and the night eases off you. Private, instant, always okay.",
  },
];

export default function DeckMock() {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  return (
    <div className="themed theme-manor deck min-h-dvh">
      <style>{`
        .deck { overflow: hidden; background:
          radial-gradient(100% 60% at 50% 110%, color-mix(in srgb, var(--gold) 9%, transparent), transparent 65%),
          var(--bg); }
        .deck .watermark {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: min(70vh, 34rem); line-height: 1;
          color: color-mix(in srgb, var(--gold) 6%, transparent); pointer-events: none; user-select: none;
        }
        .deck .card-in { animation: deal 0.3s ease both; }
        @keyframes deal { from { opacity: 0; transform: translateY(14px) rotate(-0.4deg); } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .deck .card-in { animation: none; } }
        .deck .dot { width: 7px; height: 7px; border-radius: 999px; background: var(--border); transition: background .2s, transform .2s; }
        .deck .dot[data-on="true"] { background: var(--gold); transform: scale(1.3); }
        .deck .shotframe { border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
          box-shadow: 0 18px 40px -20px rgba(0,0,0,0.9); }
      `}</style>

      <main
        className="relative flex min-h-dvh cursor-pointer flex-col"
        onClick={() => setI((n) => (n + 1) % CARDS.length)}
        role="button"
        aria-label="next card"
      >
        <span className="watermark">{i + 1}</span>

        <header className="flex items-center justify-between p-5">
          <button
            className="btn-ghost btn px-3 py-1 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              setI((n) => Math.max(0, n - 1));
            }}
            aria-label="previous card"
          >
            ‹
          </button>
          <p className="kicker">
            how tonight works · {i + 1} / {CARDS.length}
          </p>
          <span className="w-9" />
        </header>

        <section key={i} className="card-in relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-7 pb-6 text-center">
          <p className="kicker-danger" style={{ color: "var(--gold)" }}>
            {card.kicker}
          </p>
          <h1 className="font-display max-w-md text-[2.6rem] leading-[1.05]" style={{ color: "var(--gold)" }}>
            {card.title}
          </h1>
          <p className="max-w-sm text-base leading-6" style={{ color: "var(--ink-dim)" }}>
            {card.body}
          </p>
          {card.shot && (
            <div
              className="shotframe mt-1"
              style={{ maxWidth: card.shot.w > 1000 ? "340px" : "200px", maxHeight: "34dvh" }}
            >
              <img
                src={`/guide/${card.shot.file}`}
                alt={card.shot.alt}
                width={card.shot.w}
                height={card.shot.h}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
          )}
        </section>

        <footer className="relative z-10 flex flex-col items-center gap-3 pb-8">
          <div className="flex gap-2">
            {CARDS.map((_, n) => (
              <span key={n} className="dot" data-on={n === i} />
            ))}
          </div>
          <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
            {last ? "tap to start over — mockup ends here" : "tap anywhere to continue"}
          </p>
        </footer>
      </main>
    </div>
  );
}
