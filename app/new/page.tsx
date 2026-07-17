"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Accordion, errorText } from "@/lib/client/ui";
import { GameConfig, TUTORIAL_PRESET } from "@/lib/schemas/config";
import { SCENARIOS, DEFAULT_SCENARIO } from "@/content/scenarios";
import { ControlRoom, type ControlOverrides } from "@/lib/client/control-room";

export default function NewGame() {
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [endTime, setEndTime] = useState("23:30");
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO);
  const [password, setPassword] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  // D76: THE CONTROL ROOM — starts empty = a pure preset night. Keyed by the
  // scenario picker so switching games doesn't drag stale dials along.
  const [overrides, setOverrides] = useState<ControlOverrides>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  // client-side mirror of the server's preset resolution (D69's create route):
  // scenario.preset merged over the schema's own defaults, via a real parse
  // so every field — not just the preset's overrides — is populated.
  const resolvedPreset = GameConfig.parse({ ...(scenario?.preset ?? {}) });

  async function create() {
    setBusy(true);
    setError("");
    // targetEndAt: today at the chosen time (or tomorrow if already past)
    const [h, m] = endTime.split(":").map(Number);
    const end = new Date();
    end.setHours(h, m, 0, 0);
    if (end < new Date()) end.setDate(end.getDate() + 1);
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title || "The Gathering",
        hostName,
        // D69: the scenario resolves mode + preset server-side. Induction
        // overrides to its own preset; sandbox is an orthogonal time-warp.
        scenario: tutorial ? undefined : scenarioId,
        mode: tutorial ? "rogue" : undefined,
        password: password.trim() || undefined,
        config: {
          targetEndAt: end.toISOString(),
          ...(tutorial ? TUTORIAL_PRESET : {}),
          ...(sandbox ? { timeScale: 10 } : {}),
          // D76: THE CONTROL ROOM — spread last so a host's explicit dial
          // always wins. The server (app/api/game/create/route.ts) already
          // does `{...scenario.preset, ...config}`, so anything landing in
          // `config` beats the scenario preset too — no engine change needed.
          ...overrides,
        },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(errorText(json.error));
    // the creator never passes through the join flow — cache tonight's word so
    // sandbox possession and takeovers on this device don't bounce off it
    if (password.trim()) {
      try {
        localStorage.setItem(`parlour-pw-${json.code}`, password.trim().toLowerCase());
      } catch {}
    }
    router.push(sandbox ? `/sandbox/${json.code}` : `/g/${json.code}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl" style={{ color: "var(--gold)" }}>
        A new evening
      </h1>
      <div className="panel flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          What shall the invitation call it?
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paul's 30th" />
        </label>
        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          Your name (you will be a player too — and just as blind)
          <input className="input" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="Paul" />
        </label>
        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          Aim to finish around
          <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>

        {/* D69: the game is chosen from the scenario registry — add a game =
            add a data entry, no code. Induction/sandbox are orthogonal toggles. */}
        <div className={`flex flex-col gap-2 text-sm ${tutorial ? "opacity-40 pointer-events-none" : ""}`} style={{ color: "var(--ink-dim)" }}>
          The game
          <div className="flex flex-col gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`btn text-left ${scenarioId === s.id ? "" : "btn-ghost"}`}
                onClick={() => {
                  setScenarioId(s.id);
                  setOverrides({}); // dials are per-scenario; a fresh game starts on pure preset
                }}
              >
                <span className="font-semibold">{s.emoji} {s.label}</span>
                <span className="mt-0.5 block text-xs font-normal italic opacity-80">{s.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        {/* D76: THE CONTROL ROOM — closed by default so the fast path (pick a
            game, name yourself, go) is never intimidated by 32 dials. Not
            meaningful under induction, which forces its own preset. */}
        <div className={tutorial ? "pointer-events-none opacity-40" : ""}>
          <Accordion title="⚙ THE CONTROL ROOM" kicker="every dial, explained">
            <p className="mb-3 text-xs italic" style={{ color: "var(--ink-dim)" }}>
              Untouched dials keep {scenario ? `“${scenario.label}”'s` : "the scenario's"} house defaults. Change only what tonight needs.
            </p>
            <ControlRoom preset={resolvedPreset} value={overrides} onChange={setOverrides} />
          </Accordion>
        </div>

        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          Tonight's word (optional) — say it aloud to your guests; it keeps your party separate from anyone else's
          <input
            className="input lowercase"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="e.g. yellow"
          />
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
          Sandbox (solo test run — time ×10, possess any player)
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
          <input type="checkbox" checked={tutorial} onChange={(e) => setTutorial(e.target.checked)} />
          <span>
            🎓 Staff induction — the guided two-phone walkthrough
            <span className="block text-xs italic opacity-70">
              for the hosts: the machine teaches every mechanic and verifies each one works. ~30 min, two phones, no AI cost
            </span>
          </span>
        </label>
        {error && <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>}
        <button className="btn" onClick={create} disabled={busy || !hostName.trim()}>
          {busy ? "Preparing the house…" : `Create${tutorial ? " induction" : scenario ? ` — ${scenario.label}` : ""}`}
        </button>
      </div>
      <Link href="/guide" className="text-center text-sm underline" style={{ color: "var(--ink-dim)" }}>
        📖 The manual — how the evening works
      </Link>
    </main>
  );
}
