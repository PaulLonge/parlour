"use client";

// Pure presentational pieces shared by the live game (/g/[code]) and the
// no-database design preview (/preview). Style ONLY via theme variables.

import { useState } from "react";
import type { Challenge, Msg } from "./useGame";

export type CharacterData = {
  personaName?: string;
  archetype?: string;
  publicBlurb?: string;
  costumeHint?: string;
  background?: string;
  connections?: { personaName: string; what: string }[];
  secret?: string;
  mannerism?: string;
} | null;

export function CharacterSheet({ ch, defaultOpen = false }: { ch: CharacterData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!ch) return null;
  return (
    <div className="panel panel-hero p-5">
      <button className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <span className="font-display text-2xl leading-tight" style={{ color: "var(--gold)" }}>
          {ch.personaName}
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
          {open ? "conceal ▴" : "unfold ▾"}
        </span>
      </button>
      <p className="mt-0.5 text-sm italic" style={{ color: "var(--ink-dim)" }}>
        {ch.archetype}
      </p>
      {open && (
        <div className="mt-4 flex flex-col gap-4 text-[0.95rem] leading-relaxed">
          <p>{ch.background}</p>
          {ch.connections?.length ? (
            <div>
              <p className="kicker mb-1">You know things about…</p>
              <ul className="flex flex-col gap-1.5">
                {ch.connections.map((c, i) => (
                  <li key={i}>
                    <b style={{ color: "var(--gold)" }}>{c.personaName}</b>
                    <span style={{ color: "var(--ink-dim)" }}> — {c.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div
            className="flex items-start gap-3 rounded p-3"
            style={{ border: "1px solid var(--border-strong)", background: "rgba(0,0,0,0.25)", borderRadius: "var(--radius)" }}
          >
            <span className="seal-dot">✕</span>
            <div>
              <p className="kicker" style={{ color: "var(--danger)" }}>Your secret — guard it</p>
              <p className="mt-1">{ch.secret}</p>
            </div>
          </div>
          <p className="text-sm">
            <span className="kicker">Mannerism&ensp;</span>
            {ch.mannerism}
          </p>
          <p className="text-sm">
            <span className="kicker">Costume&ensp;</span>
            {ch.costumeHint}
          </p>
        </div>
      )}
    </div>
  );
}

// relative time — "an hour ago" must be anchorable (IA review #4)
export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!isFinite(mins) || mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h${mins % 60 ? ` ${mins % 60}m` : ""} ago`;
}

// coarse expiry countdown — "expires quietly" must still let a drunk player
// triage (IA review #6)
export function expiresIn(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000);
  if (!isFinite(mins)) return null;
  if (mins <= 0) return "moments";
  if (mins <= 60) return `~${mins} min`;
  return `~${Math.round(mins / 60)}h`;
}

// D74 wave B2 — the shortwave treatment (Gallery "shortwave" anchor, MIT):
// every AI transmission gets a station/frequency-style header line, tuned
// per theme in globals.css. The "station" is a deterministic hash of the
// claimed sender string ONLY (never Math.random/Date.now — this runs in
// the render path and must hydrate identically) so the same claimed name
// always tunes to the same "station", the way a numbers station keeps its
// frequency. It is flavor, not evidence: the claim is still unverified.
function stationSignature(seed: string): { code: string; freq: string; bars: string } {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0; // djb2
  }
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — never read as 1/0
  const code = `${letters[h % letters.length]}-${10 + (h % 89)}`;
  const freq = (5.6 + ((h >>> 3) % 1900) / 1000).toFixed(3);
  const strength = 1 + ((h >>> 6) % 5);
  const bars = "●".repeat(strength) + "○".repeat(5 - strength);
  return { code, freq, bars };
}

const KIND_LABEL: Record<string, { icon: string; label: string }> = {
  secret: { icon: "🔎", label: "a secret finds you" },
  task: { icon: "✉️", label: "a note, passed" },
  flavor: { icon: "🕯", label: "the house murmurs" },
  info: { icon: "🕯", label: "the house murmurs" },
  ghost_knowledge: { icon: "👻", label: "the dead know things" },
  system: { icon: "⚜", label: "the house" },
  audience: { icon: "🕯", label: "a paid audience" },
};

export function MessageEnvelope({ m }: { m: Msg }) {
  const k = KIND_LABEL[m.kind] ?? KIND_LABEL.info;
  const isNote = m.kind === "note"; // player mail — the name on the envelope proves nothing (D38)
  const isIntercept = m.kind === "intercept";
  const transmission = !!m.claimed_sender && !isNote; // an AI is (claiming to be) speaking (D28)
  const kicker = isNote
    ? `✉ a note — signed "${m.claimed_sender}"`
    : isIntercept
      ? `🎧 tapped wire — ${m.title}`
      : transmission
        ? `⌁ transmission — ${m.claimed_sender}`
        : `${k.icon} ${k.label}`;
  // GDD UX #4: any letter carrying a claimed sender is unverifiable — the
  // machine carries and may edit all mail, and a signature proves nothing
  // (D38/D28). Mark it plainly so an emotionally specific note isn't taken
  // at face value. (When notary seals ship, sealed mail loses this tag.)
  const unverified = !!m.claimed_sender && (isNote || transmission);
  // station/frequency header line — claimed sender + kind only, see
  // stationSignature above (D74 wave B2).
  const sig = transmission && m.claimed_sender ? stationSignature(m.claimed_sender) : null;
  return (
    <div className={`panel envelope evidence-slip p-4 ${transmission ? "transmission" : ""}`}>
      <p className="kicker flex items-baseline justify-between gap-2">
        <span>
          {kicker}
          {unverified && (
            <span
              className="ml-2 rounded px-1 py-0.5 text-[9px] tracking-wider"
              style={{ border: "1px solid var(--ink-dim)", color: "var(--ink-dim)", letterSpacing: "0.1em" }}
            >
              UNVERIFIED
            </span>
          )}
        </span>
        {m.created_at && (
          <span className="normal-case" style={{ letterSpacing: "normal", color: "var(--ink-dim)" }}>
            {timeAgo(m.created_at)}
          </span>
        )}
      </p>
      {sig && (
        <p className="transmission-meta" aria-hidden="true">
          <span>sta {sig.code}</span>
          <span>{sig.freq} mc/s</span>
          <span className="transmission-bars">{sig.bars}</span>
          <span>{k.label}</span>
        </p>
      )}
      {m.title && m.title !== "…" && !isIntercept && <p className="mt-1 font-semibold">{m.title}</p>}
      <p
        className={`mt-0.5 text-sm leading-relaxed whitespace-pre-wrap ${transmission ? "caret" : ""}`}
        style={{ color: transmission ? "var(--ink)" : "var(--ink-dim)" }}
      >
        {m.body}
      </p>
    </div>
  );
}

export function ChallengeOffer({
  c,
  aliveNames,
  busy,
  onComplete,
}: {
  c: Challenge;
  aliveNames: string[];
  busy?: boolean;
  onComplete: (victimName?: string) => void;
}) {
  const [victim, setVictim] = useState("");
  const isKill = c.type === "kill";
  const preset = c.data?.targetName;
  return (
    <div
      className={`panel envelope p-5 ${isKill ? "pulse-danger" : ""}`}
      style={isKill ? { borderColor: "var(--danger)" } : undefined}
    >
      <p className={`kicker ${isKill ? "kicker-danger" : ""}`}>
        {isKill ? "⚔ a dark offer — yours alone" : "🕯 a challenge — tell no one"}
      </p>
      <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.brief}</p>
      {c.expires_at && (
        <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          This offer expires quietly{expiresIn(c.expires_at) ? ` — ${expiresIn(c.expires_at)} left` : ""}. No one
          will ever know, either way.
        </p>
      )}
      {isKill && !preset && (
        <select className="input mt-3" value={victim} onChange={(e) => setVictim(e.target.value)}>
          <option value="">Choose your victim…</option>
          {aliveNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )}
      {/* social tasks get a quiet button — solid danger fill is reserved for the
          irreversible (visual review #8) */}
      <button
        className={`btn mt-4 w-full ${isKill ? "btn-danger" : "btn-ghost"}`}
        disabled={busy || (isKill && !preset && !victim)}
        onClick={() => onComplete(isKill ? (preset ?? victim) : undefined)}
      >
        {isKill ? "It is done" : "Done ✓"}
      </button>
    </div>
  );
}

export function VoteTable({
  candidates,
  votedId,
  onVote,
  busy = false,
  note = "",
  title = "The round table",
  subtitle = "Who do you banish? You may change your mind until the house calls time.",
}: {
  candidates: { id: string; name: string }[];
  votedId: string | null;
  onVote: (id: string) => void;
  busy?: boolean;
  note?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="panel panel-hero p-5">
      <p className="font-display text-xl" style={{ color: "var(--gold)" }}>
        {title}
      </p>
      <p className="mt-1 mb-4 text-sm" style={{ color: "var(--ink-dim)" }}>
        {subtitle}
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            className={`btn ${votedId === p.id ? "" : "btn-ghost"}`}
            disabled={busy}
            onClick={() => onVote(p.id)}
          >
            {votedId === p.id ? "🗡 " : ""}
            {p.name}
          </button>
        ))}
      </div>
      {votedId && (
        <p className="mt-3 text-xs italic" style={{ color: "var(--gold)" }}>
          Your finger points at {candidates.find((c) => c.id === votedId)?.name ?? "someone"}. Change it while you can.
        </p>
      )}
      {note && (
        <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function PausedBanner() {
  return (
    <div className="panel pulse-danger p-4 text-center" style={{ borderColor: "var(--danger)" }}>
      <p className="font-display text-lg">The house lights flicker.</p>
      <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
        The game holds its breath…
      </p>
    </div>
  );
}

export function DeadBanner({ status }: { status: string }) {
  return (
    <div className="panel panel-hero p-4 text-center">
      <p className="font-display text-xl">💀 {status === "banished" ? "You were banished." : "You are dead."}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
        Stay in the room. Ghosts hear everything — and the house is not done with you.
      </p>
    </div>
  );
}
