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
      className="fixed inset-0 z-50 flex flex-col p-6 text-center select-none"
      style={{
        background: "rgba(6,7,8,0.97)", // solid — instructions must not fight the page behind (visual #1)
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between">
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
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
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
        <Turn
          game={game}
          player={playerA}
          onScore={(s) => {
            setScoreA(s);
            setPhase("handover"); // gate: A's residual taps must not start B's turn (UX #1)
          }}
        />
      )}

      {phase === "handover" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
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
        <Turn
          game={game}
          player={playerB}
          onScore={(s) => {
            setScoreB(s);
            setPhase("result");
          }}
        />
      )}

      {phase === "result" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
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
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)" }}
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
