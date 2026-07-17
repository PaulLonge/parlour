"use client";

// D45: the wager hub — throw down, accept, report, side-bet. The phone is the
// bookie; the games are played in the flesh (or pass-and-play for phone duels).

import { useMemo, useState } from "react";
import type { useGame, Wager } from "./useGame";
import { MiniGame, PHONE_GAMES } from "./minigames";
import pubGames from "@/content/pub-games.json";

const DUEL_PRESETS = [
  ...pubGames.games.filter((g) => g.type === "duel" || g.type === "phone-duel").map((g) => g.name),
  "Custom…",
];

// D71 follow-up (LEGERDEMAIN anchor): the wager hub is its own green-baize
// world wherever it's dropped — a small stack of card-stock chips standing
// in for a stake, tiny local ornament adapted from app/briefing/page.tsx's
// ChipStack. Purely decorative (aria-hidden); tier count only, no new data.
function Chips({ amount, cap }: { amount: number; cap: number }) {
  const n = Math.max(1, Math.min(4, Math.ceil((Math.max(0, amount) / Math.max(1, cap)) * 4)));
  return (
    <span className="wb-chips" aria-hidden="true">
      {Array.from({ length: n }, (_, idx) => (
        <span className="wb-chip" key={idx} style={{ "--n": idx } as React.CSSProperties}>
          ◎
        </span>
      ))}
    </span>
  );
}

export function WagerHub({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState<Wager | null>(null);

  const nameOf = (id: string) => g.roster.find((p) => p.id === id)?.name ?? "?";
  const incoming = g.wagers.filter((w) => w.status === "proposed" && w.opponent_id === me.id);
  const outgoing = g.wagers.filter((w) => w.status === "proposed" && w.challenger_id === me.id);
  const active = g.wagers.filter((w) => w.status === "accepted");
  const disputed = g.wagers.filter((w) => w.status === "disputed");
  const openBooks = g.books.filter((b) => b.challenger !== me.name && b.opponent !== me.name);

  const cfg = g.game!.config as { wagerCapPct?: number; wagerCapFloor?: number };
  const cap = Math.max(Number(cfg.wagerCapFloor ?? 10), Math.floor(me.balance * Number(cfg.wagerCapPct ?? 0.3)));

  return (
    <div className="wager-baize">
      {/* D71 follow-up: LEGERDEMAIN identity, scoped to this component only.
          Redefining the house theme's own custom properties (--panel, --accent,
          --gold, --ink…) inside .wager-baize means every themed child below —
          .panel, .btn, .kicker, .input, plus every inline var(--gold)/
          var(--danger) style already in this file — repaints as the card table
          automatically, in any surrounding theme, with zero selector overrides. */}
      <style>{`
        .wager-baize {
          --wb-baize: #0c382b;
          --wb-baize-hi: #11473a;
          --wb-baize-sh: #07271e;
          --wb-stock: #f6f1e2;
          --wb-ink: #1a1418;
          --wb-carmine: #b62c35;
          --wb-gilt: #c8a45e;
          --wb-gilt-d: #a6823f;
          --wb-gilt-ink: #7e6128;

          --panel: color-mix(in srgb, var(--wb-baize-hi) 78%, transparent);
          --panel-solid: var(--wb-baize-hi);
          --border: color-mix(in srgb, var(--wb-gilt) 32%, transparent);
          --border-strong: color-mix(in srgb, var(--wb-gilt) 62%, transparent);
          --accent: var(--wb-gilt);
          --accent-ink: var(--wb-ink);
          --danger: var(--wb-carmine);
          --ink: var(--wb-stock);
          --ink-dim: color-mix(in srgb, var(--wb-stock) 70%, transparent);
          --gold: var(--wb-gilt);
          --font-body: Georgia, "Times New Roman", serif;
          --radius: 0.7rem;
          --btn-radius: 5px;

          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-radius: 14px;
          padding: 0.9rem;
          background:
            radial-gradient(130% 80% at 50% -12%, var(--wb-baize-hi) 0%, transparent 58%),
            radial-gradient(150% 90% at 50% 112%, var(--wb-baize-sh) 0%, transparent 55%),
            var(--wb-baize);
          color: var(--wb-stock);
          font-family: Georgia, "Times New Roman", serif;
          animation: wb-deal 0.35s ease both;
        }
        @keyframes wb-deal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wager-baize { animation: none !important; }
        }

        .wager-baize .wb-felt {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.24;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .07 0 0 0 0 .16 0 0 0 0 .12 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .wager-baize .wb-frame { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
        .wager-baize .wb-frame::before,
        .wager-baize .wb-frame::after {
          content: ""; position: absolute; border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--wb-gilt) 50%, transparent);
        }
        .wager-baize .wb-frame::before { inset: 6px; }
        .wager-baize .wb-frame::after { inset: 10px; border-radius: 9px; border-color: color-mix(in srgb, var(--wb-gilt) 24%, transparent); }

        .wager-baize .wb-inner { position: relative; z-index: 2; }

        .wager-baize .kicker { color: var(--wb-gilt); }
        .wager-baize .input {
          background: color-mix(in srgb, var(--wb-stock) 92%, transparent);
          color: var(--wb-ink);
          border-color: var(--border);
        }
        .wager-baize .input::placeholder { color: color-mix(in srgb, var(--wb-ink) 55%, transparent); }

        .wager-baize .wb-chips { display: inline-flex; align-items: center; margin-left: 0.45em; vertical-align: middle; }
        .wager-baize .wb-chip {
          --n: 0;
          width: 1.05rem; height: 1.05rem; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.58rem; line-height: 1;
          color: var(--wb-gilt-ink);
          background: repeating-conic-gradient(var(--wb-stock) 0deg 20deg, #ede5cf 20deg 40deg);
          border: 1.5px solid var(--wb-gilt-d);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          margin-left: -0.38rem;
          transform: translateY(calc(var(--n) * -0.11rem));
        }
        .wager-baize .wb-chip:first-child { margin-left: 0; }
      `}</style>
      <div className="wb-felt" aria-hidden="true" />
      <div className="wb-frame" aria-hidden="true" />
      <div className="wb-inner flex flex-col gap-3">
      {playing && (
        <MiniGame
          gameName={playing.game_desc}
          playerA={nameOf(playing.challenger_id)}
          playerB={nameOf(playing.opponent_id)}
          onClose={() => setPlaying(null)}
        />
      )}

      <ProposeCard g={g} cap={cap} busy={busy} setBusy={setBusy} setNote={setNote} />

      {incoming.map((w) => (
        <div key={w.id} className="panel pulse-danger p-4" style={{ borderColor: "var(--gold)" }}>
          <p className="kicker">🎲 you've been challenged</p>
          <p className="mt-1">
            <b>{nameOf(w.challenger_id)}</b> — {w.game_desc} — for <b>◎{w.amount}</b>
            <Chips amount={w.amount} cap={cap} />
          </p>
          <p className="mt-1 text-xs italic" style={{ color: "var(--ink-dim)" }}>
            Accepting escrows both stakes with the machine. No welching possible.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn flex-1"
              disabled={busy || me.balance < w.amount}
              onClick={async () => {
                setBusy(true);
                const r = await g.actions.respondWager(w.id, true);
                setNote(r.ok ? "" : (r.result ?? r.error ?? "no"));
                setBusy(false);
              }}
            >
              {me.balance < w.amount ? "can't cover it" : "Accept"}
            </button>
            <button
              className="btn btn-ghost flex-1"
              aria-label={`decline ${nameOf(w.challenger_id)}'s challenge`}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await g.actions.respondWager(w.id, false);
                  if (!r.ok) setNote(r.result ?? r.error ?? "the house lost that — try again");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {active.map((w) => {
        const iSaid = w.challenger_id === me.id ? w.challenger_says : w.opponent_says;
        const isPhoneGame = PHONE_GAMES.some((p) => w.game_desc.toLowerCase().includes(p.toLowerCase()));
        return (
          <div key={w.id} className="panel p-4">
            <p className="kicker">
              ⚔ in play — {w.game_desc} for ◎{w.amount} each
              <Chips amount={w.amount} cap={cap} />
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
              {nameOf(w.challenger_id)} vs {nameOf(w.opponent_id)} — play it out, then BOTH report the winner.
            </p>
            {isPhoneGame && (
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPlaying(w)}>
                ▶ Play here (pass this phone)
              </button>
            )}
            {iSaid ? (
              <p className="mt-2 text-sm italic" style={{ color: "var(--gold)" }}>
                Your account is in. Awaiting the other side.
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                {[w.challenger_id, w.opponent_id].map((pid) => (
                  <button
                    key={pid}
                    className="btn btn-ghost flex-1"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const r = await g.actions.reportWager(w.id, nameOf(pid));
                      setNote(r.ok ? "" : (r.result ?? "no"));
                      setBusy(false);
                    }}
                  >
                    {nameOf(pid)} won
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {disputed.map((w) => (
        <div key={w.id} className="panel p-4" style={{ borderColor: "var(--danger)" }}>
          <p className="kicker kicker-danger">⚖ disputed — {w.game_desc}</p>
          <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            Two testimonies, one lie. The machine will rule. It enjoys this part.
          </p>
        </div>
      ))}

      {outgoing.length > 0 && (
        <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
          Thrown down: {outgoing.map((w) => `${nameOf(w.opponent_id)} (◎${w.amount})`).join(", ")} — awaiting nerve.
        </p>
      )}

      {openBooks.length > 0 && <SideBetCard g={g} books={openBooks} cap={cap} busy={busy} setBusy={setBusy} setNote={setNote} />}

      {note && (
        <p className="text-sm" role="status" aria-live="polite" style={{ color: "var(--danger)" }}>
          {note === "book_closed" ? "Too slow — that duel just settled." : note.replaceAll("_", " ")}
        </p>
      )}
      </div>
    </div>
  );
}

function ProposeCard({
  g,
  cap,
  busy,
  setBusy,
  setNote,
}: {
  g: ReturnType<typeof useGame>;
  cap: number;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [amountStr, setAmountStr] = useState("20"); // raw string — clamping onChange fights mobile editing (review UX#3)
  const [game, setGame] = useState(DUEL_PRESETS[0]);
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState("");
  const others = useMemo(
    () => g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id),
    [g.roster, g.me]
  );

  if (!open)
    return (
      <div>
        <button className="btn w-full" onClick={() => { setOpen(true); setSent(""); }}>
          🎲 Challenge someone · up to ◎{cap}
          <Chips amount={cap} cap={cap} />
        </button>
        {sent && (
          <p className="mt-1 text-center text-sm" role="status" style={{ color: "var(--gold)" }}>
            {sent}
          </p>
        )}
      </div>
    );

  const gameDesc = game === "Custom…" ? custom : game;
  const amount = Math.max(1, Math.min(cap, Number(amountStr) || 0)); // clamp at submit, not per-keystroke
  return (
    <div className="panel panel-hero p-4">
      <p className="kicker">throw down</p>
      <select className="input mt-2" aria-label="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)}>
        <option value="">Against whom?</option>
        {others.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <select className="input mt-2" aria-label="the game" value={game} onChange={(e) => setGame(e.target.value)}>
        {DUEL_PRESETS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      {game === "Custom…" && (
        <input className="input mt-2" aria-label="custom game" placeholder="name your game (write-ins welcome)" value={custom} onChange={(e) => setCustom(e.target.value)} />
      )}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input"
          aria-label="stake"
          min={1}
          max={cap}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
          cap ◎{cap}
        </span>
        <Chips amount={amount} cap={cap} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn flex-1"
          disabled={busy || !opponent || !gameDesc.trim() || !(Number(amountStr) > 0)}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await g.actions.proposeWager(opponent, amount, gameDesc.trim());
              if (r.ok) {
                setSent(`Thrown down at ${opponent} — ◎${amount}, awaiting nerve.`); // success receipt (review UX#8)
                setNote("");
                setOpen(false);
              } else {
                setNote(
                  r.result === "already_thrown_down"
                    ? `You already have a challenge waiting on ${opponent}.`
                    : (r.result ?? r.error ?? "no")
                );
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          Send it
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>
          Never mind
        </button>
      </div>
    </div>
  );
}

function SideBetCard({
  g,
  books,
  cap,
  busy,
  setBusy,
  setNote,
}: {
  g: ReturnType<typeof useGame>;
  books: ReturnType<typeof useGame>["books"];
  cap: number;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  return (
    <div className="panel p-4">
      <p className="kicker">📖 the book is open — back a side; winners split the losers' pool (house takes a cut)</p>
      <div className="mt-2 flex flex-col gap-3">
        {books.map((b) => (
          <div key={b.id} className="text-sm">
            <p>
              {b.challenger} vs {b.opponent} — {b.game_desc} (◎{b.amount} each)
              <Chips amount={b.amount} cap={cap} />
            </p>
            <div className="mt-1 flex items-center gap-2">
              {[b.challenger, b.opponent].map((name) => (
                <button
                  key={name}
                  className="btn btn-ghost flex-1 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await g.actions.sideBet(b.id, name, amounts[b.id] || 10);
                    setNote(r.ok ? "" : (r.result ?? "no"));
                    setBusy(false);
                  }}
                >
                  back {name}
                </button>
              ))}
              <input
                type="number"
                className="input !w-20"
                aria-label="side bet amount"
                min={1}
                max={cap}
                value={amounts[b.id] || 10}
                onChange={(e) => setAmounts({ ...amounts, [b.id]: Math.max(1, Math.min(cap, Number(e.target.value) || 0)) })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
