"use client";

// THE PAPER PACK (backlog #4): a host-only printable A4 kit for the physical
// side of the night — D21's "host-declared inventory" made concrete. Seat
// codes come from the SAME host-only lookup HostTools uses on /g/[code]
// (POST /api/breakglass { action: "read_seats" }, authorized server-side via
// getCaller().player.is_host — see app/api/breakglass/route.ts). We never
// duplicate that check client-side; we just render whatever it decides.
// No engine/API changes, no deps — plain CSS, scoped by the .print-pack
// class, with a real @media print pass (white ground, black ink, buttons
// gone) plus @page for A4.

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/client/useGame";
import { GLYPHS, GLYPH_WINDOW_MINUTES } from "@/lib/engine/glyphs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const HOST_DENIED = "the house doesn't know you as the host.";
const SLIP_COUNT = 12;

type SeatRow = { name: string; seat_code: string | null };

export default function PrintPackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [seats, setSeats] = useState<SeatRow[] | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  // guards a single lookup per code — refetch()s elsewhere (realtime, focus
  // resync) must not re-fire the host check on every poll
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!g.game || startedFor.current === code) return;
    startedFor.current = code;
    setSeats(null);
    setDenied(null);
    g.actions.breakglass("read_seats").then((r) => {
      if (r.ok) setSeats(r.seats ?? []);
      else setDenied(HOST_DENIED);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.game, code]);

  if (g.loading)
    return (
      <Center>
        <p className="candle italic" style={{ color: "var(--ink-dim)" }}>
          Consulting the house…
        </p>
      </Center>
    );
  if (g.error)
    return (
      <Center>
        <p>{g.error}</p>
        <button className="btn mt-4" onClick={() => g.refetch()}>
          Try again
        </button>
      </Center>
    );
  if (!g.game)
    return (
      <Center>
        <p>No such evening. Check your code.</p>
        <Link className="btn btn-ghost mt-4" href="/">
          Back
        </Link>
      </Center>
    );
  if (denied)
    return (
      <Center>
        <p className="kicker kicker-danger">host eyes only</p>
        <p className="mt-2">The house doesn&rsquo;t know you as the host.</p>
        <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Open this from the same phone you used to create or run tonight&rsquo;s game.
        </p>
        <Link className="btn btn-ghost mt-4" href={`/g/${g.game.code}`}>
          Back to the game
        </Link>
      </Center>
    );
  if (!seats)
    return (
      <Center>
        <p className="italic" style={{ color: "var(--ink-dim)" }}>
          Checking whether the house knows you as host…
        </p>
      </Center>
    );

  const game = g.game;
  const title = game.story_public?.meta?.title ?? game.title;
  const byName = new Map(seats.map((s) => [s.name, s.seat_code]));

  return (
    <main className="print-pack themed theme-decoy">
      <header>
        <p className="kicker kicker-danger no-print">host eyes only — seat codes inside</p>
        <h1 className="pp-h1">THE PAPER PACK</h1>
        <p className="pp-sub">
          {title} · code {game.code}
        </p>
        <div className="pp-actions no-print">
          <button className="btn" onClick={() => window.print()}>
            🖨 Print the pack
          </button>
          <Link className="btn btn-ghost" href={`/g/${game.code}`}>
            ← back to the game
          </Link>
        </div>
      </header>

      <section className="pp-section">
        <h2 className="pp-h2">1 · Seat cards</h2>
        <p className="pp-note no-print">
          One per player currently on the roster. Cut along the dashed lines and hand them out —
          each is that guest's re-entry code if their phone dies mid-party.
        </p>
        {g.roster.length === 0 ? (
          <p className="pp-empty">Nobody&rsquo;s joined yet — reprint once the guest list fills in.</p>
        ) : (
          <div className="seat-grid">
            {g.roster.map((p) => (
              <div key={p.id} className="cut-card seat-card">
                <p className="seat-card-name">
                  {p.name}
                  {p.is_host ? " ✦" : ""}
                </p>
                <p className="seat-card-code">
                  {p.is_host ? "— already inside —" : (byName.get(p.name) ?? "—")}
                </p>
                <p className="seat-card-join">
                  join at {BASE_URL || "the house"} · code {game.code}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pp-section">
        <h2 className="pp-h2">2 · Blank code slips</h2>
        <p className="pp-note no-print">
          Twelve slips, unwritten. Pick a code, write it by hand, hide it — the paper is the
          secret, not the printer.
        </p>
        <div className="slip-grid">
          {Array.from({ length: SLIP_COUNT }).map((_, i) => (
            <div key={i} className="cut-card slip-card">
              <p className="slip-kicker">Property of the House</p>
              <p className="slip-flavor">found is kept · read once · told to none</p>
              <div className="slip-box" aria-hidden />
              <p className="slip-hint-label">write the code above, then hide it well</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-section">
        <h2 className="pp-h2">3 · The glyph sheet</h2>
        <p className="pp-note">for the conductor&rsquo;s pocket — not for the walls.</p>
        <table className="glyph-table">
          <thead>
            <tr>
              <th>mark</th>
              <th>word</th>
            </tr>
          </thead>
          <tbody>
            {GLYPHS.map((glyph) => (
              <tr key={glyph.key}>
                <td className="glyph-emoji">{glyph.emoji}</td>
                <td>{glyph.word}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pp-note mt-2">
          A guest&rsquo;s phone shows one of these, rotating every {GLYPH_WINDOW_MINUTES} minutes. To
          verify someone, make them SHOW you theirs — never say your own aloud.
        </p>
      </section>

      <style>{`
        .print-pack { max-width: 920px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
        .print-pack .pp-h1 { font-family: var(--font-display); font-size: 2.1rem; color: var(--gold); margin-top: 0.6rem; }
        .print-pack .pp-sub { color: var(--ink-dim); margin-bottom: 1rem; }
        .print-pack .pp-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1rem 0 2.5rem; }
        .print-pack .pp-section { margin-bottom: 3rem; }
        .print-pack .pp-h2 {
          font-family: var(--font-display); font-size: 1.2rem; letter-spacing: 0.06em;
          color: var(--gold); border-bottom: 1px solid var(--border-strong);
          padding-bottom: 0.4rem; margin-bottom: 0.8rem;
        }
        .print-pack .pp-note { font-size: 0.85rem; color: var(--ink-dim); font-style: italic; margin-bottom: 0.9rem; }
        .print-pack .pp-empty { font-size: 0.9rem; color: var(--ink-dim); font-style: italic; }

        .print-pack .cut-card {
          border: 2px dashed var(--border-strong); border-radius: 4px; padding: 1rem;
          position: relative; background: var(--panel-solid);
        }
        .print-pack .cut-card::before {
          content: "✂"; position: absolute; top: -0.65em; left: 0.7em; font-size: 0.85rem;
          color: var(--ink-dim); background: var(--bg); padding: 0 0.25em; line-height: 1;
        }

        .print-pack .seat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; }
        .print-pack .seat-card-name { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; }
        .print-pack .seat-card-code { font-size: 1.5rem; letter-spacing: 0.22em; color: var(--gold); font-weight: 700; margin: 0.4rem 0; }
        .print-pack .seat-card-join { font-size: 0.68rem; color: var(--ink-dim); }

        .print-pack .slip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .print-pack .slip-kicker { font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--seal); font-weight: 700; }
        .print-pack .slip-flavor { font-size: 0.68rem; font-style: italic; color: var(--ink-dim); margin: 0.25rem 0 0.75rem; }
        .print-pack .slip-box { border: 1px solid var(--border-strong); border-radius: 3px; height: 2.4rem; background: rgba(255, 255, 255, 0.35); }
        .print-pack .slip-hint-label { font-size: 0.6rem; color: var(--ink-dim); margin-top: 0.4rem; }

        .print-pack .glyph-table { border-collapse: collapse; width: 100%; max-width: 320px; }
        .print-pack .glyph-table th, .print-pack .glyph-table td { border: 1px solid var(--border); padding: 0.45rem 0.9rem; text-align: left; }
        .print-pack .glyph-emoji { font-size: 1.35rem; text-align: center; }

        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-pack { background: #fff !important; color: #000 !important; max-width: none; padding: 0; }
          .print-pack, .print-pack * { box-shadow: none !important; text-shadow: none !important; backdrop-filter: none !important; }
          .print-pack .pp-h1, .print-pack .pp-h2, .print-pack .seat-card-code, .print-pack .slip-kicker,
          .print-pack .seat-card-name, .print-pack .glyph-emoji, .print-pack td, .print-pack th {
            color: #000 !important;
          }
          .print-pack .pp-sub, .print-pack .pp-note, .print-pack .pp-empty,
          .print-pack .seat-card-join, .print-pack .slip-flavor, .print-pack .slip-hint-label {
            color: #333 !important;
          }
          .print-pack .cut-card { background: #fff !important; border-color: #000 !important; }
          .print-pack .cut-card::before { background: #fff !important; color: #000 !important; }
          .print-pack .slip-box { background: #fff !important; border-color: #000 !important; }
          .print-pack .glyph-table th, .print-pack .glyph-table td { border-color: #000 !important; }
          .print-pack .pp-h2 { border-bottom-color: #000 !important; }
          .print-pack .seat-grid { grid-template-columns: repeat(2, 1fr); }
          .print-pack .slip-grid { grid-template-columns: repeat(3, 1fr); }
          .print-pack .pp-section { break-after: page; page-break-after: always; }
          .print-pack .pp-section:last-child { break-after: auto; page-break-after: auto; }
          .print-pack .cut-card { break-inside: avoid; page-break-inside: avoid; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}
