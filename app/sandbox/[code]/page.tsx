"use client";

// SANDBOX (D30): run an entire game solo. Possess any player (pseudo-accounts
// make this free — possession IS the takeover flow), watch state, warp time.
// This page is a playtest harness, not a cheat screen: it shows no secrets the
// possessed player couldn't see — switch players to see their world.

import { use, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/client/useGame";

export default function Sandbox({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [possessNote, setPossessNote] = useState("");
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(`parlour-verdict-${code.toUpperCase()}`) ?? "";
    } catch {
      return "";
    }
  });

  if (g.loading) return null;
  if (!g.game)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p>No such evening.</p>
      </main>
    );

  const timeScale = Number(g.game.config?.timeScale ?? 1);

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="kicker">sandbox — {g.game.code}</p>
          <h1 className="font-display text-2xl" style={{ color: "var(--gold)" }}>
            {g.game.title}
          </h1>
        </div>
        <div className="text-right text-xs" style={{ color: "var(--ink-dim)" }}>
          <p>
            {g.game.mode} · {g.game.status}
            {g.game.round_phase !== "none" && ` · ${g.game.round_phase}`}
          </p>
          <p>
            time ×{timeScale}
            {timeScale > 1 ? " ⏩" : ""} · Ƀ{g.game.meters?.plunder ?? 0} / 🏮{g.game.meters?.compute ?? 0}
          </p>
        </div>
      </header>

      <div className="panel p-4">
        <div className="flex items-baseline justify-between">
          <p className="kicker">possess a player</p>
          {g.me && (
            <span className="text-sm italic" style={{ color: "var(--gold)" }}>
              currently: {g.me.name}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {g.roster.map((p) => (
            <button
              key={p.id}
              className={`btn ${g.me?.id === p.id ? "" : "btn-ghost"}`}
              disabled={busy}
              onClick={() => possess(p.name)}
            >
              {p.name}
              {p.is_host ? " ✦" : ""}
              {p.status !== "alive" && p.status !== "lobby" ? ` (${p.status})` : ""}
            </button>
          ))}
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
        <div className="mt-3 flex gap-2">
          <Link href={`/g/${g.game.code}`} className="btn w-full text-center">
            ▶ Play as {g.me?.name ?? "…"} (their phone)
          </Link>
          <Link href={`/tv/${g.game.code}`} className="btn btn-ghost w-full text-center">
            📺 Spyglass
          </Link>
        </div>
        <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          Tip: open the player view and this sandbox in two tabs; possess here, act there. Set{" "}
          <code>config.timeScale</code> (e.g. 10) at game creation to fast-forward every timer, or ask the
          director to compress via break-glass.
        </p>
        <Link href="/guide" className="mt-2 block text-center text-sm underline" style={{ color: "var(--ink-dim)" }}>
          📖 The manual — how the evening works
        </Link>
      </div>

      <div className="panel p-4">
        <p className="kicker">recent public record</p>
        <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: "var(--ink-dim)" }}>
          {g.publicEvents.slice(0, 15).map((e) => (
            <li key={e.id}>
              <b style={{ color: "var(--ink)" }}>{e.type}</b>{" "}
              {JSON.stringify(e.payload).slice(0, 120)}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-4">
        <p className="kicker">verdict notes (yours — saved locally)</p>
        <textarea
          className="input mt-2 h-28"
          placeholder="what worked, what dragged, what broke…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            try {
              localStorage.setItem(`parlour-verdict-${code.toUpperCase()}`, e.target.value);
            } catch {}
          }}
        />
      </div>
    </main>
  );
}
