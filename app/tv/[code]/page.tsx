"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useGame, type PublicEvent } from "@/lib/client/useGame";

// The house channel (I12): a TV/laptop left open all night. It is also the
// game's metronome — while this page is up, the director's heartbeat ticks.
export default function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [begun, setBegun] = useState(false);

  const heartbeatMs = useMemo(() => {
    const s = (g.game?.config?.heartbeatSeconds as number) ?? 180;
    return Math.max(60, s) * 1000;
  }, [g.game?.config]);

  // heartbeat while the channel is open (server debounces to ≥1/min)
  useEffect(() => {
    if (!begun || !g.game) return;
    const t = setInterval(() => g.actions.tick(), heartbeatMs);
    return () => clearInterval(t);
  }, [begun, heartbeatMs, g.game, g.actions]);

  async function begin() {
    setBegun(true);
    try {
      await navigator.wakeLock?.request("screen");
    } catch {}
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
  }

  if (g.loading) return null;
  if (!g.game)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p>No such evening.</p>
      </main>
    );

  const skin = g.game.story_public?.skin?.palette;
  const style = skin ? ({ ["--bg" as string]: skin.bg, ["--accent" as string]: skin.accent, ["--ink" as string]: skin.text } as React.CSSProperties) : undefined;

  const announces = g.publicEvents.filter((e) =>
    ["announce", "seal_broken", "seal_resumed"].includes(e.type)
  );
  const latest = announces[0];
  const reveal = g.publicEvents.find((e) => e.type === "reveal_roles");

  return (
    <main className="flex min-h-dvh flex-col p-10" style={style}>
      {!begun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button className="btn px-10 py-6 text-2xl" onClick={begin}>
            🕯 Light the candles
          </button>
        </div>
      )}

      <header className="text-center">
        <h1 className="candle font-display text-6xl tracking-widest" style={{ color: "var(--gold)" }}>
          {g.game.story_public?.meta?.title ?? g.game.title}
        </h1>
        <p className="mt-2 text-xl italic" style={{ color: "var(--ink-dim)" }}>
          {g.game.story_public?.meta?.tagline ?? "The house is listening."}
        </p>
        <p className="mt-4 text-lg" style={{ color: "var(--ink-dim)" }}>
          {g.game.status === "lobby" && `Join at ${typeof window !== "undefined" ? window.location.host : ""} — code `}
          {g.game.status === "lobby" && (
            <span className="font-display text-3xl tracking-[0.4em]" style={{ color: "var(--gold)" }}>
              {g.game.code}
            </span>
          )}
          {g.game.status === "round" && `Round ${g.game.round_no}`}
          {g.game.paused && " — ⏸ the game holds its breath"}
        </p>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        {reveal && g.game.status !== "round" ? (
          <RevealBoard e={reveal} />
        ) : latest ? (
          <p key={latest.id} className="envelope max-w-4xl font-display text-4xl leading-snug">
            “{(latest.payload.text as string) ?? ""}”
          </p>
        ) : (
          <p className="candle text-2xl italic" style={{ color: "var(--ink-dim)" }}>
            {g.game.status === "lobby" ? "The guests are expected…" : "The house watches, and says nothing. Yet."}
          </p>
        )}
      </section>

      <footer className="flex justify-center gap-6 text-sm" style={{ color: "var(--ink-dim)" }}>
        {g.roster.map((p) => (
          <span key={p.id} className={p.status === "dead" || p.status === "banished" ? "line-through opacity-50" : ""}>
            {p.name}
            {p.status === "ghost" && " 👻"}
          </span>
        ))}
      </footer>
    </main>
  );
}

function RevealBoard({ e }: { e: PublicEvent }) {
  const players = (e.payload.players as { name: string; persona: string; role: string; status: string }[]) ?? [];
  return (
    <div className="envelope">
      <h2 className="font-display text-4xl" style={{ color: "var(--gold)" }}>The truth of the evening</h2>
      <div className="mt-8 grid grid-cols-2 gap-x-16 gap-y-3 text-left text-xl">
        {players.map((p) => (
          <p key={p.name}>
            <b style={{ color: p.role === "traitor" ? "var(--accent)" : "var(--ink)" }}>
              {p.role === "traitor" ? "🗡 " : ""}{p.name}
            </b>{" "}
            <span style={{ color: "var(--ink-dim)" }}>was {p.persona} — {p.role}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
