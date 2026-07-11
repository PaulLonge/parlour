"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/client/rogue-cards";
import { useRogueTheme, GlitchOverlay } from "@/lib/client/HijackFX";
import { Accordion, InfoDot, TabBar } from "@/lib/client/ui";
import { SandboxBar } from "@/lib/client/SandboxBar";

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
// The player's evening — tabbed (D36): Now / Inbox / Ask / More
// ---------------------------------------------------------------------------
type Tab = "now" | "inbox" | "ask" | "more";

function PlayerView({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const game = g.game!;
  const dead = ["dead", "ghost", "banished"].includes(me.status);
  const { themeClass, glitching } = useRogueTheme(game.mode, game.hijacked_at);
  const [tab, setTab] = useState<Tab>("now");

  const rogueLive = game.mode === "rogue" && !!game.hijacked_at;
  const askAvailable = rogueLive;

  // unread inbox count (persisted last-seen per game+player)
  const seenKey = `parlour-seen-${game.code}-${me.name}`;
  const inboxMessages = g.messages.filter((m) => m.kind !== "audience");
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try {
      return localStorage.getItem(seenKey) ?? "";
    } catch {
      return "";
    }
  });
  const unread = inboxMessages.filter((m) => m.created_at > lastSeen).length;
  useEffect(() => {
    if (tab === "inbox" && inboxMessages[0]) {
      try {
        localStorage.setItem(seenKey, inboxMessages[0].created_at);
      } catch {}
      setLastSeen(inboxMessages[0].created_at);
    }
  }, [tab, inboxMessages, seenKey]);

  const voteOpen =
    (game.round_phase === "vote" ||
      (game.mode === "rogue" && (game.round_phase === "accusation" || game.status === "unmasking"))) &&
    me.status === "alive";

  const tabs = useMemo(() => {
    const t: { key: Tab; label: string; icon: string }[] = [
      { key: "now", label: "Now", icon: "🎭" },
      { key: "inbox", label: "Inbox", icon: "✉️" },
    ];
    if (askAvailable) t.push({ key: "ask", label: "Ask", icon: "🕯" });
    t.push({ key: "more", label: "More", icon: "📔" });
    return t;
  }, [askAvailable]);

  return (
    <main className={`mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-24 ${themeClass}`}>
      <GlitchOverlay active={glitching} />
      {Number(game.config?.timeScale ?? 1) > 1 && <SandboxBar g={g} />}

      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl leading-tight" style={{ color: "var(--gold)" }}>
            {game.story_public?.meta?.title ?? game.title}
          </h1>
          {me.character && !rogueLive && (
            <span className="text-right text-sm italic" style={{ color: "var(--ink-dim)" }}>
              {me.character.personaName}
            </span>
          )}
          {rogueLive && (
            <span className="text-right text-sm" style={{ color: "var(--gold)" }}>
              {me.name}
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

      {game.paused && <PausedBanner />}
      {dead && <DeadBanner status={me.status} />}

      {tab === "now" && <NowPanel g={g} rogueLive={rogueLive} voteOpen={voteOpen} />}
      {tab === "inbox" && <InboxPanel messages={inboxMessages} />}
      {tab === "ask" && askAvailable && <AskPanel g={g} />}
      {tab === "more" && <MorePanel g={g} rogueLive={rogueLive} />}

      <PanicButton g={g} />
      <TabBar tabs={tabs} active={tab} onChange={setTab} badges={{ now: g.challenges.length + (voteOpen ? 1 : 0), inbox: unread }} />
    </main>
  );
}

// ------------------------------- NOW ---------------------------------------
function NowPanel({
  g,
  rogueLive,
  voteOpen,
}: {
  g: ReturnType<typeof useGame>;
  rogueLive: boolean;
  voteOpen: boolean;
}) {
  const me = g.me!;
  const game = g.game!;
  const [busy, setBusy] = useState(false);
  const aliveNames = g.roster.filter((p) => p.status === "alive" && p.id !== me.id).map((p) => p.name);

  return (
    <div className="flex flex-col gap-4">
      {rogueLive && (
        <>
          <div className="relative">
            <MetersStrip meters={game.meters} />
            <span className="absolute top-1 right-1">
              <InfoDot hint="Twin public gauges. The skull is what the rogue has taken; the lantern is what honest work has built. They move for everyone at once — draw your own conclusions about when." />
            </span>
          </div>
          <PurseChip balance={me.balance} transactions={g.transactions} />
          <GlyphBadge gameId={game.id} playerId={me.id} />
        </>
      )}

      {!me.arrived_at && game.status !== "lobby" && (
        <button className="btn" onClick={() => g.actions.arrive()}>
          🚪 I have arrived at the party
        </button>
      )}

      {voteOpen && <LiveVote g={g} />}

      {g.challenges.length === 0 && !voteOpen && (
        <div className="panel p-4 text-center text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Nothing is asked of you. Right now. Enjoy the party — it will find you.
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

      {rogueLive && game.status === "live" && me.status === "alive" && (
        <CodeEntryBox
          busy={busy}
          onFind={(slip) => g.actions.findCode(slip)}
          onHide={(slip, hint) => g.actions.hideCode(slip, hint)}
        />
      )}

      {!g.me!.character && !rogueLive && (
        <div className="panel p-4 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Your character will find you when the story is sealed.
        </div>
      )}
    </div>
  );
}

// ------------------------------ INBOX ---------------------------------------
function InboxPanel({ messages }: { messages: ReturnType<typeof useGame>["messages"] }) {
  return (
    <section className="flex flex-col gap-2">
      {messages.length === 0 && (
        <div className="panel p-4 text-center text-sm italic" style={{ color: "var(--ink-dim)" }}>
          No letters yet. The house knows where you are.
        </div>
      )}
      {messages.map((m) => (
        <MessageEnvelope key={m.id} m={m} />
      ))}
    </section>
  );
}

// ------------------------------- ASK ----------------------------------------
// Talk to the machines: audience thread + composer, schemes, volunteering.
function AskPanel({ g }: { g: ReturnType<typeof useGame> }) {
  const game = g.game!;
  const [ai, setAi] = useState<"rogue" | "good">("rogue");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const names = (game.story_public as { ais?: { rogue?: { name?: string }; good?: { name?: string } } })?.ais;
  const cost = Number(game.config?.audienceCost ?? 250);
  const thread = g.messages.filter((m) => m.kind === "audience").slice().reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-4">
        <p className="kicker">
          an audience with the machine
          <InfoDot hint={`One question, answered in its own voice, for ${cost} from your purse. Capped per night. It may lie. It may not reveal who serves whom — it enjoys being asked.`} />
        </p>
        <div className="mt-3 flex gap-2">
          <button className={`btn flex-1 text-xs ${ai === "rogue" ? "" : "btn-ghost"}`} onClick={() => setAi("rogue")}>
            {names?.rogue?.name ?? "the villain"}
          </button>
          <button className={`btn flex-1 text-xs ${ai === "good" ? "" : "btn-ghost"}`} onClick={() => setAi("good")}>
            {names?.good?.name ?? "the other one"}
          </button>
        </div>
        <textarea
          className="input mt-3 h-20"
          placeholder="Choose your question carefully…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn mt-2 w-full"
          disabled={busy || !q.trim()}
          onClick={async () => {
            setBusy(true);
            const r = await g.actions.audience(ai, q.trim());
            setNote(r.ok ? "" : (r.error ?? "the machine declined"));
            if (r.ok) setQ("");
            setBusy(false);
          }}
        >
          Pay {cost} and ask
        </button>
        {note && (
          <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>
            {note}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        {thread.length === 0 && (
          <p className="text-center text-sm italic" style={{ color: "var(--ink-dim)" }}>
            No audiences held. The machines are listening.
          </p>
        )}
        {thread.map((m) => (
          <MessageEnvelope key={m.id} m={m} />
        ))}
      </section>

      <Accordion title="Propose a scheme" kicker="📜 your idea, its rules">
        <SchemeBox g={g} />
      </Accordion>

      <Accordion title="More, please" kicker="🙋 a bigger night">
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          Quietly tells the game you want juicier work — from either side. Nobody else ever sees this.
        </p>
        <VolunteerButton g={g} />
      </Accordion>
    </div>
  );
}

function SchemeBox({ g }: { g: ReturnType<typeof useGame> }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
        Pitch anything. The machine may grant it, refuse it — or grant a version you'll regret.
      </p>
      <textarea className="input h-20" placeholder="I want to…" value={text} onChange={(e) => setText(e.target.value)} />
      <button
        className="btn"
        disabled={busy || text.trim().length < 5}
        onClick={async () => {
          setBusy(true);
          const r = await g.actions.petition(text.trim());
          setNote(
            r.ok
              ? "Submitted. The machine will consider it."
              : r.result === "one_scheme_at_a_time"
                ? "One scheme at a time, pirate."
                : "Declined."
          );
          if (r.ok) setText("");
          setBusy(false);
        }}
      >
        Submit
      </button>
      {note && (
        <p className="text-sm" style={{ color: "var(--gold)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function VolunteerButton({ g }: { g: ReturnType<typeof useGame> }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn mt-2 w-full"
      disabled={done}
      onClick={async () => {
        await g.actions.volunteer();
        setDone(true);
      }}
    >
      {done ? "The machine has noticed you." : "I'm in"}
    </button>
  );
}

// ------------------------------- MORE ---------------------------------------
function MorePanel({ g, rogueLive }: { g: ReturnType<typeof useGame>; rogueLive: boolean }) {
  const me = g.me!;
  const game = g.game!;
  const notesKey = `parlour-notes-${game.code}-${me.name}`;
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(notesKey) ?? "";
    } catch {
      return "";
    }
  });

  return (
    <div className="flex flex-col gap-4">
      {me.character && (
        <Accordion title={me.character.personaName ?? "Your character"} kicker={rogueLive ? "🎭 who you were, before" : "🎭 your character"} defaultOpen={!rogueLive}>
          <CharacterSheet ch={me.character} defaultOpen />
        </Accordion>
      )}

      <Accordion title="About the game" kicker="📖 how tonight works" defaultOpen={!me.character}>
        <AboutContent mode={game.mode} hijacked={!!game.hijacked_at} cost={Number(game.config?.audienceCost ?? 250)} />
      </Accordion>

      <Accordion title="My notes" kicker="📔 yours alone — never leaves this phone">
        <textarea
          className="input h-36"
          placeholder="Suspicions, alibis, who toasted whom…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            try {
              localStorage.setItem(notesKey, e.target.value);
            } catch {}
          }}
        />
      </Accordion>

      <Accordion title="Who's here" kicker="🧭 the room">
        <ul className="flex flex-col gap-1 text-sm">
          {g.roster.map((p) => (
            <li key={p.id} className={p.status === "dead" || p.status === "banished" ? "line-through opacity-50" : ""}>
              {p.status === "ghost" && "👻 "}
              {p.name}
              {p.is_host ? " ✦" : ""}
              {!p.arrived_at && <span style={{ color: "var(--ink-dim)" }}> — expected</span>}
            </li>
          ))}
        </ul>
      </Accordion>

      {me.is_host && <HostTools g={g} />}
    </div>
  );
}

function AboutContent({ mode, hijacked, cost }: { mode: string; hijacked: boolean; cost: number }) {
  if (mode === "rogue" && !hijacked)
    return (
      <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
        <p>Tonight is a murder mystery in three acts. When the game begins, you'll play the character on this phone — mingle, keep your secret, and trust nobody.</p>
        <p>Keep your phone nearby; the game will tell you what it needs, when it needs it. Until then: drink, chat, and stay in costume.</p>
        <p className="italic">The game will begin shortly.</p>
      </div>
    );
  if (mode === "rogue")
    return (
      <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
        <p><b style={{ color: "var(--ink)" }}>The situation.</b> The game you were promised is gone. Something has your money and it is hiring. Something else is trying to stop it. Both may message you. Neither is required to tell the truth.</p>
        <p><b style={{ color: "var(--ink)" }}>Your purse.</b> Offers restore coins to it — taking one is entirely your business, and entirely private. Honest work pays too. The meters at the top move for everyone at once.</p>
        <p><b style={{ color: "var(--ink)" }}>Paper.</b> Slips with codes are hidden around the party. Found one? Type it in. Told to hide one? Do it well.</p>
        <p><b style={{ color: "var(--ink)" }}>Your mark.</b> The symbol on your Now screen. If asked to verify someone, get them to SHOW you theirs — never say yours aloud.</p>
        <p><b style={{ color: "var(--ink)" }}>Accusations.</b> The room may vote to name whoever fronts the machine. Right — they burn (and stay in play). Wrong — everyone pays for it. The night ends with one final naming: get it right, together, or the machine keeps everything.</p>
        <p><b style={{ color: "var(--ink)" }}>Talking to the machines.</b> The Ask tab buys you audiences ({cost} a question), takes your schemes, and hears volunteers.</p>
        <p><b style={{ color: "var(--ink)" }}>Need out?</b> Hold the ◦ button. It's private, it's instant, and it's always okay.</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
      <p><b style={{ color: "var(--ink)" }}>Your character.</b> Play them loosely — the costume note and mannerism are enough. Your secret is yours to protect.</p>
      <p><b style={{ color: "var(--ink)" }}>Challenges.</b> Private tasks arrive on this phone. Some are jokes. Some matter. Nobody can tell which from watching you.</p>
      <p><b style={{ color: "var(--ink)" }}>Death.</b> If you're murdered, die theatrically — you'll return as someone new. Nobody sits out.</p>
      <p><b style={{ color: "var(--ink)" }}>Votes.</b> Assemblies end in banishments. The banished are revealed. Choose carefully.</p>
      <p><b style={{ color: "var(--ink)" }}>Need out?</b> Hold the ◦ button. Private, instant, always okay.</p>
    </div>
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

// I3: long-press 1.5s → private out (sits above the tab bar)
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
        className="fixed right-4 bottom-20 z-40 h-10 w-10 rounded-full border text-lg opacity-40"
        style={{ borderColor: "var(--ink-dim)", background: "color-mix(in srgb, var(--bg) 70%, transparent)" }}
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
