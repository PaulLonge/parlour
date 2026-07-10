"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGame() {
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [endTime, setEndTime] = useState("23:30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
        config: { targetEndAt: end.toISOString() },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error?.toString() ?? "something went wrong");
    router.push(`/g/${json.code}`);
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
        {error && <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>}
        <button className="btn" onClick={create} disabled={busy || !hostName.trim()}>
          {busy ? "Preparing the house…" : "Create"}
        </button>
      </div>
    </main>
  );
}
