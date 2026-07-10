"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useGame, type Challenge } from "@/lib/client/useGame";

const PHASE_LABEL: Record<string, string> = {
  none: "",
  social: "The evening unfolds…",
  murder_window: "The candles gutter…",
  body_found: "Something has happened.",
  assembly: "🔔 Assembly — gather everyone",
  vote: "🗳️ The vote is open",
  banishment: "Judgement",
};

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);

  if (g.loading)
    return <Center><p className="candle italic">Lighting the candles…</p></Center>;
  if (!g.game)
    return (
      <Center>
        <p>No such evening. Check your code.</p>
        <Link className="btn-ghost btn mt-4" href="/">Back</Link>
      </Center>
    );
  if (!g.me) return <JoinScreen g={g} />;
  return <PlayerView g={g} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Join: pseudo-accounts (D14) — tap your name, or add a new one
// ---------------------------------------------------------------------------
function JoinScreen({ g }: { g: ReturnType<typeof useGame> }) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(name: string) {
    setBusy(true);
    setError("");
    let res = await g.actions.join(name);
    if (res.status === 409 && res.needsTakeover) {
      if (confirm(`"${name}" is already playing on another phone. Is that you? Take over on this device?`))
        res = await g.actions.join(name, true);
      else {
        setBusy(false);
        return;
      }
    }
    if (!res.ok && !res.playerId) setError(res.error?.toString() ?? "couldn't join");
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="font-display text-3xl" style={{ color: "var(--gold)" }}>
          {g.game!.story_public?.meta?.title ?? g.game!.title}
        </h1>
        <p className="mt-1 italic" style={{ color: "var(--ink-dim)" }}>
          {g.game!.story_public?.meta?.tagline ?? "Tap your name to step inside."}
        </p>
      </header>

      {g.roster.length > 0 && (
        <div className="panel flex flex-col gap-2 p-4">
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>The guest list</p>
          <div className="flex flex-wrap gap-2">
            {g.roster.map((p) => (
              <button key={p.id} className="btn btn-ghost" disabled={busy} onClick={() => join(p.name)}>
                {p.name}{p.is_host ? " ✦" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="panel flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) join(newName.trim());
        }}
      >
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>Not on the list? You are now.</p>
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" />
        <button className="btn" disabled={busy || !newName.trim()}>Step inside</button>
      </form>
      {error && <p className="text-center text-sm" style={{ color: "var(--accent)" }}>{error}</p>}
    </main>
  );
}

// ---------------------------------------------------------------------------
// The player's evening
// ---------------------------------------------------------------------------
function PlayerView({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const game = g.game!;
  const ch = me.character;
  const dead = ["dead", "ghost", "banished"].includes(me.status);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-28">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl" style={{ color: "var(--gold)" }}>
            {game.story_public?.meta?.title ?? game.title}
          </h1>
          <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
            {game.status === "lobby" && "The doors are not yet open."}
            {game.status === "act1" && "Guests are gathering…"}
            {game.status === "round" && `Round ${game.round_no} — ${PHASE_LABEL[game.round_phase] ?? ""}`}
            {game.status === "endgame" && "The end approaches."}
            {game.status === "reveal" && "The truth."}
            {game.status === "ended" && "The evening is over."}
          </p>
        </div>
        {ch && <span className="text-right text-sm italic" style={{ color: "var(--ink-dim)" }}>{ch.personaName}</span>}
      </header>

      {game.paused && (
        <div className="panel border-2 p-4 text-center pulse-danger" style={{ borderColor: "var(--accent)" }}>
          The house lights flicker. The game holds its breath…
        </div>
      )}

      {dead && (
        <div className="panel p-4 text-center">
          <p className="text-lg">💀 {me.status === "banished" ? "You were banished." : "You are dead."}</p>
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
            Stay in the room. Ghosts hear everything — and the house is not done with you.
          </p>
        </div>
      )}

      {!me.arrived_at && game.status !== "lobby" && (
        <button className="btn" onClick={() => g.actions.arrive()}>
          🚪 I have arrived at the party
        </button>
      )}

      {ch ? <CharacterCard ch={ch} /> : (
        <div className="panel p-4 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Your character will find you when the story is sealed.
        </div>
      )}

      {g.challenges.map((c) => (
        <ChallengeCard key={c.id} c={c} g={g} />
      ))}

      {game.round_phase === "vote" && me.status === "alive" && <VotePanel g={g} />}

      <section className="flex flex-col gap-2">
        {g.messages.map((m) => (
          <div key={m.id} className="panel envelope p-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              {m.kind === "secret" ? "🔎 a secret" : m.kind === "task" ? "✉️ a task" : m.kind === "ghost_knowledge" ? "👻 whispers" : m.kind === "system" ? "⚜ the house" : "…"}
            </p>
            <p className="font-semibold">{m.title}</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--ink-dim)" }}>{m.body}</p>
          </div>
        ))}
      </section>

      {me.is_host && <HostTools g={g} />}
      <PanicButton g={g} />
    </main>
  );
}

function CharacterCard({ ch }: { ch: NonNullable<ReturnType<typeof useGame>["me"]>["character"] }) {
  const [open, setOpen] = useState(false);
  if (!ch) return null;
  return (
    <div className="panel p-4">
      <button className="flex w-full items-baseline justify-between" onClick={() => setOpen(!open)}>
        <span className="font-display text-lg" style={{ color: "var(--gold)" }}>
          {ch.personaName}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
          {open ? "conceal ▴" : "your character ▾"}
        </span>
      </button>
      <p className="text-sm italic" style={{ color: "var(--ink-dim)" }}>{ch.archetype}</p>
      {open && (
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <p>{ch.background}</p>
          {ch.connections?.length ? (
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--gold)" }}>You know things about…</p>
              {ch.connections.map((c, i) => (
                <p key={i}>• <b>{c.personaName}</b> — {c.what}</p>
              ))}
            </div>
          ) : null}
          <div className="rounded border p-3" style={{ borderColor: "var(--accent)" }}>
            <p className="text-xs uppercase" style={{ color: "var(--accent)" }}>Your secret — guard it</p>
            <p>{ch.secret}</p>
          </div>
          <p><b>Mannerism:</b> {ch.mannerism}</p>
          <p><b>Costume:</b> {ch.costumeHint}</p>
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ c, g }: { c: Challenge; g: ReturnType<typeof useGame> }) {
  const [victim, setVictim] = useState("");
  const [busy, setBusy] = useState(false);
  const isKill = c.type === "kill";
  const preset = c.data?.targetName;
  const aliveOthers = g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id);

  async function complete() {
    setBusy(true);
    const res = await g.actions.completeChallenge(c.id, isKill ? (preset ?? victim) : undefined);
    setBusy(false);
    if (!res.ok && res.result === "near_miss")
      alert("You were a heartbeat too late — someone else moved first tonight. Say nothing.");
  }

  return (
    <div className={`panel envelope p-4 ${isKill ? "pulse-danger" : ""}`} style={isKill ? { borderColor: "var(--accent)" } : {}}>
      <p className="text-xs uppercase tracking-wide" style={{ color: isKill ? "var(--accent)" : "var(--gold)" }}>
        {isKill ? "⚔ a dark offer — yours alone" : "🕯 a challenge — tell no one"}
      </p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{c.brief}</p>
      {c.expires_at && (
        <p className="mt-1 text-xs italic" style={{ color: "var(--ink-dim)" }}>
          This offer expires quietly. No one will ever know either way.
        </p>
      )}
      {isKill && !preset && (
        <select className="input mt-2" value={victim} onChange={(e) => setVictim(e.target.value)}>
          <option value="">Choose your victim…</option>
          {aliveOthers.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      )}
      <button className="btn mt-3 w-full" disabled={busy || (isKill && !preset && !victim)} onClick={complete}>
        {isKill ? "It is done" : "Done ✓"}
      </button>
    </div>
  );
}

function VotePanel({ g }: { g: ReturnType<typeof useGame> }) {
  const [voted, setVoted] = useState<string | null>(null);
  const candidates = g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id);
  return (
    <div className="panel p-4">
      <p className="font-display text-lg" style={{ color: "var(--gold)" }}>Round table</p>
      <p className="mb-3 text-sm" style={{ color: "var(--ink-dim)" }}>
        Who do you banish? You may change your mind until the house calls time.
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            className={`btn ${voted === p.id ? "" : "btn-ghost"}`}
            onClick={async () => {
              const r = await g.actions.vote(p.id);
              if (r.ok) setVoted(p.id);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function HostTools({ g }: { g: ReturnType<typeof useGame> }) {
  const game = g.game!;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [twist, setTwist] = useState("");
  const sealed = !!game.story_public?.meta;

  async function act(action: string) {
    setBusy(true);
    const res = await g.actions.breakglass(action);
    if (action === "reveal_twist" && res.twist) setTwist(res.twist);
    setBusy(false);
  }

  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>Host — ✦</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!sealed && (
          <button className="btn" disabled={busy} onClick={async () => { setBusy(true); await g.actions.sealStory(); setBusy(false); g.refetch(); }}>
            🕯 Write & seal the story
          </button>
        )}
        {game.status === "lobby" && sealed && (
          <button className="btn" disabled={busy} onClick={() => act("start_party")}>🎭 Begin the evening</button>
        )}
        <Link href={`/tv/${game.code}`} className="btn btn-ghost">📺 House channel</Link>
        {!open ? (
          <button className="btn btn-ghost" onClick={() => { setOpen(true); act("open"); }}>
            🚨 Break glass
          </button>
        ) : null}
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded border p-3" style={{ borderColor: "var(--accent)" }}>
          <p className="text-xs" style={{ color: "var(--accent)" }}>
            The seal is broken — everyone knows the game is paused.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={() => { act("resume"); setOpen(false); }}>Resume</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("skip_to_assembly")}>Skip to assembly</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("compress")}>Compress the night</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("extend_30")}>+30 minutes</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("end_gracefully")}>End gracefully</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => { if (confirm("This un-surprises you permanently. Sure?")) act("reveal_twist"); }}>
              Reveal twist to me
            </button>
          </div>
          {twist && <p className="text-sm italic">{twist}</p>}
        </div>
      )}
    </div>
  );
}

// I3: long-press 1.5s → private out
function PanicButton({ g }: { g: ReturnType<typeof useGame> }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [armed, setArmed] = useState(false);
  const [sent, setSent] = useState(false);

  function down() {
    timer.current = setTimeout(() => setArmed(true), 1500);
  }
  function up() {
    if (timer.current) clearTimeout(timer.current);
  }

  return (
    <>
      <button
        aria-label="hold if you need out"
        className="fixed bottom-4 right-4 h-10 w-10 rounded-full border text-lg opacity-40"
        style={{ borderColor: "var(--ink-dim)" }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
      >
        ◦
      </button>
      {armed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="panel max-w-sm p-6 text-center">
            {sent ? (
              <>
                <p>Understood. The house will quietly ask less of you. Nobody will know.</p>
                <button className="btn mt-4" onClick={() => { setArmed(false); setSent(false); }}>Close</button>
              </>
            ) : (
              <>
                <p className="font-semibold">Need a quieter evening?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-dim)" }}>
                  This privately tells the game to ease off you. No one else will ever see this.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className="btn" onClick={async () => { await g.actions.panic(); setSent(true); }}>Yes, ease off</button>
                  <button className="btn btn-ghost" onClick={() => setArmed(false)}>Never mind</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
