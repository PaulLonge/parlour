"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame, type PublicEvent } from "@/lib/client/useGame";
import { useRogueTheme, GlitchOverlay } from "@/lib/client/HijackFX";
import { QrCode } from "@/lib/client/qr";

// D71 — BENTHICA: once a rogue game is hijacked, the TV becomes a descent
// (techniques borrowed from The Gallery's BENTHICA room, MIT — deep
// teal-to-abyss gradient, mono HUD instrument readouts, drifting motes, a
// zone/depth footer bar). Plunder (CALICO) pulls the room deeper; compute
// (BOSUN) drags it back toward the surface — the room sinks as the machine
// wins, surfaces as the room fights back. Pre-hijack decoy stays untouched.
const DEPTH_STOPS: [number, string][] = [
  [0, "#0F7E8A"], // sunlit — the room is winning
  [0.4, "#0A3B5C"], // twilight
  [0.7, "#041526"], // midnight
  [1, "#010409"], // abyss — CALICO is winning
];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function depthColor(frac: number): string {
  const f = clamp01(frac);
  for (let i = 1; i < DEPTH_STOPS.length; i++) {
    const [t0, c0] = DEPTH_STOPS[i - 1];
    const [t1, c1] = DEPTH_STOPS[i];
    if (f <= t1 || i === DEPTH_STOPS.length - 1) {
      const local = t1 === t0 ? 0 : (f - t0) / (t1 - t0);
      const [r0, g0, b0] = hexToRgb(c0);
      const [r1, g1, b1] = hexToRgb(c1);
      const r = Math.round(r0 + (r1 - r0) * local);
      const g = Math.round(g0 + (g1 - g0) * local);
      const b = Math.round(b0 + (b1 - b0) * local);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return DEPTH_STOPS[DEPTH_STOPS.length - 1][1];
}

function depthZone(frac: number): string {
  if (frac < 0.25) return "SUNLIT";
  if (frac < 0.5) return "TWILIGHT";
  if (frac < 0.75) return "MIDNIGHT";
  return "ABYSS";
}

// D72's held piece — THE DESCENT: reveal stops being a jump-cut and becomes a
// staged sink through the night's own ledger. A client-only stage machine
// (stage index + a chain of setTimeouts, never Date.now — no hydration risk)
// plays ONCE: surface → the receipts drifting past (capped, batched into a
// "…and N more" beat if there are many) → the midnight verdict → the floor,
// where it rests for good — the sequence must not loop, and nobody scrolls a
// TV. Reduced motion skips straight to the floor: same information, laid out
// to read instantly instead of raced through.
export type CeremonyStage = "surface" | "receipts" | "verdict" | "floor";

// timings aim for a ~55-65s run through stages 1-3 on a well-stocked night
// (spec: ~60-90s total) without a quiet night dragging or a busy one running long
const CEREMONY_RECEIPT_CAP = 8;
const CEREMONY_MS = { surface: 4500, receiptItem: 4200, receiptMore: 3000, verdict: 9500 };

const CEREMONY_ZONE: Record<CeremonyStage, string> = {
  surface: "SURFACE",
  receipts: "THE RECEIPTS",
  verdict: "MIDNIGHT",
  floor: "THE FLOOR",
};

// depth as a narrative instrument while the ceremony plays, not a live meter:
// sinks through the receipts, holds at midnight, then settles on where the
// room actually ended up (surfaced if they won, abyssal if CALICO kept it all)
function ceremonyDepthFrac(stage: CeremonyStage, receiptsProgress: number, humansWin: boolean | undefined): number {
  switch (stage) {
    case "surface":
      return 0.03;
    case "receipts":
      return 0.05 + 0.45 * clamp01(receiptsProgress);
    case "verdict":
      return 0.62;
    case "floor":
      return humansWin ? 0.14 : 0.9;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCeremonyStage(active: boolean, reducedMotion: boolean, receiptsCount: number) {
  const cap = Math.min(receiptsCount, CEREMONY_RECEIPT_CAP);
  const [stage, setStage] = useState<CeremonyStage>(reducedMotion ? "floor" : "surface");
  const [receiptsShown, setReceiptsShown] = useState(reducedMotion ? cap : 0);
  const [showMoreLine, setShowMoreLine] = useState(reducedMotion && receiptsCount > cap);

  // active only once the terminal events are all in (see ceremonyReady below) —
  // avoids starting the sequence on a stale receiptsCount and restarting mid-play
  useEffect(() => {
    if (!active || reducedMotion) return;
    const capNow = Math.min(receiptsCount, CEREMONY_RECEIPT_CAP);
    setStage("surface");
    setReceiptsShown(0);
    setShowMoreLine(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    let t = CEREMONY_MS.surface;
    if (receiptsCount === 0) {
      after(t, () => setStage("verdict"));
    } else {
      after(t, () => setStage("receipts"));
      for (let i = 1; i <= capNow; i++) {
        t += CEREMONY_MS.receiptItem;
        const n = i;
        after(t, () => setReceiptsShown(n));
      }
      if (receiptsCount > capNow) {
        t += CEREMONY_MS.receiptMore;
        after(t, () => setShowMoreLine(true));
      } else {
        t += 900;
      }
      after(t, () => setStage("verdict"));
    }
    t += CEREMONY_MS.verdict;
    after(t, () => setStage("floor"));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reducedMotion, receiptsCount]);

  return { stage, receiptsShown, showMoreLine, cap };
}

// backlog #2 — THE HOUSE VOICE: zero-cost browser TTS for the public channel.
// Default OFF, remembered per game code. Nothing is ever spoken until a guest
// opts in AND the candles-gate click (a real user gesture) has run — that's
// what unlocks audio playback, and what baselines the "don't replay history"
// cutoff (see TvPage's begin()).
function useHouseVoice(code: string) {
  const storageKey = `parlour-voice-${code.toUpperCase()}`;
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    try {
      setEnabled(localStorage.getItem(storageKey) === "1");
    } catch {}
    // deterministic pick — prefer en-GB, else first English voice, else
    // whatever's first. Never random, never re-picked per message.
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const v =
        voices.find((x) => x.lang?.toLowerCase() === "en-gb") ??
        voices.find((x) => x.lang?.toLowerCase().startsWith("en-gb")) ??
        voices.find((x) => x.lang?.toLowerCase().startsWith("en")) ??
        voices[0];
      setVoice(v ?? null);
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, [storageKey]);

  const setPersisted = useCallback(
    (next: boolean) => {
      setEnabled(next);
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    [storageKey]
  );

  return { supported, enabled, setEnabled: setPersisted, voice };
}

// rate ~0.92 / pitch slightly low — the house is unhurried; a hijacked game
// nudges rate up (the machine is brisk). No other per-message variation.
function speakHouseLine(text: string, voice: SpeechSynthesisVoice | null, brisk: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = brisk ? 1.02 : 0.92;
  u.pitch = 0.85;
  window.speechSynthesis.speak(u);
}

type Mote = { left: number; delay: number; dur: number; size: number };

// The house channel (I12): a TV/laptop left open all night. It is also the
// game's metronome — while this page is up, the director's heartbeat ticks.
export default function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [begun, setBegun] = useState(false);
  const { themeClass, glitching } = useRogueTheme(g.game?.mode, g.game?.hijacked_at);

  // backlog #2 — THE HOUSE VOICE. lastSpokenEventId is baselined in begin()
  // (the candles-gate gesture) so nothing already on the board ever gets
  // spoken; lastSpokenCeremonyStage stops the DESCENT beats repeating on re-render.
  const houseVoice = useHouseVoice(code);
  const lastSpokenEventId = useRef<number | null>(null);
  const lastSpokenCeremonyStage = useRef<CeremonyStage | null>(null);

  // cancel any in-flight utterance on unmount — the TV shouldn't keep
  // talking after the tab's gone
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

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

  // marine snow, generated client-side only — random per-mote layout would
  // otherwise mismatch the server-rendered HTML on hydration
  const hijacked = g.game?.mode === "rogue" && !!g.game?.hijacked_at;
  const [motes, setMotes] = useState<Mote[]>([]);
  useEffect(() => {
    if (!hijacked) {
      setMotes([]);
      return;
    }
    setMotes(
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 16 + Math.random() * 14,
        size: 2 + Math.random() * 3,
      }))
    );
  }, [hijacked]);

  const reducedMotion = useReducedMotion();

  // Ceremony data, pulled early: the stage-machine hook below must run every
  // render (hooks-order rule), before the loading/null guards. Safe pre-load —
  // g.publicEvents defaults to [] and g.game is optionally chained here.
  const announces = g.publicEvents.filter((e) => ["announce", "seal_broken", "seal_resumed"].includes(e.type));
  const latest = announces[0];
  const reveal = g.publicEvents.find((e) => e.type === "reveal_roles");
  const unmasked = g.publicEvents.find((e) => e.type === "unmasking_resolved");
  const receipts = g.publicEvents.find((e) => e.type === "receipts");
  const finalAwards = g.publicEvents.find((e) => e.type === "final_awards");
  const atCeremony = g.game?.mode === "rogue" && (g.game?.status === "reveal" || g.game?.status === "ended");
  const receiptsCount = ((receipts?.payload as { receipts?: unknown[] } | undefined)?.receipts ?? []).length;
  // resolveUnmasking emits unmasking_resolved / receipts / final_awards back to
  // back, but realtime can notify on the first insert before the others commit —
  // wait for all three so the sequence never starts on a stale receiptsCount.
  const ceremonyReady = !!(atCeremony && unmasked && receipts && finalAwards);
  const ceremony = useCeremonyStage(ceremonyReady, reducedMotion, receiptsCount);

  // speak new public announcements once the candles are lit — never the
  // backlog, only what arrives after (id > baseline set in begin()).
  useEffect(() => {
    if (!begun || !houseVoice.enabled || !latest) return;
    if (lastSpokenEventId.current === latest.id) return;
    lastSpokenEventId.current = latest.id;
    speakHouseLine((latest.payload.text as string) ?? "", houseVoice.voice, hijacked);
  }, [begun, houseVoice.enabled, houseVoice.voice, latest, hijacked]);

  // DESCENT beats, sparingly: the surface line, the midnight verdict
  // headline, the floor's final outcome line. Never the receipts themselves.
  useEffect(() => {
    if (!begun || !houseVoice.enabled || !ceremonyReady) return;
    if (lastSpokenCeremonyStage.current === ceremony.stage) return;
    lastSpokenCeremonyStage.current = ceremony.stage;
    const u = unmasked?.payload as UnmaskedPayload | undefined;
    if (ceremony.stage === "surface") {
      speakHouseLine("The books close. The house tallies the night, one line at a time.", houseVoice.voice, hijacked);
    } else if (ceremony.stage === "verdict" && u) {
      speakHouseLine(`Midnight. ${ceremonyHeadline(u)}. The room named ${u.named ?? "no one"}.`, houseVoice.voice, hijacked);
    } else if (ceremony.stage === "floor" && u) {
      speakHouseLine(`${ceremonyHeadline(u)}. The hat sat on ${u.frontman ?? "no one"}.`, houseVoice.voice, hijacked);
    }
  }, [begun, houseVoice.enabled, houseVoice.voice, ceremonyReady, ceremony.stage, unmasked, hijacked]);

  async function begin() {
    setBegun(true);
    // baseline the voice cutoff to "now" — this click is the user gesture
    // that unlocks audio playback, and the moment after which new
    // announcements get spoken (never anything already on the board)
    lastSpokenEventId.current = latest?.id ?? null;
    if (houseVoice.enabled) {
      try {
        speakHouseLine(" ", houseVoice.voice, hijacked);
      } catch {}
    }
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

  // D71 depth mapping: net tension between the two meters, each normalized
  // against its own win target (D66 scales targets to headcount). 0 = fully
  // surfaced (compute dominant, room fighting back), 1 = fully abyssal
  // (plunder dominant, CALICO winning). Centred at 0.5 when even.
  const cfg = (g.game.config ?? {}) as { plunderTarget?: number; computeTarget?: number };
  const plunder = g.game.meters?.plunder ?? 0;
  const compute = g.game.meters?.compute ?? 0;
  const plunderFrac = clamp01(plunder / (cfg.plunderTarget || 3000));
  const computeFrac = clamp01(compute / (cfg.computeTarget || 100));
  const meterDepthFrac = clamp01(0.5 + (plunderFrac - computeFrac) / 2);
  // While THE DESCENT plays, it drives depth itself, overriding the
  // meters-driven frac (D72's held piece) — the floor settles on the room's
  // actual outcome rather than snapping back to the live tug-of-war.
  const humansWin = (unmasked?.payload as { humansWin?: boolean } | undefined)?.humansWin;
  const depthFrac = ceremonyReady
    ? ceremonyDepthFrac(ceremony.stage, ceremony.cap > 0 ? ceremony.receiptsShown / ceremony.cap : 1, humansWin)
    : meterDepthFrac;
  const depthBg = depthColor(depthFrac);
  const zone = ceremonyReady ? CEREMONY_ZONE[ceremony.stage] : depthZone(depthFrac);

  return (
    <main
      className={`relative flex min-h-dvh flex-col p-10 ${themeClass}${hijacked ? " benthica" : ""}`}
      style={style}
    >
      {hijacked && (
        <style>{`
          .benthica-depth {
            position: fixed; inset: 0; z-index: 0; pointer-events: none;
            transition: background-color 3s ease;
            animation: benthica-flood 2.6s ease both;
          }
          @keyframes benthica-flood {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          .benthica-glow {
            position: fixed; inset: 0; z-index: 0; pointer-events: none;
            background: radial-gradient(60% 45% at 50% 6%, rgba(100, 240, 210, 0.10), transparent 70%);
          }
          .benthica-motes { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
          .benthica-motes .mote {
            position: absolute; bottom: -5%; border-radius: 999px;
            background: #64F0D2; opacity: 0;
            box-shadow: 0 0 6px 1px rgba(100, 240, 210, 0.55);
            animation: benthica-drift linear infinite;
          }
          @keyframes benthica-drift {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            8% { opacity: 0.55; }
            92% { opacity: 0.32; }
            100% { transform: translateY(-110vh) translateX(14px); opacity: 0; }
          }
          .benthica-hud {
            position: fixed; top: 1.4rem; right: 1.4rem; z-index: 20;
            font-family: Consolas, "Courier New", monospace;
            text-align: right;
            padding: 1rem 1.4rem 0.9rem 1.6rem;
            background: rgba(1, 4, 9, 0.5);
            backdrop-filter: blur(6px);
            border-right: 2px solid rgba(100, 240, 210, 0.35);
            animation: benthica-emerge 2.2s ease both;
          }
          /* the meters are the visible stakes of the whole post-hijack
             tug-of-war — TV-legible sizes, not a laptop-corner widget
             (review #4, ~2x the prior register, still corner-docked) */
          .benthica-hud-title {
            font-size: 0.9rem; letter-spacing: 0.22em; color: rgba(159, 195, 207, 0.75);
            margin-bottom: 0.7rem; white-space: nowrap;
          }
          .benthica-readout { display: flex; justify-content: flex-end; align-items: baseline; gap: 0.6em; margin: 0.4rem 0; font-variant-numeric: tabular-nums; }
          .benthica-readout .lbl { font-size: 1rem; letter-spacing: 0.16em; color: rgba(159, 195, 207, 0.7); white-space: nowrap; }
          .benthica-readout .val { font-size: 2.4rem; font-weight: 600; color: #E6F1F4; min-width: 3ch; }
          .benthica-readout .unit { font-size: 0.95rem; letter-spacing: 0.08em; color: rgba(159, 195, 207, 0.6); }
          .benthica-zonebar {
            position: relative; z-index: 5;
            display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
            margin-top: 0.9rem; padding: 0.55rem 0.3rem 0;
            border-top: 1px solid rgba(100, 240, 210, 0.18);
            font-family: Consolas, "Courier New", monospace;
            font-size: 1.1rem; letter-spacing: 0.2em; color: #9FC3CF;
          }
          .benthica-zonebar .lbl { color: rgba(159, 195, 207, 0.55); margin-right: 0.6em; }
          .benthica-zonebar-note { font-style: italic; letter-spacing: 0.05em; opacity: 0.75; }
          .benthica-announce { text-shadow: 0 0 26px rgba(100, 240, 210, 0.35); }
          @keyframes benthica-emerge {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .ceremony-beat { animation: benthica-emerge 1.1s ease both; }
          .ceremony-receipt { animation: ceremony-surface 0.9s ease both; }
          @keyframes ceremony-surface {
            0% { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .ceremony-floor-enter { animation: ceremony-settle 1.3s ease both; }
          @keyframes ceremony-settle {
            0% { opacity: 0; transform: translateY(22px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .benthica-depth { transition: none; animation: none; }
            .benthica-motes { display: none; }
            .benthica-hud { animation: none; }
            .ceremony-beat, .ceremony-receipt, .ceremony-floor-enter { animation: none; }
          }
        `}</style>
      )}
      <GlitchOverlay active={glitching} />
      {hijacked && (
        <>
          <div className="benthica-depth" style={{ backgroundColor: depthBg }} aria-hidden />
          <div className="benthica-glow" aria-hidden />
          {motes.length > 0 && (
            <div className="benthica-motes" aria-hidden>
              {motes.map((m, i) => (
                <span
                  key={i}
                  className="mote"
                  style={{
                    left: `${m.left}%`,
                    width: `${m.size}px`,
                    height: `${m.size}px`,
                    animationDelay: `${m.delay}s`,
                    animationDuration: `${m.dur}s`,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
      <div className="vignette" />

      {!begun && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/90">
          <button className="btn candle px-10 py-6 text-2xl" onClick={begin}>
            🕯 Light the candles
          </button>
          {houseVoice.supported && (
            <button
              type="button"
              className="btn btn-ghost px-5 py-2 text-base"
              style={{ opacity: houseVoice.enabled ? 1 : 0.55 }}
              aria-pressed={houseVoice.enabled}
              onClick={() => houseVoice.setEnabled(!houseVoice.enabled)}
            >
              🔊 the house speaks — {houseVoice.enabled ? "ON" : "OFF"}
            </button>
          )}
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

      {/* the door queue's fastest way in — a 4-char code hand-typed by 15
          people is real friction; a phone camera reads this instead
          (review #4 — content/tutorial-script.ts already names "the join
          QR" as part of the kit, nothing generated one) */}
      {g.game.status === "lobby" && (
        <aside
          className="fixed right-6 bottom-6 z-20 flex flex-col items-center gap-2 rounded p-3"
          style={{
            background: "color-mix(in srgb, var(--bg) 82%, transparent)",
            border: "1px solid var(--border-strong)",
            backdropFilter: "blur(4px)",
          }}
        >
          <p className="kicker text-xs" style={{ color: "var(--ink-dim)" }}>
            scan to join
          </p>
          <QrCode
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/g/${g.game.code}`}
            size={132}
            label={`QR code to join the game — code ${g.game.code}`}
          />
        </aside>
      )}

      {hijacked && <DepthHUD plunder={plunder} compute={compute} depthFrac={depthFrac} />}

      <section className="relative flex flex-1 flex-col items-center justify-center text-center">
        {atCeremony && unmasked ? (
          <DescentCeremony
            unmasked={unmasked}
            receipts={receipts}
            awards={finalAwards}
            stage={ceremony.stage}
            receiptsShown={ceremony.receiptsShown}
            showMoreLine={ceremony.showMoreLine}
            cap={ceremony.cap}
          />
        ) : reveal && g.game.status !== "round" ? (
          <RevealBoard e={reveal} />
        ) : latest ? (
          <p
            key={latest.id}
            className={`envelope drift max-w-4xl font-display text-5xl leading-snug${hijacked ? " benthica-announce" : ""}`}
          >
            “{(latest.payload.text as string) ?? ""}”
          </p>
        ) : (
          <p className="candle text-2xl italic" style={{ color: "var(--ink-dim)" }}>
            {g.game.status === "lobby" ? "The guests are expected…" : "The house watches, and says nothing. Yet."}
          </p>
        )}
      </section>

      {hijacked && (
        <div className="benthica-zonebar">
          <p>
            <span className="lbl">ZONE</span>
            {zone}
          </p>
          <p className="benthica-zonebar-note">every coin accounted for — {Math.round(depthFrac * 100)}% depth</p>
        </div>
      )}

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

// D71 BENTHICA: the twin meters as depth instruments — mono, letterspaced
// caps, tabular numerics, backdrop-blurred HUD corner cluster (borrowed from
// The Gallery's BENTHICA room). Same data as the old centered meters bar,
// just read as instruments instead of a ledger line.
function DepthHUD({ plunder, compute, depthFrac }: { plunder: number; compute: number; depthFrac: number }) {
  return (
    <aside className="benthica-hud" aria-label="Descent telemetry">
      <p className="benthica-hud-title">CALICO — DEPTH TELEMETRY</p>
      <div className="benthica-readout">
        <span className="lbl">DEPTH</span>
        <span className="val">{String(Math.round(depthFrac * 100)).padStart(3, "0")}</span>
        <span className="unit">%</span>
      </div>
      <div className="benthica-readout">
        <span className="lbl">DRAIN ☠</span>
        <span className="val">{plunder}</span>
        <span className="unit">plndr</span>
      </div>
      <div className="benthica-readout">
        <span className="lbl">CHARGE 🏮</span>
        <span className="val">{compute}</span>
        <span className="unit">bosun</span>
      </div>
    </aside>
  );
}

// D72's held piece — THE DESCENT: the reveal payload types + headline, shared
// between the ceremony's midnight beat and the floor's full board so the two
// never disagree.
export type UnmaskedPayload = {
  named?: string;
  frontman?: string;
  humansWin?: boolean;
  winPath?: "shutdown" | "named" | "none";
  minions?: string[];
};
export type ReceiptRow = { at: string; amount: number; memo: string };

export function ceremonyHeadline(u: UnmaskedPayload): string {
  return u.humansWin
    ? u.winPath === "shutdown"
      ? "THE ROOM PULLED THE PLUG"
      : "THE ROOM SEVERED ITS LAST HAND"
    : "THE MACHINE KEEPS EVERYTHING";
}

// GAPS #6: Ledger Three, rendered — the receipts (times public, names withheld),
// the verdict, and the awards podium. Also the DESCENT's floor/rest stage —
// reused wholesale rather than reimplemented (D72 follow-up brief).
export function CeremonyBoard({
  unmasked,
  receipts,
  awards,
}: {
  unmasked: PublicEvent;
  receipts?: PublicEvent;
  awards?: PublicEvent;
}) {
  const u = unmasked.payload as UnmaskedPayload;
  const rows = ((receipts?.payload as { receipts?: ReceiptRow[] })?.receipts ?? []).slice(-10);
  const pod = (awards?.payload as { awards?: { title: string; winner: string; line: string }[] })?.awards ?? [];
  const headline = ceremonyHeadline(u);
  return (
    <div className="envelope w-full max-w-5xl">
      <h2 className="deco-rule font-display justify-center text-4xl" style={{ color: "var(--gold)" }}>
        {headline}
      </h2>
      <p className="mt-2 text-center text-xl" style={{ color: "var(--ink-dim)" }}>
        {u.winPath === "shutdown"
          ? "The lantern filled — BOSUN had enough to shut CALICO down. "
          : ""}
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

// stage 1 — the title card, depth 0
export function SurfaceCard() {
  return (
    <div className="envelope ceremony-beat text-center">
      <p className="kicker justify-center">the ledger closes</p>
      <h2 className="font-display mt-3 text-6xl" style={{ color: "var(--gold)" }}>
        THE BOOKS CLOSE
      </h2>
      <p className="mt-4 text-lg italic" style={{ color: "var(--ink-dim)" }}>
        the house tallies the night, one line at a time…
      </p>
    </div>
  );
}

// stage 3 — MIDNIGHT: did the room name the front man rightly? (the full
// paragraph, with the frontman's name, is held back for the floor)
export function MidnightVerdict({ unmasked }: { unmasked: PublicEvent }) {
  const u = unmasked.payload as UnmaskedPayload;
  return (
    <div className="envelope ceremony-beat text-center">
      <p className="kicker justify-center">midnight — the verdict</p>
      <h2 className="deco-rule font-display justify-center mt-2 text-4xl" style={{ color: "var(--gold)" }}>
        {ceremonyHeadline(u)}
      </h2>
      <p className="mt-4 text-xl" style={{ color: "var(--ink-dim)" }}>
        The room named <b style={{ color: "var(--ink)" }}>{u.named ?? "(no verdict)"}</b>.
      </p>
    </div>
  );
}

// stage 2 — the descent through THE RECEIPTS: the night's public transactions
// drift past like stations on the way down, most recent first, capped and
// batched into a "…and N more" beat so a busy night never runs forever.
export function ReceiptsDescent({
  rows,
  shown,
  cap,
  showMoreLine,
}: {
  rows: ReceiptRow[];
  shown: number;
  cap: number;
  showMoreLine: boolean;
}) {
  const tail = rows.slice(Math.max(0, rows.length - cap));
  const visible = tail.slice(0, Math.min(shown, cap));
  const hidden = rows.length - cap;
  return (
    <div className="envelope w-full max-w-3xl">
      <p className="kicker justify-center text-center">the descent — every coin on the books</p>
      <ul className="mt-6 flex flex-col gap-2 text-left text-xl" style={{ fontVariantNumeric: "tabular-nums" }}>
        {visible.map((r, i) => (
          <li key={i} className="ceremony-receipt flex justify-between gap-6">
            <span style={{ color: "var(--ink-dim)" }}>{r.at}</span>
            <span className="min-w-0 flex-1 truncate-none">{r.memo}</span>
            <span style={{ color: "var(--danger)" }}>+{r.amount}</span>
          </li>
        ))}
        {showMoreLine && hidden > 0 && (
          <li className="ceremony-receipt mt-2 text-center italic" style={{ color: "var(--ink-dim)" }}>
            …and {hidden} more line{hidden === 1 ? "" : "s"}, all on the books
          </li>
        )}
      </ul>
    </div>
  );
}

// the stage picker: surface → receipts → verdict → floor (CeremonyBoard,
// reused unchanged — it's already the full truth + podium, and IS the rest
// state once the sequence settles there)
export function DescentCeremony({
  unmasked,
  receipts,
  awards,
  stage,
  receiptsShown,
  showMoreLine,
  cap,
}: {
  unmasked: PublicEvent;
  receipts?: PublicEvent;
  awards?: PublicEvent;
  stage: CeremonyStage;
  receiptsShown: number;
  showMoreLine: boolean;
  cap: number;
}) {
  if (stage === "surface") return <SurfaceCard />;
  if (stage === "receipts") {
    const rows = (receipts?.payload as { receipts?: ReceiptRow[] } | undefined)?.receipts ?? [];
    return <ReceiptsDescent rows={rows} shown={receiptsShown} cap={cap} showMoreLine={showMoreLine} />;
  }
  if (stage === "verdict") return <MidnightVerdict unmasked={unmasked} />;
  return (
    <div className="ceremony-floor-enter w-full">
      <CeremonyBoard unmasked={unmasked} receipts={receipts} awards={awards} />
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
