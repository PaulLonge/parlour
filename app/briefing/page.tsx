"use client";

// THE PUB BRIEFING — guest-shareable, tap-through card deck teaching night
// one (THE FIELD TRIAL). Format anchor: app/guide/mocks/cards/page.tsx (one
// idea per full-screen card, tap to advance, progress dots, watermark
// numeral, back button). Visual identity anchor: The Gallery's "legerdemain"
// room (MIT, guywithtwocats.github.io/TheGallery) — deep green baize, a gold
// double-border table frame, Didone-leaning display type, fanned cards and
// stacked chips built from CSS only. Standalone: no links into host surfaces
// (/new, /guide, /bible, /preview) — this page is handed to guests as-is.
//
// Guest-safe content only (D44/D45/D45a/D51 + content/pub-story.json): the
// machine is openly running the pub floor tonight, no persona, no twist to
// protect. Never mention the hijack, the Long Con, night two, CALICO/BOSUN,
// minions, or "front man" — the pub story's own word is "collaborator".

import { useState } from "react";

type Shot = { file: string; w: number; h: number; alt: string };
type Ornament = "fan" | "chips" | "none";

type Card = {
  kicker: string;
  title: string;
  body: string;
  shot?: Shot;
  ornament?: Ornament;
};

const CARDS: Card[] = [
  {
    kicker: "the field trial",
    title: "Run by a machine, in the open.",
    body: "Somewhere at this table tonight, an artificial intelligence has hired the room for a night of tests. There is money on it. It isn't the machine's. Your phone is your seat — no installs, no accounts, nothing to download.",
    shot: { file: "01-landing.png", w: 390, h: 844, alt: "The PARLOUR landing screen" },
  },
  {
    kicker: "getting in",
    title: "Tap your own name.",
    body: "A word at the table gets you through the door. Find yourself on the list, tap once, sit down — the stake is issued the moment you're seated.",
    shot: { file: "03-join-screen.png", w: 390, h: 844, alt: "The guest list join screen" },
  },
  {
    kicker: "the stipend",
    title: "◎500, issued on arrival.",
    body: "A research stipend. Spend it however you like, the machine says, and means it. Every line of your ledger is watched — it finds that part beautiful.",
    ornament: "chips",
  },
  {
    kicker: "wagers",
    title: "Challenge anyone at the table.",
    body: "Name your stakes; the machine holds them in escrow. Both sides report the winner — disagree, and it arbitrates. Bring it a good dispute; it enjoys those. The house keeps a cut, whoever wins.",
    // no screenshot: the only captured offer card is a murder-mode kill offer —
    // wrong mechanic for wagers and not for guest eyes (orchestrator swap)
    ornament: "chips",
  },
  {
    kicker: "phone duels",
    title: "One phone, two thumbs.",
    body: "Reaction, tap-race, steady hand — small games passed hand to hand on a single agreed device. Nothing to sync; the machine only needs the result.",
    ornament: "fan",
  },
  {
    kicker: "side bets",
    title: "Back someone else's nerve.",
    body: "Not fighting? Back someone who is. Every losing backer's stake funds the winners, less the house's cut — the machine calls this pari-mutuel and clearly enjoys saying so.",
    ornament: "chips",
  },
  {
    kicker: "missions & dares",
    title: "Honest work, paid honestly.",
    body: "Small jobs land on your phone through the evening — dares, favours, a quiz or two about the guest of honour. Do them properly and the machine pays out. No haggling.",
    ornament: "fan",
  },
  {
    kicker: "paper",
    title: "Some words travel by hand.",
    body: "A code rides on a slip tonight — spoken, passed palm to palm, propped under a glass. Nothing here is hidden; it's just being carried. Find one, type it in, and see what it's worth.",
    shot: { file: "21-code-entry.png", w: 350, h: 193, alt: "A code being typed in on a phone" },
  },
  {
    kicker: "winning",
    title: "Richest purse, last orders.",
    body: "When the books close, the fullest purse takes the title. One more line, free of charge: the machine has help in the room tonight. Watch for it.",
    // no screenshot: the meters capture wears night-two's hijacked face and
    // "THE ROGUE'S GRIP" vocabulary — not for a guest-shareable page
    // (orchestrator swap)
    ornament: "fan",
  },
  {
    kicker: "the way out",
    title: "Hold the small ◦, always.",
    body: "Anytime tonight, no explanation owed, hold the small ◦ and the game eases off you. Private, instant, always okay.",
    ornament: "none",
  },
];

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "K", "Q", "7", "J"] as const;

function CardFan({ seed }: { seed: number }) {
  const cards = [-16, -8, 0, 8, 16].map((deg, idx) => ({
    deg,
    suit: SUITS[(seed + idx) % SUITS.length],
    rank: RANKS[(seed + idx * 2) % RANKS.length],
    red: (seed + idx) % SUITS.length < 2,
  }));
  return (
    <div className="fan" aria-hidden="true">
      {cards.map((c, idx) => (
        <div
          className="fan-card"
          key={idx}
          style={{ "--t": `${c.deg}deg`, "--y": `${Math.abs(c.deg) * 0.14}px`, "--z": idx } as React.CSSProperties}
        >
          <span className="fan-pip" data-red={c.red}>
            {c.rank}
            <br />
            {c.suit}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChipStack() {
  return (
    <div className="chips" aria-hidden="true">
      {[0, 1, 2, 3].map((n) => (
        <span className="chip" key={n} style={{ "--n": n } as React.CSSProperties}>
          ◎
        </span>
      ))}
    </div>
  );
}

export default function PubBriefing() {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  const next = () => setI((n) => (n + 1) % CARDS.length);
  const prev = () => setI((n) => Math.max(0, n - 1));

  return (
    <div className="briefing min-h-dvh">
      <style>{`
        .briefing {
          --baize: #0c382b;
          --baize-hi: #11473a;
          --baize-sh: #07271e;
          --stock: #f6f1e2;
          --ink: #1a1418;
          --carmine: #b62c35;
          --carmine-hi: #d4525c;
          --gilt: #c8a45e;
          --gilt-d: #a6823f;
          --gilt-ink: #7e6128;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(120% 70% at 50% -4%, var(--baize-hi) 0%, transparent 58%),
            radial-gradient(140% 90% at 50% 108%, var(--baize-sh) 0%, transparent 55%),
            var(--baize);
          color: var(--stock);
          font-family: Georgia, "Times New Roman", serif;
        }
        .briefing::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.28;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .07 0 0 0 0 .16 0 0 0 0 .12 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .briefing .frame { position: fixed; inset: 0; z-index: 40; pointer-events: none; }
        .briefing .frame::before,
        .briefing .frame::after {
          content: "";
          position: absolute;
          border: 1px solid color-mix(in srgb, var(--gilt) 55%, transparent);
        }
        .briefing .frame::before { inset: 8px; }
        .briefing .frame::after { inset: 13px; border-color: color-mix(in srgb, var(--gilt) 26%, transparent); }

        .briefing .watermark {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: min(64vh, 30rem); line-height: 1;
          color: color-mix(in srgb, var(--gilt) 9%, transparent); pointer-events: none; user-select: none;
        }

        .briefing .topbar {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem 1.1rem 0.6rem;
        }
        .briefing .navbtn {
          font-family: "Jost", "Futura", "Avenir Next", sans-serif;
          font-size: 0.85rem;
          background: transparent;
          color: var(--gilt);
          border: 1px solid color-mix(in srgb, var(--gilt) 45%, transparent);
          border-radius: 3px;
          width: 2.1rem; height: 2.1rem;
          line-height: 1;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .briefing .navbtn:hover { border-color: var(--gilt); background: color-mix(in srgb, var(--gilt) 10%, transparent); }
        .briefing .navbtn:disabled { opacity: 0.28; cursor: default; }
        .briefing .spacer { width: 2.1rem; }

        .briefing .eyebrow {
          font-family: "Jost", "Futura", "Avenir Next", sans-serif;
          font-size: 0.66rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--stock) 75%, transparent);
          text-align: center;
        }
        .briefing .eyebrow::before,
        .briefing .eyebrow::after {
          content: "—";
          color: color-mix(in srgb, var(--gilt) 55%, transparent);
          margin: 0 0.6em;
        }

        .briefing .kicker-gold {
          font-family: "Jost", "Futura", "Avenir Next", sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--gilt);
        }
        .briefing .kicker-gold::before,
        .briefing .kicker-gold::after {
          content: "—";
          color: color-mix(in srgb, var(--gilt) 45%, transparent);
          margin: 0 0.65em;
        }

        .briefing .card-in { animation: deal 0.32s ease both; }
        @keyframes deal { from { opacity: 0; transform: translateY(14px) rotate(-0.4deg); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .briefing .card-in { animation: none; }
          .briefing .fan-card { transition: none !important; }
        }

        .briefing .title {
          font-family: var(--font-display), "Bodoni Moda", "Didot", Georgia, serif;
          font-weight: 560;
          font-size: clamp(1.9rem, 7.5vw, 2.7rem);
          line-height: 1.08;
          color: var(--stock);
          max-width: 22rem;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35), 0 12px 30px rgba(0, 0, 0, 0.35);
        }
        .briefing .body {
          max-width: 25rem;
          font-size: 1.02rem;
          line-height: 1.55;
          color: color-mix(in srgb, var(--stock) 84%, transparent);
        }

        .briefing .shotframe {
          border: 1px solid color-mix(in srgb, var(--gilt) 45%, transparent);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3), 0 20px 44px -18px rgba(0, 0, 0, 0.7);
        }

        .briefing .fan {
          display: flex;
          justify-content: center;
          height: 4.6rem;
          margin: 0.2rem 0 0.3rem;
        }
        .briefing .fan-card {
          --z: 0;
          width: 3.1rem;
          height: 4.4rem;
          margin: 0 -0.85rem;
          border-radius: 6px;
          background: linear-gradient(170deg, var(--stock), #ede5cf);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 18px -10px rgba(0, 0, 0, 0.55);
          border: 1px solid color-mix(in srgb, var(--gilt-d) 55%, transparent);
          transform: rotate(var(--t)) translateY(var(--y, 0px));
          transform-origin: bottom center;
          z-index: var(--z);
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 0.2rem 0 0 0.28rem;
          transition: transform 0.4s cubic-bezier(0.22, 0.08, 0.18, 1);
        }
        .briefing .fan-pip {
          font-family: var(--font-display), Georgia, serif;
          font-size: 0.62rem;
          line-height: 1.05;
          color: var(--ink);
          text-align: center;
        }
        .briefing .fan-pip[data-red="true"] { color: var(--carmine); }

        .briefing .chips {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          height: 3.6rem;
          margin: 0.2rem 0 0.3rem;
        }
        .briefing .chip {
          --n: 0;
          width: 2.5rem;
          height: 2.5rem;
          margin: 0 -0.55rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          color: var(--gilt-ink);
          background: repeating-conic-gradient(var(--stock) 0deg 20deg, #ede5cf 20deg 40deg);
          border: 2px solid var(--gilt-d);
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.35), 0 10px 16px -10px rgba(0, 0, 0, 0.6);
          transform: translateY(calc(var(--n) * -0.28rem));
        }

        .briefing .dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: color-mix(in srgb, var(--gilt) 30%, transparent);
          transition: background-color 0.2s, transform 0.2s;
        }
        .briefing .dot[data-on="true"] { background: var(--gilt); transform: scale(1.3); }

        .briefing .hint {
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 0.82rem;
          color: color-mix(in srgb, var(--stock) 65%, transparent);
        }

        @media (max-width: 380px) {
          .briefing .fan-card { width: 2.7rem; height: 3.9rem; margin: 0 -0.75rem; }
          .briefing .chip { width: 2.2rem; height: 2.2rem; margin: 0 -0.5rem; }
        }
      `}</style>

      <div className="frame" />

      <main
        className="relative flex min-h-dvh cursor-pointer flex-col"
        onClick={next}
        role="button"
        tabIndex={0}
        aria-label="next card"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            next();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          }
        }}
      >
        <span className="watermark">{i + 1}</span>

        <header className="topbar">
          <button
            className="navbtn"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            disabled={i === 0}
            aria-label="previous card"
          >
            ‹
          </button>
          <p className="eyebrow">
            the field trial · {i + 1} / {CARDS.length}
          </p>
          <span className="spacer" />
        </header>

        <section
          key={i}
          className="card-in relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-7 pb-6 text-center"
        >
          <p className="kicker-gold">{card.kicker}</p>
          <h1 className="title">{card.title}</h1>
          <p className="body">{card.body}</p>

          {card.ornament === "fan" && <CardFan seed={i} />}
          {card.ornament === "chips" && <ChipStack />}

          {card.shot && (
            <div
              className="shotframe mt-1"
              style={{ maxWidth: card.shot.w > 380 ? "210px" : "170px", maxHeight: "30dvh" }}
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
          <p className="hint">{last ? "see you at the table — tap to start again" : "tap anywhere for the next card"}</p>
        </footer>
      </main>
    </div>
  );
}
