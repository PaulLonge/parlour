"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/client/useGame";
import {
  CharacterSheet,
  ChallengeOffer,
  MessageEnvelope,
  VoteTable,
  PausedBanner,
  DeadBanner,
} from "@/lib/client/cards";
import {
  MetersStrip,
  PurseChip,
  BribeCard,
  MissionCard,
  CodeEntryBox,
  GlyphBadge,
  ActionRow,
} from "@/lib/client/rogue-cards";
import { useRogueTheme, GlitchOverlay } from "@/lib/client/HijackFX";

const PHASE_LABEL: Record<string, string> = {
  none: "",
  social: "The evening unfolds…",
  murder_window: "The candles gutter…",
  body_found: "Something has happened.",
  assembly: "🔔 Assembly — gather everyone",
  vote: "🗳️ The vote is open",
  banishment: "Judgement",
  parley: "🏴 Parley — gather at the glass",
  accusation: "☠ An accusation is on the table — vote",
};

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const g = useGame(code);

  if (g.loading)
    return (
      <Center>
        <p className="candle italic" style={{ color: "var(--ink-dim)" }}>
          Lighting the candles…
        </p>
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
        <p className="deco-rule kicker justify-center">you are expected</p>
        <h1 className="candle font-display mt-3 text-4xl leading-tight" style={{ color: "var(--gold)" }}>
          {g.game!.story_public?.meta?.title ?? g.game!.title}
        </h1>
        <p className="mt-2 italic" style={{ color: "var(--ink-dim)" }}>
          {g.game!.story_public?.meta?.tagline ?? "Tap your name to step inside."}
        </p>
      </header>

      {g.roster.length > 0 && (
        <div className="panel panel-hero flex flex-col gap-3 p-5">
          <p className="kicker">The guest list</p>
          <div className="flex flex-wrap gap-2">
            {g.roster.map((p) => (
              <button key={p.id} className="btn btn-ghost" disabled={busy} onClick={() => join(p.name)}>
                {p.name}
                {p.is_host ? " ✦" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="panel flex flex-col gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) join(newName.trim());
        }}
      >
        <p className="kicker">Not on the list? You are now.</p>
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" />
        <button className="btn" disabled={busy || !newName.trim()}>
          Step inside
        </button>
      </form>
      {error && (
        <p className="text-center text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// The player's evening
// ---------------------------------------------------------------------------
function PlayerView({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const game = g.game!;
  const dead = ["dead", "ghost", "banished"].includes(me.status);
  const [busy, setBusy] = useState(false);
  const aliveNames = g.roster.filter((p) => p.status === "alive" && p.id !== me.id).map((p) => p.name);
  const { themeClass, glitching } = useRogueTheme(game.mode, game.hijacked_at);

  return (
    <main className={`mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-28 ${themeClass}`}>
      <GlitchOverlay active={glitching} />
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl leading-tight" style={{ color: "var(--gold)" }}>
            {game.story_public?.meta?.title ?? game.title}
          </h1>
          {me.character && (
            <span className="text-right text-sm italic whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
              {me.character.personaName}
            </span>
          )}
        </div>
        <hr className="divider my-2" />
        <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
          {game.status === "lobby" && "The doors are not yet open."}
          {game.status === "act1" &&
            (game.mode === "rogue" ? "The game will begin shortly… sharpening cutlasses…" : "Guests are gathering…")}
          {game.status === "round" && `Round ${game.round_no} — ${PHASE_LABEL[game.round_phase] ?? ""}`}
          {game.status === "live" && (PHASE_LABEL[game.round_phase] || "New management. Watch your purse.")}
          {game.status === "unmasking" && "🗳 THE UNMASKING — one name, together"}
          {game.status === "endgame" && "The end approaches."}
          {game.status === "reveal" && "The truth."}
          {game.status === "ended" && "The evening is over."}
        </p>
      </header>

      {game.mode === "rogue" && game.hijacked_at && (
        <>
          <MetersStrip meters={game.meters} />
          <PurseChip balance={me.balance} transactions={g.transactions} />
          <GlyphBadge gameId={game.id} playerId={me.id} />
        </>
      )}

      {game.paused && <PausedBanner />}
      {dead && <DeadBanner status={me.status} />}

      {!me.arrived_at && game.status !== "lobby" && (
        <button className="btn" onClick={() => g.actions.arrive()}>
          🚪 I have arrived at the party
        </button>
      )}

      {me.character ? (
        <CharacterSheet ch={me.character} />
      ) : (
        <div className="panel p-4 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Your character will find you when the story is sealed.
        </div>
      )}

      {g.challenges.map((c) =>
        c.type === "bribe" ? (
          <BribeCard
            key={c.id}
            c={c}
            busy={busy}
            onAccept={async () => {
              setBusy(true);
              await g.actions.acceptOffer(c.id);
              setBusy(false);
            }}
          />
        ) : c.type === "mission" ? (
          <MissionCard
            key={c.id}
            c={c}
            busy={busy}
            onRespond={async (text) => {
              setBusy(true);
              await g.actions.respond(c.id, text);
              setBusy(false);
            }}
            onSelfComplete={async () => {
              setBusy(true);
              await g.actions.completeChallenge(c.id);
              setBusy(false);
            }}
            onCompose={async (asSender, draft) => {
              setBusy(true);
              await g.actions.compose(asSender, draft);
              setBusy(false);
            }}
          />
        ) : (
          <ChallengeOffer
            key={c.id}
            c={c}
            aliveNames={aliveNames}
            busy={busy}
            onComplete={async (victimName) => {
              setBusy(true);
              const res = await g.actions.completeChallenge(c.id, victimName);
              setBusy(false);
              if (!res.ok && res.result === "near_miss")
                alert("You were a heartbeat too late — someone else moved first tonight. Say nothing.");
            }}
          />
        )
      )}

      {game.mode === "rogue" && game.status === "live" && me.status === "alive" && (
        <>
          <CodeEntryBox
            busy={busy}
            onFind={(slip) => g.actions.findCode(slip)}
            onHide={(slip, hint) => g.actions.hideCode(slip, hint)}
          />
          <ActionRow
            aiNames={{
              rogue: (game.story_public as { ais?: { rogue?: { name?: string } } })?.ais?.rogue?.name,
              good: (game.story_public as { ais?: { good?: { name?: string } } })?.ais?.good?.name,
            }}
            audienceCost={Number(game.config?.audienceCost ?? 250)}
            busy={busy}
            onAudience={(ai, q) => g.actions.audience(ai, q)}
            onPetition={(text) => g.actions.petition(text)}
            onVolunteer={() => g.actions.volunteer()}
          />
        </>
      )}

      {(game.round_phase === "vote" ||
        (game.mode === "rogue" && (game.round_phase === "accusation" || game.status === "unmasking"))) &&
        me.status === "alive" && <LiveVote g={g} />}

      <section className="flex flex-col gap-2">
        {g.messages.map((m) => (
          <MessageEnvelope key={m.id} m={m} />
        ))}
      </section>

      {me.is_host && <HostTools g={g} />}
      <PanicButton g={g} />
    </main>
  );
}

function LiveVote({ g }: { g: ReturnType<typeof useGame> }) {
  const [voted, setVoted] = useState<string | null>(null);
  const candidates = g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id);
  const rogue = g.game!.mode === "rogue";
  const unmasking = g.game!.status === "unmasking";
  return (
    <VoteTable
      candidates={candidates}
      votedId={voted}
      title={!rogue ? "The round table" : unmasking ? "THE UNMASKING" : "The accusation"}
      subtitle={
        !rogue
          ? "Who do you banish? You may change your mind until the house calls time."
          : unmasking
            ? "One name, together. Right — and the machine loses its head. Wrong — and everything on that meter is its, forever."
            : "Who wears the hat RIGHT NOW? Right — they burn. Wrong — you'll be billed for it."
      }
      onVote={async (id) => {
        const r = await g.actions.vote(id);
        if (r.ok) setVoted(id);
      }}
    />
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
    <div className="panel p-5">
      <p className="kicker">Host — ✦</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!sealed && (
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await g.actions.sealStory();
              setBusy(false);
              g.refetch();
            }}
          >
            🕯 Write & seal the story
          </button>
        )}
        {game.status === "lobby" && sealed && (
          <button className="btn" disabled={busy} onClick={() => act("start_party")}>
            🎭 Begin the evening
          </button>
        )}
        <Link href={`/tv/${game.code}`} className="btn btn-ghost">
          📺 House channel
        </Link>
        {Number(game.config?.timeScale ?? 1) > 1 && (
          <Link href={`/sandbox/${game.code}`} className="btn btn-ghost">
            🧪 Sandbox
          </Link>
        )}
        {!open && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setOpen(true);
              act("open");
            }}
          >
            🚨 Break glass
          </button>
        )}
      </div>
      {open && (
        <div
          className="mt-3 flex flex-col gap-2 p-3"
          style={{ border: "1px solid var(--danger)", borderRadius: "var(--radius)" }}
        >
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            The seal is broken — everyone knows the game is paused.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={() => { act("resume"); setOpen(false); }}>
              Resume
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("skip_to_assembly")}>
              Skip to assembly
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("compress")}>
              Compress the night
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("extend_30")}>
              +30 minutes
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("end_gracefully")}>
              End gracefully
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                if (confirm("This un-surprises you permanently. Sure?")) act("reveal_twist");
              }}
            >
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
        className="fixed right-4 bottom-4 h-10 w-10 rounded-full border text-lg opacity-40"
        style={{ borderColor: "var(--ink-dim)" }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
      >
        ◦
      </button>
      {armed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="panel panel-hero max-w-sm p-6 text-center">
            {sent ? (
              <>
                <p>Understood. The house will quietly ask less of you. Nobody will know.</p>
                <button className="btn mt-4" onClick={() => { setArmed(false); setSent(false); }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold">Need a quieter evening?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-dim)" }}>
                  This privately tells the game to ease off you. No one else will ever see this.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className="btn" onClick={async () => { await g.actions.panic(); setSent(true); }}>
                    Yes, ease off
                  </button>
                  <button className="btn btn-ghost" onClick={() => setArmed(false)}>
                    Never mind
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
