"use client";

// The landing: an Escapement-style frontispiece (D71 — Gallery room 13 as
// taste anchor, MIT). A live movement keeps the house's time above the code
// slot; gears turn at true ratios, the balance wheel breathes, and the whole
// thing stills itself under prefers-reduced-motion. Function unchanged: enter
// a code, or begin a new evening.
//
// D71 interaction pass: below that first, complete screen, a scroll journey
// (the anchor's "the caliber comes apart") pulls the same movement's layers
// apart — chapter ring, great wheel, escapement, balance — each with a
// guest-safe caption plate, ending on a plate that hands you back to the code
// slot. The first-screen Movement is untouched (explode defaults to zero
// offsets / zero pad, so its viewBox and markup render byte-identical to the
// pre-D71 shot); the scroll section owns a second, independent instance.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Pt = { x: number; y: number };

// gear silhouette: alternating outer/root radii around the circle
function gearPath(cx: number, cy: number, rOuter: number, rRoot: number, teeth: number): string {
  const steps = teeth * 4;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const phase = i % 4;
    const r = phase === 0 || phase === 1 ? rOuter : rRoot;
    const a = (i / steps) * Math.PI * 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

// float→string differs between server and client render at full precision —
// round every computed coordinate or hydration flags the SVG
const f = (n: number) => Number(n.toFixed(2));

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const norm = (dx: number, dy: number): Pt => {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
};
const scaleVec = (v: Pt, s: number): Pt => ({ x: f(v.x * s), y: f(v.y * s) });

// static geometry the gear paths/ticks are built from — independent of any
// explode offset, so compute once at module scope rather than every frame
const GREAT_WHEEL_PATH = gearPath(160, 160, 74, 64, 24);
const PINION_PATH = gearPath(236, 118, 33, 26, 12);
const ESCAPE_PATH = gearPath(104, 232, 27, 20, 10);
const CHAPTER_TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2;
  const r1 = i % 5 === 0 ? 138 : 144;
  return {
    key: i,
    x1: f(160 + r1 * Math.cos(a)),
    y1: f(160 + r1 * Math.sin(a)),
    x2: f(160 + 150 * Math.cos(a)),
    y2: f(160 + 150 * Math.sin(a)),
    stroke: i % 5 === 0 ? "var(--gold)" : "var(--border)",
    strokeWidth: i % 5 === 0 ? 1.6 : 1,
    opacity: i % 5 === 0 ? 0.8 : 0.6,
  };
});
const GREAT_WHEEL_SPOKES = Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2;
  return {
    key: i,
    x1: f(160 + 14 * Math.cos(a)),
    y1: f(160 + 14 * Math.sin(a)),
    x2: f(160 + 58 * Math.cos(a)),
    y2: f(160 + 58 * Math.sin(a)),
  };
});

type Offsets = { ring: Pt; greatWheel: Pt; pinion: Pt; escapeWheel: Pt; balance: Pt };
const ZERO: Pt = { x: 0, y: 0 };
const ZERO_OFFSETS: Offsets = { ring: ZERO, greatWheel: ZERO, pinion: ZERO, escapeWheel: ZERO, balance: ZERO };

function Movement({ offsets = ZERO_OFFSETS, pad = 0 }: { offsets?: Offsets; pad?: number }) {
  const vb = 320 + pad * 2;
  return (
    <svg
      viewBox={`${f(-pad)} ${f(-pad)} ${f(vb)} ${f(vb)}`}
      className="movement mx-auto block w-full max-w-[300px]"
      aria-hidden
    >
      {/* chapter ring — lifts away first */}
      <g transform={`translate(${offsets.ring.x} ${offsets.ring.y})`}>
        <circle cx="160" cy="160" r="150" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        {CHAPTER_TICKS.map((t) => (
          <line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.stroke}
            strokeWidth={t.strokeWidth}
            opacity={t.opacity}
          />
        ))}
      </g>
      {/* great wheel — slow. idle spin (inner g) keeps running throughout;
          explode only translates the outer g apart */}
      <g transform={`translate(${offsets.greatWheel.x} ${offsets.greatWheel.y})`}>
        <g className="spin-slow" style={{ transformOrigin: "160px 160px" }}>
          <path d={GREAT_WHEEL_PATH} fill="color-mix(in srgb, var(--gold) 26%, transparent)" stroke="var(--gold)" strokeWidth="1" opacity="0.9" />
          <circle cx="160" cy="160" r="12" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.4" />
          {GREAT_WHEEL_SPOKES.map((s) => (
            <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--gold)" strokeWidth="5" opacity="0.55" />
          ))}
        </g>
      </g>
      {/* pinion — meshes faster, counter-rotating */}
      <g transform={`translate(${offsets.pinion.x} ${offsets.pinion.y})`}>
        <g className="spin-fast" style={{ transformOrigin: "236px 118px" }}>
          <path d={PINION_PATH} fill="color-mix(in srgb, var(--gold) 40%, transparent)" stroke="var(--gold)" strokeWidth="1" />
          <circle cx="236" cy="118" r="5.5" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.2" />
        </g>
      </g>
      {/* escape wheel */}
      <g transform={`translate(${offsets.escapeWheel.x} ${offsets.escapeWheel.y})`}>
        <g className="spin-fast-r" style={{ transformOrigin: "104px 232px" }}>
          <path d={ESCAPE_PATH} fill="color-mix(in srgb, var(--gold) 18%, transparent)" stroke="var(--gold)" strokeWidth="1" opacity="0.85" />
          <circle cx="104" cy="232" r="4.5" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.2" />
        </g>
      </g>
      {/* balance wheel — breathes — travels with its hairspring */}
      <g transform={`translate(${offsets.balance.x} ${offsets.balance.y})`}>
        <g className="balance" style={{ transformOrigin: "232px 236px" }}>
          <circle cx="232" cy="236" r="30" fill="none" stroke="var(--gold)" strokeWidth="2.4" opacity="0.9" />
          <line x1="202" y1="236" x2="262" y2="236" stroke="var(--gold)" strokeWidth="2" opacity="0.7" />
          <circle cx="232" cy="236" r="3.5" fill="var(--gold)" />
        </g>
        {/* hairspring suggestion */}
        <path d="M232 236 m-6 0 a6 6 0 1 1 12 0 a10 10 0 1 1 -20 0 a14 14 0 1 1 28 0" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.5" />
      </g>
    </svg>
  );
}

// ---- exploded-view scroll journey -----------------------------------------

const RING_DIR = { x: 0, y: -1 };
const WHEEL_DIR = norm(-1, -0.3);
const PINION_DIR = norm(76, -42); // center(160,160) → pinion(236,118)
const ESCAPE_DIR = norm(-56, 72); // center(160,160) → escape wheel(104,232)
const BALANCE_DIR = norm(72, 76); // center(160,160) → balance(232,236)

// each group has its own reveal band [start, start+span) along scroll
// progress 0..1; amt is monotonic (never re-merges once separated)
const bandAmt = (p: number, start: number, span = 0.3) => smoothstep(clamp((p - start) / span, 0, 1));

// caption visibility: full opacity on a plateau around each beat's center,
// short linear ramps only at the edges. Captions are spaced 0.20 apart;
// plateau + ramp is kept at (or under) 0.10 so two captions never both read
// > 0 at the same p — otherwise two different strings render stacked at
// partial opacity, illegible double-exposed text rather than a clean
// crossfade (caught by the D71 screenshot pass). A pure linear tent across
// the whole 0.10 half-width was tried first and rejected: it only reaches
// full opacity for an instant at the exact center, so the caption spends
// most of its scroll range barely legible — the plateau gives a solid
// stretch of fully-readable scroll before the next beat crossfades in.
const tent = (p: number, center: number, plateau = 0.05, ramp = 0.05) => {
  const d = Math.abs(p - center);
  return d <= plateau ? 1 : clamp(1 - (d - plateau) / ramp, 0, 1);
};

const CAPTIONS = [
  { id: "ring", roman: "I — THE CHAPTER RING", line: "the night keeps its own hours", center: 0.1 },
  { id: "wheel", roman: "II — THE GREAT WHEEL", line: "every guest a tooth in mesh", center: 0.3 },
  { id: "esc", roman: "III — THE ESCAPEMENT", line: "events, released one at a time", center: 0.5 },
  { id: "bal", roman: "IV — THE BALANCE", line: "it breathes whether you watch it or not", center: 0.7 },
];

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

// isolated so its per-frame state updates don't cascade to the code form /
// clock above — its own component means only this subtree re-renders while
// scrolling
function ExplodeScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let target = 0;
    let shown = 0;
    let raf = 0;

    const readTarget = () => {
      const rect = section.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      target = range > 0 ? clamp(-rect.top / range, 0, 1) : 0;
    };

    if (reduced) {
      // scroll IS user intent under reduced motion too — positions still
      // move — but no lerp lag and no idle motion: snap straight to target,
      // rAF-batched so a burst of scroll events collapses to one update
      let scheduled = false;
      const onScroll = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          readTarget();
          setProgress(target);
        });
      };
      readTarget();
      setProgress(target);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    // scroll listener only ever updates the target — cheap and passive.
    // rendering is throttled to animation frames, and the loop stops itself
    // once it converges rather than ticking forever while idle
    const step = () => {
      shown = lerp(shown, target, 0.15);
      if (Math.abs(shown - target) < 0.0008) {
        shown = target;
        setProgress(shown);
        raf = 0;
        return;
      }
      setProgress(shown);
      raf = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onScroll = () => {
      readTarget();
      kick();
    };
    readTarget();
    setProgress(target);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const offsets: Offsets = {
    ring: scaleVec(RING_DIR, 90 * bandAmt(progress, 0.0)),
    greatWheel: scaleVec(WHEEL_DIR, 55 * bandAmt(progress, 0.16)),
    pinion: scaleVec(PINION_DIR, 95 * bandAmt(progress, 0.34)),
    escapeWheel: scaleVec(ESCAPE_DIR, 100 * bandAmt(progress, 0.34)),
    balance: scaleVec(BALANCE_DIR, 115 * bandAmt(progress, 0.52)),
  };
  const pad = f(140 * smoothstep(clamp(progress / 0.85, 0, 1)));
  const endOpacity = smoothstep(clamp((progress - 0.8) / 0.16, 0, 1));

  return (
    <section ref={sectionRef} className="explode-scene" aria-label="the movement comes apart, part by part">
      <div className="explode-sticky">
        <Movement offsets={offsets} pad={pad} />
        <div className="explode-captions">
          {CAPTIONS.map((c, i) => (
            <div key={c.id} className="explode-caption" style={{ opacity: tent(progress, c.center) }}>
              <p className="kicker">{c.roman}</p>
              <p className="explode-line font-display">{c.line}</p>
            </div>
          ))}
          <div className="explode-caption explode-end" style={{ opacity: endOpacity }}>
            <p className="explode-line font-display">wound and waiting.</p>
            <p className="kicker">— est. tonight</p>
            <a href="#top" className="explode-back text-sm underline">
              ↑ whisper the code again
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [code, setCode] = useState("");
  const [now, setNow] = useState<string | null>(null);
  const router = useRouter();

  // the house keeps your time — client-only to dodge hydration drift
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div id="top" className="themed theme-manor escapement min-h-dvh">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
        /* horizontal-overflow guard lives on body, not on .escapement or any
           ancestor of .explode-sticky: giving overflow-x a non-visible
           value on a plain element forces its overflow-y to compute as
           "auto" per the CSS Overflow spec, turning that element into a
           scroll container — and position:sticky resolves against the
           *nearest scrolling ancestor*, so any div between the sticky node
           and the viewport that picks up overflow this way silently breaks
           it. body/html get a special "propagate to the viewport" carve-out
           that ordinary elements don't, so this is the one safe place to
           put it (caught by the D71 screenshot pass — .escapement itself
           had this exact bug). */
        body { overflow-x: hidden; }
        .escapement { background:
          radial-gradient(90% 55% at 50% 30%, color-mix(in srgb, var(--gold) 8%, transparent), transparent 65%),
          var(--bg); }
        .escapement .spin-slow   { animation: esc-spin 90s linear infinite; }
        .escapement .spin-fast   { animation: esc-spin 30s linear infinite reverse; }
        .escapement .spin-fast-r { animation: esc-spin 22s linear infinite; }
        .escapement .balance     { animation: esc-breathe 1.6s ease-in-out infinite alternate; }
        @keyframes esc-spin { to { transform: rotate(360deg); } }
        @keyframes esc-breathe { from { transform: rotate(-16deg); } to { transform: rotate(16deg); } }
        @media (prefers-reduced-motion: reduce) {
          .escapement .spin-slow, .escapement .spin-fast, .escapement .spin-fast-r, .escapement .balance { animation: none; }
        }
        .escapement .frame-rule { display: flex; align-items: center; gap: 0.9rem; }
        .escapement .frame-rule::before, .escapement .frame-rule::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, color-mix(in srgb, var(--gold) 45%, transparent), transparent);
        }
        .escapement .timeline { font-variant-numeric: tabular-nums; letter-spacing: 0.22em; }

        .escapement .scroll-hint { display: flex; align-items: center; justify-content: center; gap: 0.4em;
          font-size: 0.62rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-dim); opacity: 0.65; }
        .escapement .scroll-hint .hint-tick { display: inline-block; color: var(--gold); animation: esc-hint-nudge 2.2s ease-in-out infinite; }
        @keyframes esc-hint-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        @media (prefers-reduced-motion: reduce) { .escapement .scroll-hint .hint-tick { animation: none; } }

        .escapement .explode-scene { position: relative; height: 380vh; }
        .escapement .explode-sticky {
          position: sticky; top: 0; height: 100dvh; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1.75rem; padding: 2rem 1.25rem;
        }
        .escapement .explode-sticky .movement { max-width: 340px; }
        .escapement .explode-captions { position: relative; width: 100%; max-width: 26rem; min-height: 5.5rem; pointer-events: none; }
        .escapement .explode-caption {
          position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
          gap: 0.4rem; text-align: center;
        }
        .escapement .explode-line { font-size: 1.1rem; color: var(--gold); }
        .escapement .explode-end .explode-line { font-size: 1.3rem; }
        .escapement .explode-back { pointer-events: auto; color: var(--ink-dim); margin-top: 0.3rem; }
      `}</style>

      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between gap-6 p-6 text-center">
        <header className="w-full pt-4">
          <p className="frame-rule kicker justify-center">the house keeps your time</p>
        </header>

        <div className="flex w-full flex-col items-center gap-6">
          <div className="relative w-full">
            <Movement />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <h1
                className="font-display text-[3.4rem] leading-none tracking-[0.14em]"
                style={{ color: "var(--gold)", textShadow: "0 2px 24px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.9)" }}
              >
                PARLOUR
              </h1>
              <p className="mt-2 text-sm italic" style={{ color: "var(--ink)", textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}>
                An evening you were warned about.
              </p>
            </div>
          </div>

          <form
            className="panel panel-hero flex w-full flex-col gap-3 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) router.push(`/g/${code.trim().toUpperCase()}`);
            }}
          >
            <label className="text-sm" style={{ color: "var(--ink-dim)" }}>
              You were given a code. Whisper it here.
            </label>
            <input
              className="input text-center text-2xl tracking-[0.5em] uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="····"
              // no autoFocus (D71 interaction pass): on mobile, an autofocused
              // input pops the virtual keyboard on load, which shrinks the
              // dvh viewport mid-layout and auto-scrolls to the field — both
              // fight the new scroll journey below and the first screen's own
              // "above the fold" contract. Tap-to-focus costs one tap; a
              // fighting keyboard costs the first impression.
            />
            <button className="btn" type="submit" disabled={!code.trim()}>
              Enter
            </button>
          </form>

          <Link href="/new" className="text-sm underline" style={{ color: "var(--ink-dim)" }}>
            I am the host — begin a new evening
          </Link>
        </div>

        <footer className="flex w-full flex-col gap-3 pb-2">
          <div className="flex w-full items-baseline justify-between text-[0.65rem] tracking-[0.18em] uppercase" style={{ color: "var(--ink-dim)" }}>
            <span>est. tonight</span>
            <span className="timeline">{now ? `local time ${now}` : " "}</span>
          </div>
          <p className="scroll-hint">
            scroll — the movement comes apart <span className="hint-tick">▾</span>
          </p>
        </footer>
      </main>

      <ExplodeScene />
    </div>
  );
}
