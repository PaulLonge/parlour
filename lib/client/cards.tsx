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
  const transmission = !!m.claimed_sender; // an AI is (claiming to be) speaking (D28)
  return (
    <div className={`panel envelope p-4 ${transmission ? "transmission" : ""}`}>
      <p className="kicker">
        {transmission ? `⌁ transmission — ${m.claimed_sender}` : `${k.icon} ${k.label}`}
      </p>
      {m.title && m.title !== "…" && <p className="mt-1 font-semibold">{m.title}</p>}
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
      <p className="kicker" style={isKill ? { color: "var(--danger)" } : undefined}>
        {isKill ? "⚔ a dark offer — yours alone" : "🕯 a challenge — tell no one"}
      </p>
      <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.brief}</p>
      {c.expires_at && (
        <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          This offer expires quietly. No one will ever know, either way.
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
      <button
        className={`btn mt-4 w-full ${isKill ? "btn-danger" : ""}`}
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
  title = "The round table",
  subtitle = "Who do you banish? You may change your mind until the house calls time.",
}: {
  candidates: { id: string; name: string }[];
  votedId: string | null;
  onVote: (id: string) => void;
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
          <button key={p.id} className={`btn ${votedId === p.id ? "" : "btn-ghost"}`} onClick={() => onVote(p.id)}>
            {votedId === p.id ? "🗡 " : ""}
            {p.name}
          </button>
        ))}
      </div>
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
