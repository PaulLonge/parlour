"use client";

// D45a: one-device phone duels — Reaction, Tap Race, Steady Hand. Agreement
// happens on everyone's own phone; PLAY happens here, pass-and-play, so there
// is no network latency to argue about. The result screen names a winner; both
// players still confirm on their OWN phones (standard both-report).

import { useEffect, useRef, useState } from "react";

export const PHONE_GAMES = ["Reaction", "Tap Race", "Steady Hand"];

type Phase = "intro" | "aTurn" | "bTurn" | "result";

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

  // lower is better for Reaction; higher for Tap Race and Steady Hand
  const lowerWins = game === "Reaction";
  const winner =
    scoreA !== null && scoreB !== null
      ? scoreA === scoreB
        ? null
        : (lowerWins ? scoreA < scoreB : scoreA > scoreB)
          ? playerA
          : playerB
      : null;

  const unit = game === "Reaction" ? "ms" : game === "Tap Race" ? "taps" : "s";

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-black/95 p-6 text-center">
      <p className="kicker">{game} — {playerA} vs {playerB}</p>

      {phase === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg">
            {game === "Reaction" && "Tap READY, wait for the flash, tap FAST. False start scores 9999."}
            {game === "Tap Race" && "Five seconds. Tap as many times as humanly possible."}
            {game === "Steady Hand" && "Hold your finger dead still on the coin. First wobble ends it. 30s max."}
          </p>
          <p className="text-sm italic" style={{ color: "var(--ink-dim)" }}>
            {playerA} goes first. Hand the phone over between turns.
          </p>
          <button className="btn px-10 py-4 text-xl" onClick={() => setPhase("aTurn")}>
            {playerA}, ready
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            cancel
          </button>
        </div>
      )}

      {phase === "aTurn" && (
        <Turn game={game} player={playerA} onScore={(s) => { setScoreA(s); setPhase("bTurn"); }} />
      )}
      {phase === "bTurn" && (
        <Turn game={game} player={playerB} onScore={(s) => { setScoreB(s); setPhase("result"); }} />
      )}

      {phase === "result" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
            {playerA}: <b>{scoreA}{unit}</b> · {playerB}: <b>{scoreB}{unit}</b>
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
          <p className="max-w-xs text-sm italic" style={{ color: "var(--ink-dim)" }}>
            Now both of you report {winner ?? "the rematch winner"} on your OWN phones. The machine is watching the
            arithmetic.
          </p>
          {!winner && (
            <button className="btn" onClick={() => { setScoreA(null); setScoreB(null); setPhase("aTurn"); }}>
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
      className="flex flex-1 flex-col items-center justify-center rounded-xl text-2xl"
      style={{ background: state === "go" ? "var(--danger)" : "var(--panel-solid)" }}
      onPointerDown={() => {
        if (state === "waiting") {
          setState("armed");
          timer.current = setTimeout(() => {
            goAt.current = performance.now();
            setState("go");
          }, 1200 + Math.floor(performance.now() % 2300));
        } else if (state === "armed") {
          if (timer.current) clearTimeout(timer.current);
          onScore(9999); // false start
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
      className="flex flex-1 flex-col items-center justify-center rounded-xl text-3xl"
      style={{ background: "var(--panel-solid)", fontVariantNumeric: "tabular-nums" }}
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
  useEffect(() => {
    if (!holding) return;
    const t = setInterval(() => {
      const s = (performance.now() - start.current) / 1000;
      setSecs(s);
      if (s >= 30) onScore(30);
    }, 100);
    return () => clearInterval(t);
  }, [holding, onScore]);
  const end = () => holding && onScore(Math.round(((performance.now() - start.current) / 1000) * 10) / 10);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <p style={{ fontVariantNumeric: "tabular-nums" }}>{holding ? `${secs.toFixed(1)}s` : `${player}: hold the coin`}</p>
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full border-2 text-4xl"
        style={{ borderColor: "var(--gold)", touchAction: "none" }}
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          start.current = performance.now();
          setHolding(true);
        }}
        onPointerMove={(e) => {
          if (holding && Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 14) end();
        }}
        onPointerUp={end}
        onPointerLeave={end}
      >
        ◎
      </div>
    </div>
  );
}
