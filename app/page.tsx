"use client";

// The landing: an Escapement-style frontispiece (D71 — Gallery room 13 as
// taste anchor, MIT). A live movement keeps the house's time above the code
// slot; gears turn at true ratios, the balance wheel breathes, and the whole
// thing stills itself under prefers-reduced-motion. Function unchanged: enter
// a code, or begin a new evening.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function Movement() {
  return (
    <svg viewBox="0 0 320 320" className="movement mx-auto block w-full max-w-[300px]" aria-hidden>
      {/* chapter ring */}
      <circle cx="160" cy="160" r="150" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const r1 = i % 5 === 0 ? 138 : 144;
        return (
          <line
            key={i}
            x1={f(160 + r1 * Math.cos(a))}
            y1={f(160 + r1 * Math.sin(a))}
            x2={f(160 + 150 * Math.cos(a))}
            y2={f(160 + 150 * Math.sin(a))}
            stroke={i % 5 === 0 ? "var(--gold)" : "var(--border)"}
            strokeWidth={i % 5 === 0 ? 1.6 : 1}
            opacity={i % 5 === 0 ? 0.8 : 0.6}
          />
        );
      })}
      {/* great wheel — slow */}
      <g className="spin-slow" style={{ transformOrigin: "160px 160px" }}>
        <path d={gearPath(160, 160, 74, 64, 24)} fill="color-mix(in srgb, var(--gold) 26%, transparent)" stroke="var(--gold)" strokeWidth="1" opacity="0.9" />
        <circle cx="160" cy="160" r="12" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.4" />
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <line key={i} x1={f(160 + 14 * Math.cos(a))} y1={f(160 + 14 * Math.sin(a))} x2={f(160 + 58 * Math.cos(a))} y2={f(160 + 58 * Math.sin(a))} stroke="var(--gold)" strokeWidth="5" opacity="0.55" />
          );
        })}
      </g>
      {/* pinion — meshes faster, counter-rotating */}
      <g className="spin-fast" style={{ transformOrigin: "236px 118px" }}>
        <path d={gearPath(236, 118, 33, 26, 12)} fill="color-mix(in srgb, var(--gold) 40%, transparent)" stroke="var(--gold)" strokeWidth="1" />
        <circle cx="236" cy="118" r="5.5" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.2" />
      </g>
      {/* escape wheel */}
      <g className="spin-fast-r" style={{ transformOrigin: "104px 232px" }}>
        <path d={gearPath(104, 232, 27, 20, 10)} fill="color-mix(in srgb, var(--gold) 18%, transparent)" stroke="var(--gold)" strokeWidth="1" opacity="0.85" />
        <circle cx="104" cy="232" r="4.5" fill="var(--bg)" stroke="var(--gold)" strokeWidth="1.2" />
      </g>
      {/* balance wheel — breathes */}
      <g className="balance" style={{ transformOrigin: "232px 236px" }}>
        <circle cx="232" cy="236" r="30" fill="none" stroke="var(--gold)" strokeWidth="2.4" opacity="0.9" />
        <line x1="202" y1="236" x2="262" y2="236" stroke="var(--gold)" strokeWidth="2" opacity="0.7" />
        <circle cx="232" cy="236" r="3.5" fill="var(--gold)" />
      </g>
      {/* hairspring suggestion */}
      <path d="M232 236 m-6 0 a6 6 0 1 1 12 0 a10 10 0 1 1 -20 0 a14 14 0 1 1 28 0" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.5" />
    </svg>
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
    <div className="themed theme-manor escapement min-h-dvh">
      <style>{`
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
              autoFocus
            />
            <button className="btn" type="submit" disabled={!code.trim()}>
              Enter
            </button>
          </form>

          <Link href="/new" className="text-sm underline" style={{ color: "var(--ink-dim)" }}>
            I am the host — begin a new evening
          </Link>
        </div>

        <footer className="flex w-full items-baseline justify-between pb-2 text-[0.65rem] tracking-[0.18em] uppercase" style={{ color: "var(--ink-dim)" }}>
          <span>est. tonight</span>
          <span className="timeline">{now ? `local time ${now}` : " "}</span>
        </footer>
      </main>
    </div>
  );
}
