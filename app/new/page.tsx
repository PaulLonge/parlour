"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TUTORIAL_PRESET } from "@/lib/schemas/config";
import { SCENARIOS, DEFAULT_SCENARIO } from "@/content/scenarios";

export default function NewGame() {
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [endTime, setEndTime] = useState("23:30");
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO);
  const [password, setPassword] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

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
        },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error?.toString() ?? "something went wrong");
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
                onClick={() => setScenarioId(s.id)}
              >
                <span className="font-semibold">{s.emoji} {s.label}</span>
                <span className="mt-0.5 block text-xs font-normal italic opacity-80">{s.blurb}</span>
              </button>
            ))}
          </div>
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
    </main>
  );
}
