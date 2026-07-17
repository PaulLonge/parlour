"use client";

// THE COCKPIT (D30, rethought per D73): Paul's solo-run instrument panel. Not
// a dev readout — every guest capability funnels through here: possess anyone
// (pseudo-accounts make this free — possession IS the takeover flow), watch
// the record, drive the director's heartbeat, judge the run. Design language:
// the case-file face (this is the investigator's desk) with instrument-panel
// touches (gauges, punch-card seats, stamp-chip events) — host/dev-facing
// only, never shown to a guest. Shows no secrets a possessed player couldn't
// see themselves — switch seats to see their world.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useGame, type PublicEvent } from "@/lib/client/useGame";
import { EvidenceBoard } from "@/lib/client/evidence-board";

// ---------------------------------------------------------------------------
// small deterministic helpers (no shared module — same reimplement-locally
// pattern as evidence-board.tsx / guide's tilt())
// ---------------------------------------------------------------------------
function tiltFor(seed: string, spread = 1.4): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return (((h % 200) - 100) / 100) * spread;
}

function relTime(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function titleCase(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PHASE_LABEL: Record<string, string> = {
  none: "",
  social: "the evening unfolds",
  murder_window: "candles gutter",
  body_found: "something's happened",
  assembly: "assembly",
  vote: "the vote is open",
  banishment: "judgement",
  parley: "parley",
  accusation: "accusation on the table",
};

const STATUS_META: Record<string, { icon: string; label: string; tone?: string }> = {
  lobby: { icon: "…", label: "lobby" },
  alive: { icon: "●", label: "in play" },
  dead: { icon: "☠", label: "dead", tone: "var(--danger)" },
  ghost: { icon: "👻", label: "ghost", tone: "var(--ink-dim)" },
  banished: { icon: "⛔", label: "banished", tone: "var(--danger)" },
};

// humanize a public event into one readable line. Raw JSON always stays
// available behind a <details> per row — this is the reading, not the source.
function humanizeEvent(e: PublicEvent): string {
  const p = e.payload ?? {};
  const s = (v: unknown, fallback = "?") => (v === null || v === undefined ? fallback : String(v));
  switch (e.type) {
    case "phase_advanced":
      return `phase: ${s(p.from)} → ${s(p.to)}`;
    case "reveal_roles":
      return "roles revealed to the table";
    case "announce":
      return s(p.text, "an announcement");
    case "hijack":
      return `THE HIJACK fires — ${s(p.beat, "new management")}`;
    case "frontman_turned":
      return `${s(p.player)} turns — redeemed, the hat falls`;
    case "frontman_rotated":
      return s(p.note, "the front man's hat moves to someone new");
    case "parley_called":
      return `parley called by ${s(p.by)}`;
    case "parley_ended":
      return "parley ends";
    case "accusation_opened":
      return "an accusation opens the floor";
    case "accusation_closed":
      return `accusation closed — ${s(p.outcome, "no verdict").replace(/_/g, " ")}`;
    case "unmasking_opened":
      return "THE UNMASKING opens";
    case "unmasking_resolved":
      return `${p.humansWin ? "the table wins" : "CALICO wins"} — ${s(p.winPath, "")}`.trim();
    case "burning":
      return `${s(p.player)} burns (${s(p.votes, "0")} votes) — +${s(p.compute, "0")} 🏮`;
    case "wrongful_accusation":
      return `${s(p.player)} wrongly accused (${s(p.votes, "0")} votes)`;
    case "bounty_posted":
      return `bounty posted: ${s(p.brief, "a bounty")} (+${s(p.reward, "0")})`;
    case "bounty_claimed":
      return `${s(p.winner)} claims the bounty: ${s(p.brief, "")}`;
    case "wager_accepted":
      return `${s(p.challenger)} vs ${s(p.opponent)} — Ƀ${s(p.amount, "0")} on "${s(p.game, "")}"`;
    case "wager_settled":
      return `${s(p.winner)} beats ${s(p.loser)} — Ƀ${s(p.amount, "0")}`;
    case "wager_voided":
      return "a wager is voided, stakes refunded";
    case "meters_changed":
      return s(
        p.line,
        `meters shift — ☠${s((p.meters as { plunder?: unknown })?.plunder, "?")} / 🏮${s((p.meters as { compute?: unknown })?.compute, "?")}`
      );
    case "compute_complete":
      return "the lantern is full — 🏮 target reached";
    case "plunder_complete":
      return "the hold is full — ☠ target reached";
    case "vote_closed":
      return p.outcome === "no_banishment" ? `no banishment — ${s(p.reason, "")}` : "the vote closes";
    case "player_banished":
      return `${s(p.player)} is banished (${s(p.votes, "0")} votes)${p.wasTraitor ? " — a traitor" : ""}`;
    case "blackmail_leaked":
      return s(p.text, "a secret leaks");
    case "final_awards":
      return "final awards handed out";
    case "rogue_tempo":
      return s(p.note, "tempo shifts");
    case "receipts":
      return "the receipts are drawn up";
    case "tutorial_step":
      return `🎓 induction step ${Number(p.step ?? 0) + 1}/${s(p.of, "?")}: ${s(p.title, "")}`;
    case "tutorial_step_done":
      return `🎓 induction step ${Number(p.step ?? 0) + 1} done${p.skipped ? " (skipped)" : ""}`;
    case "tutorial_complete":
      return `🎓 induction complete — ${s(p.passed, "0")} passed`;
    default: {
      const bits = Object.entries(p)
        .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`);
      return bits.length ? `${titleCase(e.type)} — ${bits.join(", ")}` : titleCase(e.type);
    }
  }
}

function Gauge({ label, value }: { label: string; value: string }) {
  return (
    <div className="gauge">
      <span className="gauge-label">{label}</span>
      <span className="gauge-value">{value}</span>
    </div>
  );
}

export default function Sandbox({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [possessNote, setPossessNote] = useState("");
  const [tickBusy, setTickBusy] = useState(false);
  const [tickNote, setTickNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // keeps "last stirred Xm ago" honest without a per-second re-render
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (g.loading) return null;
  if (!g.game)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p>No such evening.</p>
      </main>
    );

  const game = g.game;
  const timeScale = Number(game.config?.timeScale ?? 1);
  const currencySym = game.story_public?.currency?.symbol ?? "Ƀ";
  const isTutorial = Boolean(game.config?.tutorial);
  const tutorialComplete = isTutorial && g.publicEvents.some((e) => e.type === "tutorial_complete");
  const tutorialStep = isTutorial ? g.publicEvents.find((e) => e.type === "tutorial_step") : undefined;
  const lastEvent = g.publicEvents[0];

  // possess() — the join-takeover flow, UNCHANGED (D73 seat-hygiene fix lives
  // in /api/join; this page must not touch it).
  async function possess(name: string) {
    setBusy(true);
    setPossessNote("");
    try {
      const r = await g.actions.join(name, true); // takeover — the sandbox IS the device swap
      if (!r.ok && !r.playerId && !r.rejoined) setPossessNote(`couldn't become ${name}: ${r.error ?? "unknown"}`);
    } catch {
      setPossessNote("network hiccup — try again");
    } finally {
      setBusy(false);
    }
  }

  async function crankTick() {
    setTickBusy(true);
    setTickNote("");
    try {
      const r = (await g.actions.tick()) as { skipped?: string; moves?: number };
      setTickNote(
        r.skipped ? `stood down — ${r.skipped}` : `stirred — ${r.moves ?? 0} move${r.moves === 1 ? "" : "s"} made`
      );
    } catch {
      setTickNote("network hiccup — try again");
    } finally {
      setTickBusy(false);
    }
  }

  return (
    <main className="cockpit mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
      <style>{`
        .cockpit { --cockpit-tab: color-mix(in srgb, var(--gold) 16%, var(--panel-solid)); }

        /* ---- THE NIGHT AT A GLANCE : gauge/file-tab chips -------------- */
        .gauge-strip { display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .gauge {
          display: flex; flex-direction: column; gap: 0.1rem;
          padding: 0.4rem 0.65rem;
          border: 1px solid var(--border);
          border-radius: calc(var(--radius) * 0.5);
          background: var(--cockpit-tab);
          min-width: 3.6rem;
        }
        .gauge-label {
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--ink-dim);
        }
        .gauge-value { font-size: 0.85rem; font-weight: 700; color: var(--ink); white-space: nowrap; }

        /* ---- SEATS : punch-card roster ---------------------------------- */
        .seat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.55rem;
        }
        .seat-card {
          position: relative;
          text-align: left;
          padding: 0.6rem 0.65rem 0.5rem;
          border-radius: calc(var(--radius) * 0.6);
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--panel-solid) 90%, var(--gold) 3%);
          display: flex; flex-direction: column; gap: 0.3rem;
          transform: rotate(var(--seat-tilt, 0deg));
        }
        .seat-card::before {
          content: ""; position: absolute; top: 0.5rem; right: 0.55rem;
          width: 9px; height: 9px; border-radius: 999px;
          border: 1.5px solid var(--border-strong); background: transparent;
        }
        .seat-card:disabled { opacity: 0.5; cursor: default; }
        .seat-card:not(:disabled):active { transform: rotate(var(--seat-tilt, 0deg)) scale(0.97); }
        .seat-active {
          border-color: var(--gold);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 55%, transparent), 2px 4px 10px rgba(0, 0, 0, 0.3);
        }
        .seat-active::before {
          background: var(--gold); border-color: var(--gold);
          box-shadow: 0 0 4px color-mix(in srgb, var(--gold) 70%, transparent);
        }
        .seat-active::after {
          content: ""; position: absolute; top: -7px; left: 10px;
          width: 30px; height: 8px; background: var(--gold);
          border-radius: 3px 3px 0 0; opacity: 0.9;
        }
        .seat-name { font-weight: 700; font-size: 0.88rem; color: var(--ink); word-break: break-word; }
        .seat-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; color: var(--ink-dim); }
        .seat-arrived { color: var(--gold); }

        /* ---- CONTROLS : the crank ---------------------------------------- */
        .crank-btn { position: relative; }
        .crank-pulse { animation: crank-pulse 1s ease-in-out infinite; }
        @keyframes crank-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        @media (prefers-reduced-motion: reduce) { .crank-pulse { animation: none; } }

        /* ---- THE RECORD : stamp-chip rows -------------------------------- */
        .record-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px dashed var(--border); }
        .record-row:last-child { border-bottom: none; }
        .record-stamp {
          flex: none;
          font-family: var(--font-body);
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
          color: var(--gold); border: 1px solid var(--border-strong); border-radius: 3px;
          padding: 0.12em 0.4em;
          transform: rotate(var(--stamp-tilt, 0deg));
          white-space: nowrap;
        }
        .record-line { flex: 1 1 auto; min-width: 0; font-size: 0.78rem; color: var(--ink); }
        .record-raw summary { cursor: pointer; font-size: 0.65rem; color: var(--ink-dim); }
        .record-raw pre {
          margin-top: 0.25rem; font-size: 0.65rem; white-space: pre-wrap; word-break: break-word;
          color: var(--ink-dim); background: rgba(0, 0, 0, 0.2); padding: 0.4rem; border-radius: 3px;
        }
      `}</style>

      <header className="panel panel-hero p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="kicker">the cockpit — {game.code}</p>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold)" }}>
              {game.title}
            </h1>
          </div>
        </div>
        <div className="gauge-strip mt-3">
          <Gauge label="mode" value={game.mode} />
          <Gauge label="status" value={game.status} />
          {game.round_phase !== "none" && (
            <Gauge label="phase" value={PHASE_LABEL[game.round_phase] ?? game.round_phase} />
          )}
          {game.round_no > 0 && <Gauge label="round" value={String(game.round_no)} />}
          <Gauge label="time" value={`×${timeScale}${timeScale > 1 ? " ⏩" : ""}`} />
          <Gauge label="☠ grip" value={String(game.meters?.plunder ?? 0)} />
          <Gauge label="🏮 weapon" value={String(game.meters?.compute ?? 0)} />
          {isTutorial && (
            <Gauge
              label="induction"
              value={
                tutorialComplete
                  ? "complete"
                  : tutorialStep
                    ? `${Number((tutorialStep.payload as { step?: number }).step ?? 0) + 1}/${(tutorialStep.payload as { of?: number }).of ?? "?"}`
                    : "starting…"
              }
            />
          )}
        </div>
      </header>

      <div className="panel p-4">
        <div className="flex items-baseline justify-between">
          <p className="kicker">the roster — tap a seat to possess</p>
          {g.me && (
            <span className="text-sm italic" style={{ color: "var(--gold)" }}>
              currently: {g.me.name}
              {typeof g.me.balance === "number" ? ` · ${currencySym}${g.me.balance}` : ""}
            </span>
          )}
        </div>
        <div className="seat-grid mt-2">
          {g.roster.map((p) => {
            const meta = STATUS_META[p.status] ?? { icon: "•", label: p.status };
            const active = g.me?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`seat-card${active ? " seat-active" : ""}`}
                style={{ "--seat-tilt": `${tiltFor(p.id)}deg` } as React.CSSProperties}
                disabled={busy}
                aria-pressed={active}
                onClick={() => possess(p.name)}
              >
                <span className="seat-name">
                  {p.name}
                  {p.is_host ? " ✦" : ""}
                </span>
                <span className="seat-meta">
                  <span style={meta.tone ? { color: meta.tone } : undefined}>
                    {meta.icon} {meta.label}
                  </span>
                  {p.arrived_at && <span className="seat-arrived">· arrived</span>}
                </span>
              </button>
            );
          })}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) {
              possess(newName.trim());
              setNewName("");
            }
          }}
        >
          <input
            className="input"
            placeholder="add a test guest…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn btn-ghost" disabled={busy || !newName.trim()}>
            Add
          </button>
        </form>
        {possessNote && (
          <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>
            {possessNote}
          </p>
        )}
      </div>

      <div className="panel p-4">
        <p className="kicker">controls</p>
        <div className="mt-2 flex gap-2">
          <Link href={`/g/${game.code}`} className="btn w-full text-center">
            ▶ Play as {g.me?.name ?? "…"}
          </Link>
          <Link href={`/tv/${game.code}`} className="btn btn-ghost w-full text-center">
            📺 Spyglass
          </Link>
        </div>
        <button
          type="button"
          className="btn btn-ghost crank-btn mt-2 w-full"
          disabled={tickBusy}
          onClick={crankTick}
        >
          <span className={tickBusy ? "crank-pulse" : undefined}>♥</span>&nbsp;tick the director
        </button>
        <p className="mt-1 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
          {tickNote ? tickNote : lastEvent ? `last stirred ${relTime(lastEvent.created_at, now)} — ${humanizeEvent(lastEvent)}` : "no record yet"}
        </p>
        <p className="mt-3 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          Tip: possess here, act there — open the player view in a second tab alongside this one. Set{" "}
          <code>config.timeScale</code> (e.g. 10) at creation to fast-forward every timer, or crank the director
          above when a step is waiting on the AI.
        </p>
        <Link href="/guide" className="mt-2 block text-center text-sm underline" style={{ color: "var(--ink-dim)" }}>
          📖 The manual — how the evening works
        </Link>
      </div>

      <div className="panel p-4">
        <p className="kicker">the record</p>
        <div className="mt-2">
          {g.publicEvents.slice(0, 15).map((e) => (
            <div key={e.id} className="record-row">
              <span className="record-stamp" style={{ "--stamp-tilt": `${tiltFor(String(e.id) + e.type)}deg` } as React.CSSProperties}>
                {e.type}
              </span>
              <span className="record-line">{humanizeEvent(e)}</span>
              <details className="record-raw w-full">
                <summary>raw</summary>
                <pre>{JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            </div>
          ))}
          {g.publicEvents.length === 0 && (
            <p className="text-sm italic" style={{ color: "var(--ink-dim)" }}>
              Nothing on the record yet.
            </p>
          )}
        </div>
      </div>

      <div className="panel p-4">
        <p className="kicker">verdict notes — the board</p>
        <p className="mb-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          Yours alone — never leaves this phone.
        </p>
        <EvidenceBoard storageKey={`parlour-verdict-${game.code}`} />
      </div>
    </main>
  );
}
