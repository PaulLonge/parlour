"use client";

// D45a: one-device phone duels — Reaction, Tap Race, Steady Hand. Agreement
// happens on everyone's own phone; PLAY happens here, pass-and-play. Review
// round 2 fixes: handover interstitials (residual taps must not corrupt the
// next turn), solid overlay + touch containment (no scroll/pull-to-refresh/
// text-selection mid-duel), false-start feedback, pointer capture, an exit ✕,
// and honest randomness.

import { useEffect, useRef, useState } from "react";

export const PHONE_GAMES = ["Reaction", "Tap Race", "Steady Hand"];

type Phase = "intro" | "aTurn" | "handover" | "bTurn" | "result";

export function MiniGame({
  gameName,
  playerA,
  playerB,
  onClose,
}: {
  gameName: string;
  playerA: string;
  playerB: string;
  onClose: () => void;
}) {
  const game = PHONE_GAMES.find((p) => gameName.toLowerCase().includes(p.toLowerCase())) ?? "Reaction";
  const [phase, setPhase] = useState<Phase>("intro");
  const [scoreA, setScoreA] = useState<number | null>(null);
  const [scoreB, setScoreB] = useState<number | null>(null);

  const lowerWins = game === "Reaction"; // lower = better for Reaction only
  const winner =
    scoreA !== null && scoreB !== null
      ? scoreA === scoreB
        ? null
        : (lowerWins ? scoreA < scoreB : scoreA > scoreB)
          ? playerA
          : playerB
      : null;

  const fmt = (s: number | null) =>
    s === null ? "—" : game === "Reaction" ? (s >= 9999 ? "FALSE START" : `${s} ms`) : game === "Tap Race" ? `${s} taps` : `${s} s`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${game} duel`}
      className="duel-baize fixed inset-0 z-50 flex flex-col p-6 text-center select-none"
      style={{
        // background now lives in the scoped stylesheet below — still fully
        // opaque, instructions must not fight the page behind (visual #1)
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* D71 follow-up: LEGERDEMAIN identity for the pass-the-phone duels,
          scoped to this component only. Same trick as WagerHub — redefine the
          house theme's custom properties inside .duel-baize so .kicker/.btn/
          the score readouts (which already use var(--gold)/var(--panel-solid)/
          var(--danger)) repaint as the card table with no gameplay code
          touched. Timings/scoring/handlers below are untouched. */}
      <style>{`
        .duel-baize {
          --db-baize: #0a2f24;
          --db-baize-hi: #123f32;
          --db-baize-sh: #061e17;
          --db-stock: #f6f1e2;
          --db-ink: #1a1418;
          --db-carmine: #b62c35;
          --db-gilt: #c8a45e;
          --db-gilt-d: #a6823f;

          --panel-solid: color-mix(in srgb, var(--db-baize-hi) 92%, black 4%);
          --border-strong: color-mix(in srgb, var(--db-gilt) 62%, transparent);
          --accent: var(--db-gilt);
          --accent-ink: var(--db-ink);
          --danger: var(--db-carmine);
          --ink: var(--db-stock);
          --ink-dim: color-mix(in srgb, var(--db-stock) 68%, transparent);
          --gold: var(--db-gilt);
          --font-body: Georgia, "Times New Roman", serif;
          --font-display: Georgia, "Times New Roman", serif;
          --btn-radius: 5px;

          background:
            radial-gradient(120% 70% at 50% -8%, var(--db-baize-hi) 0%, transparent 58%),
            radial-gradient(140% 85% at 50% 108%, var(--db-baize-sh) 0%, transparent 55%),
            var(--db-baize);
          /* the ambient theme's own .themed rule already resolved "color" at an
             ancestor above this dialog — redefining --ink here only feeds fresh
             var(--ink) lookups, it can't retroactively repaint an inherited
             value, so the body text needs its own explicit declaration too
             (this is what fixed the theme-hijacked contrast bug: dark brown ink
             meant for a cream ground, inherited straight into this dark-green
             dialog, until this line pinned it back to stock ivory) */
          color: var(--db-stock);
        }
        .duel-baize .db-felt {
          position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.22;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .07 0 0 0 0 .16 0 0 0 0 .12 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .duel-baize .db-frame { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .duel-baize .db-frame::before,
        .duel-baize .db-frame::after {
          content: ""; position: absolute;
          border: 1px solid color-mix(in srgb, var(--db-gilt) 55%, transparent);
        }
        .duel-baize .db-frame::before { inset: 10px; }
        .duel-baize .db-frame::after { inset: 15px; border-color: color-mix(in srgb, var(--db-gilt) 26%, transparent); }
        .duel-baize .db-pip {
          position: fixed; z-index: 0; pointer-events: none; user-select: none;
          font-family: Georgia, serif; font-size: 1.1rem;
          color: color-mix(in srgb, var(--db-gilt) 45%, transparent);
        }
        .duel-baize .db-pip[data-corner="tl"] { top: 22px; left: 26px; }
        .duel-baize .db-pip[data-corner="tr"] { top: 22px; right: 26px; }
        .duel-baize .db-pip[data-corner="bl"] { bottom: 22px; left: 26px; }
        .duel-baize .db-pip[data-corner="br"] { bottom: 22px; right: 26px; }

        .duel-baize .db-scene { animation: db-deal 0.3s ease both; }
        @keyframes db-deal {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .duel-baize .db-scene { animation: none !important; }
        }
      `}</style>
      <div className="db-felt" aria-hidden="true" />
      <div className="db-frame" aria-hidden="true" />
      <span className="db-pip" data-corner="tl" aria-hidden="true">♠</span>
      <span className="db-pip" data-corner="tr" aria-hidden="true">♥</span>
      <span className="db-pip" data-corner="bl" aria-hidden="true">♦</span>
      <span className="db-pip" data-corner="br" aria-hidden="true">♣</span>

      <div className="relative z-10 flex items-center justify-between">
        <p className="kicker">
          {game} — {playerA} vs {playerB}
        </p>
        {/* always-available exit (visual #7) */}
        <button
          aria-label="abandon the duel"
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--ink-dim)", color: "var(--ink-dim)" }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {phase === "intro" && (
        <div className="db-scene relative z-10 flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg">
            {game === "Reaction" && "Tap READY, wait for the flash, tap FAST. A false start is an automatic loss."}
            {game === "Tap Race" && "Five seconds. Tap as many times as humanly possible."}
            {game === "Steady Hand" && "Hold your finger on the ◎ and keep it dead still. First wobble ends it. 30s max."}
          </p>
          <p className="text-sm italic" style={{ color: "var(--ink-dim)" }}>
            {playerA} goes first. The phone gets handed over between turns.
          </p>
          <button className="btn px-10 py-4 text-xl" onClick={() => setPhase("aTurn")}>
            {playerA}, ready
          </button>
        </div>
      )}

      {phase === "aTurn" && (
        // relative z-10: stacks above the fixed felt/frame/pip decoration
        // behind it (CSS painting order would otherwise put a non-positioned
        // in-flow child below sibling position:fixed z-index:0 layers) — a
        // pure positioning wrapper, Turn's own gameplay code is untouched
        <div className="relative z-10 flex flex-1">
          <Turn
            game={game}
            player={playerA}
            onScore={(s) => {
              setScoreA(s);
              setPhase("handover"); // gate: A's residual taps must not start B's turn (UX #1)
            }}
          />
        </div>
      )}

      {phase === "handover" && (
        <div className="db-scene relative z-10 flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
            {playerA}: <b>{fmt(scoreA)}</b>
            {game === "Reaction" && scoreA !== null && scoreA >= 9999 && (
              <span className="block text-sm" style={{ color: "var(--danger)" }}>
                jumped the gun — automatic loss on this turn
              </span>
            )}
          </p>
          <p className="font-display text-2xl" style={{ color: "var(--gold)" }}>
            Hand the phone to {playerB}
          </p>
          <button className="btn px-10 py-4 text-xl" onClick={() => setPhase("bTurn")}>
            {playerB}, ready
          </button>
        </div>
      )}

      {phase === "bTurn" && (
        <div className="relative z-10 flex flex-1">
          <Turn
            game={game}
            player={playerB}
            onScore={(s) => {
              setScoreB(s);
              setPhase("result");
            }}
          />
        </div>
      )}

      {phase === "result" && (
        <div className="db-scene relative z-10 flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
            {playerA}: <b>{fmt(scoreA)}</b> · {playerB}: <b>{fmt(scoreB)}</b>
          </p>
          {winner ? (
            <p className="font-display text-4xl" style={{ color: "var(--gold)" }}>
              {winner} wins
            </p>
          ) : (
            <p className="font-display text-2xl" style={{ color: "var(--ink-dim)" }}>
              Dead heat — run it back
            </p>
          )}
          {/* the instruction that makes it count — a solid callout, not a whisper (visual #2) */}
          {winner && (
            <p
              className="max-w-xs rounded p-3 text-base"
              style={{
                background: "color-mix(in srgb, var(--db-gilt) 14%, var(--db-baize-hi))",
                border: "1px solid color-mix(in srgb, var(--db-gilt) 45%, transparent)",
                color: "var(--db-stock)",
              }}
            >
              Now both of you report <b>{winner}</b> on <b>your OWN phones</b>. The machine is watching the arithmetic.
            </p>
          )}
          {!winner && (
            <button
              className="btn"
              onClick={() => {
                setScoreA(null);
                setScoreB(null);
                setPhase("aTurn");
              }}
            >
              Rematch
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function Turn({ game, player, onScore }: { game: string; player: string; onScore: (s: number) => void }) {
  if (game === "Reaction") return <ReactionTurn player={player} onScore={onScore} />;
  if (game === "Tap Race") return <TapRaceTurn player={player} onScore={onScore} />;
  return <SteadyHandTurn player={player} onScore={onScore} />;
}

function ReactionTurn({ player, onScore }: { player: string; onScore: (s: number) => void }) {
  const [state, setState] = useState<"waiting" | "armed" | "go">("waiting");
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <button
      className="flex flex-1 flex-col items-center justify-center rounded-xl text-2xl select-none"
      style={{ background: state === "go" ? "var(--danger)" : "var(--panel-solid)", touchAction: "none" }}
      onPointerDown={() => {
        if (state === "waiting") {
          setState("armed");
          timer.current = setTimeout(() => {
            goAt.current = performance.now();
            setState("go");
          }, 1200 + Math.random() * 2300); // honestly random (UX #15)
        } else if (state === "armed") {
          if (timer.current) clearTimeout(timer.current);
          onScore(9999); // false start — the handover screen names the crime
        } else {
          onScore(Math.round(performance.now() - goAt.current));
        }
      }}
    >
      {state === "waiting" && `${player}: tap to arm`}
      {state === "armed" && "wait for it…"}
      {state === "go" && "TAP!"}
    </button>
  );
}

function TapRaceTurn({ player, onScore }: { player: string; onScore: (s: number) => void }) {
  const [running, setRunning] = useState(false);
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(5.0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const t = setInterval(() => {
      const remaining = 5 - (performance.now() - start) / 1000;
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) onScore(taps);
  }, [running, left, taps, onScore]);
  return (
    <button
      className="flex flex-1 flex-col items-center justify-center rounded-xl text-3xl select-none"
      style={{ background: "var(--panel-solid)", fontVariantNumeric: "tabular-nums", touchAction: "none" }}
      onPointerDown={() => {
        if (!running) setRunning(true);
        else if (left > 0) setTaps((t) => t + 1);
      }}
    >
      {!running ? `${player}: tap to start` : `${taps} — ${left.toFixed(1)}s`}
    </button>
  );
}

function SteadyHandTurn({ player, onScore }: { player: string; onScore: (s: number) => void }) {
  const [holding, setHolding] = useState(false);
  const [secs, setSecs] = useState(0);
  const start = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const done = useRef(false);
  useEffect(() => {
    if (!holding) return;
    const t = setInterval(() => {
      const s = (performance.now() - start.current) / 1000;
      setSecs(s);
      if (s >= 30 && !done.current) {
        done.current = true;
        onScore(30);
      }
    }, 100);
    return () => clearInterval(t);
  }, [holding, onScore]);
  const end = () => {
    if (!holding || done.current) return; // single-fire (UX #12)
    done.current = true;
    setHolding(false);
    onScore(Math.round(((performance.now() - start.current) / 1000) * 10) / 10);
  };
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <p style={{ fontVariantNumeric: "tabular-nums" }}>
        {holding ? `${secs.toFixed(1)}s` : `${player}: hold your finger on the ◎`}
      </p>
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full border-2 text-4xl select-none"
        style={{ borderColor: "var(--gold)", color: "var(--gold)", touchAction: "none" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId); // explicit capture — drift is judged by the threshold, not the element edge (UX #12)
          origin.current = { x: e.clientX, y: e.clientY };
          start.current = performance.now();
          done.current = false;
          setHolding(true);
        }}
        onPointerMove={(e) => {
          if (holding && Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 14) end();
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        ◎
      </div>
    </div>
  );
}
