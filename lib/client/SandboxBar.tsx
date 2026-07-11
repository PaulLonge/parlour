"use client";

// D30/D37: possess-in-place. When a game runs at timeScale > 1 (sandbox mode),
// this bar sits atop the PLAYER view so the host can flick between players
// without leaving the screen — tap a name, become them, keep playing. One
// device, whole cast. Pseudo-accounts make possession = the takeover flow.

import { useState } from "react";
import Link from "next/link";
import type { useGame } from "./useGame";

export function SandboxBar({ g }: { g: ReturnType<typeof useGame> }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const game = g.game!;

  async function possess(name: string) {
    if (busy || g.me?.name === name) return;
    setBusy(true);
    setNote("");
    try {
      const r = await g.actions.join(name, true);
      if (!r.ok && !r.playerId && !r.rejoined) setNote(`couldn't become ${name}`);
    } catch {
      setNote("network hiccup — tap again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-40 -mx-4 mb-1 border-b px-3 py-2 backdrop-blur"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <Link
          href={`/sandbox/${game.code}`}
          className="text-xs whitespace-nowrap"
          style={{ color: "var(--ink-dim)" }}
          title="sandbox control room"
        >
          🧪 ×{Number(game.config?.timeScale ?? 1)}
        </Link>
        <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="possess a player">
          {g.roster.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={g.me?.name === p.name}
              className="rounded-full border px-2.5 py-1 text-xs whitespace-nowrap"
              style={{
                borderColor: g.me?.name === p.name ? "var(--gold)" : "var(--border)",
                color: g.me?.name === p.name ? "var(--gold)" : "var(--ink-dim)",
                background: g.me?.name === p.name ? "color-mix(in srgb, var(--gold) 12%, transparent)" : "transparent",
                opacity: busy ? 0.5 : 1,
              }}
              disabled={busy}
              onClick={() => possess(p.name)}
            >
              {p.name}
              {p.is_host ? "✦" : ""}
            </button>
          ))}
        </div>
        <button
          className="rounded border px-2 py-1 text-xs whitespace-nowrap"
          style={{ borderColor: "var(--border)", color: "var(--ink-dim)" }}
          title="pump the director's heartbeat once"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await g.actions.tick();
              setNote("tick sent");
            } catch {
              setNote("tick failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          ♥ tick
        </button>
      </div>
      {note && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--gold)" }}>
          {note}
        </p>
      )}
    </div>
  );
}
