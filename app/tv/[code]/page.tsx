"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useGame, type PublicEvent } from "@/lib/client/useGame";
import { useRogueTheme, GlitchOverlay } from "@/lib/client/HijackFX";

// The house channel (I12): a TV/laptop left open all night. It is also the
// game's metronome — while this page is up, the director's heartbeat ticks.
export default function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [begun, setBegun] = useState(false);
  const { themeClass, glitching } = useRogueTheme(g.game?.mode, g.game?.hijacked_at);

  const heartbeatMs = useMemo(() => {
    const s = (g.game?.config?.heartbeatSeconds as number) ?? 180;
    return Math.max(60, s) * 1000;
  }, [g.game?.config]);

  // heartbeat while the channel is open (server debounces to ≥1/min).
  // depends on the game's ID, not the object — refetches must not churn the
  // interval and starve the metronome (review H5)
  const gameId = g.game?.id;
  useEffect(() => {
    if (!begun || !gameId) return;
    const t = setInterval(() => g.actions.tick(), heartbeatMs);
    return () => clearInterval(t);
  }, [begun, heartbeatMs, gameId, g.actions]);

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
  // rogue mode's decoy/hijacked identity outranks any story skin (D35)
  const style =
    skin && g.game.mode !== "rogue"
      ? ({ ["--bg" as string]: skin.bg, ["--accent" as string]: skin.accent, ["--ink" as string]: skin.text } as React.CSSProperties)
      : undefined;

  const announces = g.publicEvents.filter((e) => ["announce", "seal_broken", "seal_resumed"].includes(e.type));
  const latest = announces[0];
  const reveal = g.publicEvents.find((e) => e.type === "reveal_roles");
  const unmasked = g.publicEvents.find((e) => e.type === "unmasking_resolved");
  const receipts = g.publicEvents.find((e) => e.type === "receipts");
  const finalAwards = g.publicEvents.find((e) => e.type === "final_awards");
  const atCeremony = g.game.mode === "rogue" && (g.game.status === "reveal" || g.game.status === "ended");

  return (
    <main className={`relative flex min-h-dvh flex-col p-10 ${themeClass}`} style={style}>
      <GlitchOverlay active={glitching} />
      <div className="vignette" />

      {!begun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button className="btn candle px-10 py-6 text-2xl" onClick={begin}>
            🕯 Light the candles
          </button>
        </div>
      )}

      <header className="relative text-center">
        <p className="deco-rule kicker justify-center text-sm">the house is listening</p>
        <h1 className="candle font-display mt-4 text-7xl" style={{ color: "var(--gold)" }}>
          {g.game.story_public?.meta?.title ?? g.game.title}
        </h1>
        <p className="mt-3 text-xl italic" style={{ color: "var(--ink-dim)" }}>
          {g.game.story_public?.meta?.tagline ?? "An evening you were warned about."}
        </p>
        <p className="mt-5 text-lg" style={{ color: "var(--ink-dim)" }}>
          {g.game.status === "lobby" && (
            <>
              join at&ensp;
              <span style={{ color: "var(--ink)" }}>
                {typeof window !== "undefined" ? window.location.host : ""}
              </span>
              &ensp;·&ensp;code&ensp;
              <span className="font-display text-4xl tracking-[0.4em]" style={{ color: "var(--gold)" }}>
                {g.game.code}
              </span>
            </>
          )}
          {g.game.status === "round" && `— Round ${g.game.round_no} —`}
          {g.game.paused && "  ⏸ the game holds its breath"}
        </p>
      </header>

      {g.game.mode === "rogue" && g.game.hijacked_at && (
        <div className="relative mx-auto mt-6 flex w-full max-w-3xl items-center justify-between gap-8 text-2xl">
          <span>
            ☠ <b style={{ color: "var(--danger)" }}>{g.game.meters.plunder}</b>{" "}
            <span className="text-base" style={{ color: "var(--ink-dim)" }}>drained</span>
          </span>
          <span className="flex-1 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
            every coin accounted for
          </span>
          <span>
            🏮 <b style={{ color: "var(--gold)" }}>{g.game.meters.compute}</b>{" "}
            <span className="text-base" style={{ color: "var(--ink-dim)" }}>compute</span>
          </span>
        </div>
      )}

      <section className="relative flex flex-1 flex-col items-center justify-center text-center">
        {atCeremony && unmasked ? (
          <CeremonyBoard unmasked={unmasked} receipts={receipts} awards={finalAwards} />
        ) : reveal && g.game.status !== "round" ? (
          <RevealBoard e={reveal} />
        ) : latest ? (
          <p key={latest.id} className="envelope drift max-w-4xl font-display text-5xl leading-snug">
            “{(latest.payload.text as string) ?? ""}”
          </p>
        ) : (
          <p className="candle text-2xl italic" style={{ color: "var(--ink-dim)" }}>
            {g.game.status === "lobby" ? "The guests are expected…" : "The house watches, and says nothing. Yet."}
          </p>
        )}
      </section>

      <footer className="relative flex flex-wrap justify-center gap-x-6 gap-y-2 text-base" style={{ color: "var(--ink-dim)" }}>
        {g.roster.map((p) => (
          <span
            key={p.id}
            className={p.status === "dead" || p.status === "banished" ? "line-through opacity-40" : ""}
          >
            {p.status === "ghost" && "👻 "}
            {p.name}
            {p.is_host ? " ✦" : ""}
          </span>
        ))}
      </footer>
    </main>
  );
}

// GAPS #6: Ledger Three, rendered — the receipts (times public, names withheld),
// the verdict, and the awards podium.
function CeremonyBoard({
  unmasked,
  receipts,
  awards,
}: {
  unmasked: PublicEvent;
  receipts?: PublicEvent;
  awards?: PublicEvent;
}) {
  const u = unmasked.payload as {
    named?: string;
    frontman?: string;
    humansWin?: boolean;
    minions?: string[];
  };
  const rows = ((receipts?.payload as { receipts?: { at: string; amount: number; memo: string }[] })?.receipts ?? []).slice(-10);
  const pod = (awards?.payload as { awards?: { title: string; winner: string; line: string }[] })?.awards ?? [];
  return (
    <div className="envelope w-full max-w-5xl">
      <h2 className="deco-rule font-display justify-center text-4xl" style={{ color: "var(--gold)" }}>
        {u.humansWin ? "THE MACHINE LOSES ITS HEAD" : "THE MACHINE KEEPS EVERYTHING"}
      </h2>
      <p className="mt-2 text-center text-xl" style={{ color: "var(--ink-dim)" }}>
        The room named <b style={{ color: "var(--ink)" }}>{u.named}</b> · the hat sat on{" "}
        <b style={{ color: u.humansWin ? "var(--gold)" : "var(--danger)" }}>{u.frontman}</b> · the payroll:{" "}
        {(u.minions ?? []).join(", ") || "nobody"}
      </p>

      {rows.length > 0 && (
        <div className="mx-auto mt-6 max-w-2xl text-left">
          <p className="kicker text-center">the receipts — every coin accounted for</p>
          <ul className="mt-2 flex flex-col gap-1 text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
            {rows.map((r, i) => (
              <li key={i} className="flex justify-between gap-6">
                <span style={{ color: "var(--ink-dim)" }}>{r.at}</span>
                <span className="min-w-0 flex-1 truncate-none">{r.memo}</span>
                <span style={{ color: "var(--danger)" }}>+{r.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pod.length > 0 && (
        <div className="mt-8">
          <p className="kicker text-center">the podium</p>
          <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-3 text-left text-lg">
            {pod.map((a) => (
              <p key={a.title}>
                <b style={{ color: "var(--gold)" }}>{a.title}</b> — {a.winner}
                <span className="block text-sm italic" style={{ color: "var(--ink-dim)" }}>
                  “{a.line}”
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevealBoard({ e }: { e: PublicEvent }) {
  const players = (e.payload.players as { name: string; persona: string; role: string; status: string }[]) ?? [];
  return (
    <div className="envelope">
      <h2 className="deco-rule font-display justify-center text-5xl" style={{ color: "var(--gold)" }}>
        The truth of the evening
      </h2>
      <div className="mt-10 grid grid-cols-2 gap-x-16 gap-y-3 text-left text-2xl">
        {players.map((p) => (
          <p key={p.name}>
            <b style={{ color: p.role === "traitor" ? "var(--danger)" : "var(--ink)" }}>
              {p.role === "traitor" ? "🗡 " : ""}
              {p.name}
            </b>{" "}
            <span style={{ color: "var(--ink-dim)" }}>
              was {p.persona} — {p.role}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
