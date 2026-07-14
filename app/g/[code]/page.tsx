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
  RedemptionCard,
  MissionCard,
  CodeEntryBox,
  GlyphBadge,
} from "@/lib/client/rogue-cards";
import { useRogueTheme, GlitchOverlay } from "@/lib/client/HijackFX";
import { Accordion, InfoDot, TabBar } from "@/lib/client/ui";
import { SandboxBar } from "@/lib/client/SandboxBar";
import { WagerHub } from "@/lib/client/wager-hub";

const PHASE_LABEL: Record<string, string> = {
  none: "",
  social: "The evening unfolds…",
  murder_window: "The candles gutter…",
  body_found: "Something has happened.",
  assembly: "🔔 Assembly — gather everyone",
  // no ballot-box emoji: it renders near-black on the dark themes (review R3 visual #2)
  vote: "▣ The vote is open",
  banishment: "Judgement",
  parley: "🏴 Parley — gather at the screen",
  accusation: "☠ An accusation is on the table — vote now",
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
  // a network hiccup is NOT a missing game (review C3)
  if (g.error)
    return (
      <Center>
        <p>{g.error}</p>
        <button className="btn mt-4" onClick={() => g.refetch()}>
          Try again
        </button>
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
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [pendingName, setPendingName] = useState(""); // remembered across a 401 (review UX#4)
  const [seatCode, setSeatCode] = useState("");
  const [needsSeat, setNeedsSeat] = useState(false); // D53: takeover asks for the seat code
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(name: string, takeover = false) {
    setBusy(true);
    setError("");
    setPendingName(name);
    try {
      const res = await g.actions.join(
        name,
        takeover,
        {},
        password.trim() || undefined,
        takeover ? seatCode.trim() || undefined : undefined
      );
      if (res.status === 401 && res.needsPassword) {
        setNeedsPassword(true);
        // empty field + still 401 means a CACHED word was sent and rejected (review UX#6)
        setError(password ? "That's not tonight's word." : "Tonight's word has changed — ask the table.");
        return;
      }
      if (res.status === 409 && res.needsTakeover) {
        // D53: that name is live on another phone. Show the seat-code form —
        // entering the seat's 4 digits IS the takeover. No code? Ask the host.
        setNeedsSeat(true);
        return;
      }
      if (res.status === 403 && res.needsSeatCode) {
        setNeedsSeat(true);
        setError(seatCode ? "That code doesn't match the seat. The host can look it up." : "");
        return;
      }
      if (!res.ok && !res.playerId) setError(res.error?.toString() ?? "couldn't join");
      else setNeedsSeat(false);
    } finally {
      setBusy(false);
    }
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

      {needsPassword && (
        <form
          className="panel panel-hero flex flex-col gap-2 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingName && password.trim()) join(pendingName);
          }}
        >
          <p className="kicker">tonight's word</p>
          <input
            className="input text-center tracking-[0.15em] lowercase"
            aria-label="tonight's word"
            placeholder="ask the table"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn" disabled={busy || !password.trim() || !pendingName}>
            Step inside as {pendingName || "…"}
          </button>
          <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
            Say it aloud at the table — it keeps this night's game separate from any other.
          </p>
        </form>
      )}

      {needsSeat && (
        <form
          className="panel panel-hero flex flex-col gap-2 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingName && seatCode.trim()) join(pendingName, true);
          }}
        >
          <p className="kicker">take over “{pendingName}”</p>
          <input
            className="input text-center text-lg tracking-[0.3em]"
            aria-label="your seat code"
            placeholder="4-digit code"
            inputMode="numeric"
            enterKeyHint="go"
            maxLength={4}
            value={seatCode}
            onChange={(e) => setSeatCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <button className="btn" disabled={busy || seatCode.trim().length < 4 || !pendingName}>
            Take this seat
          </button>
          <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
            That name is already playing on another phone. Your seat code is on that phone's More tab — or ask {g.roster.find((p) => p.is_host)?.name ?? "the host"} to look it up.
          </p>
        </form>
      )}

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
        <input
          className="input"
          aria-label="your name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Your name"
        />
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
// Panels stay MOUNTED and toggle with `hidden`, so half-typed text survives a
// glance at another tab (review H4).
// ---------------------------------------------------------------------------
type Tab = "now" | "inbox" | "ask" | "more";

function PlayerView({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const game = g.game!;
  const dead = ["dead", "ghost", "banished"].includes(me.status);
  const { themeClass, glitching } = useRogueTheme(game.mode, game.hijacked_at);
  const [tab, setTab] = useState<Tab>("now");

  const rogueLive = game.mode === "rogue" && !!game.hijacked_at;

  // unread counts — keyed by ids, not names/codes (review L18)
  const seenKey = `parlour-seen-${game.id}-${me.id}`;
  const askSeenKey = `parlour-askseen-${game.id}-${me.id}`;
  const inboxMessages = g.messages.filter((m) => m.kind !== "audience");
  const audienceMessages = g.messages.filter((m) => m.kind === "audience");
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try {
      return localStorage.getItem(seenKey) ?? "";
    } catch {
      return "";
    }
  });
  const [askSeen, setAskSeen] = useState<string>(() => {
    try {
      return localStorage.getItem(askSeenKey) ?? "";
    } catch {
      return "";
    }
  });
  const unread = inboxMessages.filter((m) => m.created_at > lastSeen).length;
  // a paid answer must never arrive silently (IA review #3)
  const askUnread = audienceMessages.filter((m) => m.created_at > askSeen).length;
  useEffect(() => {
    if (tab === "inbox" && inboxMessages[0]) {
      try {
        localStorage.setItem(seenKey, inboxMessages[0].created_at);
      } catch {}
      setLastSeen(inboxMessages[0].created_at);
    }
    if (tab === "ask" && audienceMessages[0]) {
      try {
        localStorage.setItem(askSeenKey, audienceMessages[0].created_at);
      } catch {}
      setAskSeen(audienceMessages[0].created_at);
    }
  }, [tab, inboxMessages, audienceMessages, seenKey, askSeenKey]);

  const voteOpen =
    (game.round_phase === "vote" ||
      (game.mode === "rogue" && (game.round_phase === "accusation" || game.status === "unmasking"))) &&
    me.status === "alive";

  // Ask keeps its slot all night in rogue mode — tabs must not reflow mid-party
  // (IA review #15)
  const tabs = useMemo(() => {
    const t: { key: Tab; label: string; icon: string }[] = [
      { key: "now", label: "Now", icon: "🎭" },
      { key: "inbox", label: "Inbox", icon: "✉️" },
    ];
    if (game.mode === "rogue") t.push({ key: "ask", label: "Ask", icon: "🗣" });
    t.push({ key: "more", label: "More", icon: "📔" });
    return t;
  }, [game.mode]);

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
        {/* status line is game state, not garnish — full ink, screen-reader live
            (reviews: visual #14, a11y M16) */}
        <p className="text-sm italic" role="status" aria-live="polite" style={{ color: "var(--ink)" }}>
          {game.status === "lobby" && "The doors are not yet open."}
          {game.status === "act1" &&
            (game.mode === "rogue" ? "The game will begin shortly… sharpening cutlasses…" : "Guests are gathering…")}
          {game.status === "round" && `Round ${game.round_no} — ${PHASE_LABEL[game.round_phase] ?? ""}`}
          {game.status === "live" && (PHASE_LABEL[game.round_phase] || "New management. Watch your purse.")}
          {game.status === "unmasking" && "▣ THE UNMASKING — one name, together"}
          {game.status === "endgame" && "The end approaches."}
          {game.status === "reveal" && "The truth."}
          {game.status === "ended" && "The evening is over."}
        </p>
      </header>

      <div role="status" aria-live="polite">
        {game.paused && <PausedBanner />}
        {dead && <DeadBanner status={me.status} />}
        {Boolean(game.config?.tutorial) && <InductionStrip g={g} />}
      </div>

      <div className={tab === "now" ? "" : "hidden"}>
        <NowPanel g={g} rogueLive={rogueLive} voteOpen={voteOpen} />
      </div>
      <div className={tab === "inbox" ? "" : "hidden"}>
        <InboxPanel g={g} messages={inboxMessages} rogueLive={rogueLive} />
      </div>
      {game.mode === "rogue" && (
        <div className={tab === "ask" ? "" : "hidden"}>
          {rogueLive ? (
            <AskPanel g={g} audienceMessages={audienceMessages} />
          ) : (
            <div className="panel p-4 text-center text-sm italic" style={{ color: "var(--ink-dim)" }}>
              The machines are not yet listening.
            </div>
          )}
        </div>
      )}
      <div className={tab === "more" ? "" : "hidden"}>
        <MorePanel key={`${game.id}-${me.id}`} g={g} rogueLive={rogueLive} />
      </div>

      <PanicButton g={g} />
      <TabBar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        badges={{ now: g.challenges.length + (voteOpen ? 1 : 0), inbox: unread, ask: askUnread }}
      />
    </main>
  );
}

// D47: THE INDUCTION — a thin progress line so both phones always know which
// step the machine is waiting on. Reads the public tutorial_step events.
function InductionStrip({ g }: { g: ReturnType<typeof useGame> }) {
  const complete = g.publicEvents.find((e) => e.type === "tutorial_complete");
  const step = g.publicEvents.find((e) => e.type === "tutorial_step");
  if (complete)
    return (
      <div className="panel mt-2 px-4 py-2 text-center text-xs" style={{ color: "var(--gold)" }}>
        🎓 INDUCTION COMPLETE — the record is in your Inbox
      </div>
    );
  if (!step) return null;
  const p = step.payload as { step?: number; title?: string; of?: number };
  return (
    <div className="panel mt-2 px-4 py-2 text-center text-xs" style={{ color: "var(--ink-dim)" }}>
      🎓 Induction {Number(p.step ?? 0) + 1}/{p.of ?? 18} — <span style={{ color: "var(--ink)" }}>{p.title}</span>
    </div>
  );
}

// ------------------------------- NOW ---------------------------------------
// Urgency order (IA review #2): vote → offers/missions → code entry → status
// furniture (meters/purse/glyph). A 10-second burst lands on the action.
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
  const [nearMiss, setNearMiss] = useState(false);
  const aliveNames = g.roster.filter((p) => p.status === "alive" && p.id !== me.id).map((p) => p.name);
  const sym = game.story_public?.currency?.symbol ?? "Ƀ"; // pub night pays in ◎, not Ƀ

  return (
    <div className="flex flex-col gap-4">
      {!me.arrived_at && game.status !== "lobby" && (
        <button className="btn" onClick={() => g.actions.arrive()}>
          🚪 I have arrived at the party
        </button>
      )}

      {voteOpen && <LiveVote g={g} />}

      {nearMiss && (
        <div className="panel p-4 text-sm" style={{ borderColor: "var(--danger)" }} role="status">
          <p className="kicker kicker-danger">a heartbeat too late</p>
          <p className="mt-1">Someone else moved first tonight. Say nothing.</p>
          <button className="btn btn-ghost mt-2 text-xs" onClick={() => setNearMiss(false)}>
            Understood
          </button>
        </div>
      )}

      {g.challenges.map((c) =>
        c.type === "bribe" ? (
          <BribeCard
            key={c.id}
            c={c}
            symbol={sym}
            busy={busy}
            onAccept={async () => {
              setBusy(true);
              try {
                await g.actions.acceptOffer(c.id);
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : c.type === "redemption" ? (
          <RedemptionCard
            key={c.id}
            c={c}
            symbol={sym}
            busy={busy}
            onAccept={async () => {
              setBusy(true);
              try {
                await g.actions.acceptOffer(c.id);
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : c.type === "mission" ? (
          <MissionCard
            key={c.id}
            c={c}
            busy={busy}
            onRespond={async (text) => {
              setBusy(true);
              try {
                await g.actions.respond(c.id, text);
              } finally {
                setBusy(false);
              }
            }}
            onSelfComplete={async () => {
              setBusy(true);
              try {
                await g.actions.completeChallenge(c.id);
              } finally {
                setBusy(false);
              }
            }}
            onCompose={async (asSender, draft) => {
              setBusy(true);
              try {
                await g.actions.compose(asSender, draft);
              } finally {
                setBusy(false);
              }
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
              try {
                const res = await g.actions.completeChallenge(c.id, victimName);
                if (!res.ok && res.result === "near_miss") setNearMiss(true); // in-theme, not alert() (review H10)
              } finally {
                setBusy(false);
              }
            }}
          />
        )
      )}

      {rogueLive && game.status === "live" && me.status === "alive" && (me.sight ?? 0) > 0 && (
        <SeerCard g={g} aliveNames={aliveNames} />
      )}

      {rogueLive && game.status === "live" && me.status === "alive" && <WagerHub g={g} />}

      {rogueLive &&
        game.status === "live" &&
        me.status === "alive" &&
        (game.config?.mechanics as { codes?: boolean })?.codes !== false && (
          <CodeEntryBox
            busy={busy}
            onFind={(slip) => g.actions.findCode(slip)}
            onHide={(slip, hint) => g.actions.hideCode(slip, hint)}
          />
        )}

      <IntakeCard key={`${game.id}-${me.id}`} g={g} />

      {g.challenges.length === 0 && !voteOpen && (
        <div className="panel p-4 text-center text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Nothing is asked of you. Right now. Enjoy the party — it will find you.
        </div>
      )}

      {rogueLive && (
        <>
          <div className="relative">
            <MetersStrip meters={game.meters} currencySymbol={sym} />
            <span className="absolute top-1 right-1">
              <InfoDot
                edge="right"
                hint="Twin public gauges. The skull is what the rogue has taken; the lantern is what honest work has built. They move for everyone at once — draw your own conclusions about when."
              />
            </span>
          </div>
          <PurseChip balance={me.balance} transactions={g.transactions} symbol={sym} />
          <GlyphBadge gameId={game.id} playerId={me.id} />
        </>
      )}

      {!me.character && !rogueLive && (
        <div className="panel p-4 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Your character will find you when the story is sealed.
        </div>
      )}
    </div>
  );
}

// D56: THE SIGHT — spend a scarce Seer charge on one bounded true question.
function SeerCard({ g, aliveNames }: { g: ReturnType<typeof useGame>; aliveNames: string[] }) {
  const sight = g.me!.sight ?? 0;
  const [q, setQ] = useState<"is_bought" | "has_taken_coin" | "count_bought" | "name_frontman">("is_bought");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState("");
  const [note, setNote] = useState("");
  const needsTarget = q !== "count_bought";

  async function ask(confirm = false) {
    setBusy(true);
    setWarn("");
    setNote("");
    try {
      const r = await g.actions.seer(q, needsTarget ? target : undefined, confirm);
      if (r.result === "forbidden") setWarn(r.warn ?? "the machine won't confirm that");
      else if (r.ok) setNote("The Sight has spoken — read it in your Inbox.");
      else setNote(r.result?.replaceAll("_", " ") ?? "the sight is clouded");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4" style={{ borderColor: "var(--gold)" }}>
      <p className="kicker" style={{ color: "var(--gold)" }}>
        👁 THE SIGHT — {sight} charge{sight === 1 ? "" : "s"}
        <InfoDot hint="Honest work earned this. One true answer, about one person, delivered privately. The machine won't name its own front man — ask, and it gives a clue instead, for the same price." />
      </p>
      <select className="input mt-2" aria-label="what to ask" value={q} onChange={(e) => { setQ(e.target.value as typeof q); setWarn(""); }}>
        <option value="is_bought">Is someone bought — right now?</option>
        <option value="has_taken_coin">Has someone ever taken the rogue's coin?</option>
        <option value="count_bought">How many serve the rogue right now?</option>
        <option value="name_frontman">Who is the front man? (it won't say — clue only)</option>
      </select>
      {needsTarget && (
        <select className="input mt-2" aria-label="about whom" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">About whom?</option>
          {aliveNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      )}
      {warn ? (
        <div className="mt-2">
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>{warn}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn flex-1" disabled={busy} onClick={() => ask(true)}>Take the clue (spends a charge)</button>
            <button className="btn btn-ghost flex-1" disabled={busy} onClick={() => setWarn("")}>Keep my sight</button>
          </div>
        </div>
      ) : (
        <button className="btn mt-2 w-full" disabled={busy || (needsTarget && !target)} onClick={() => ask(false)}>
          Look
        </button>
      )}
      {note && <p className="mt-2 text-sm" style={{ color: "var(--gold)" }}>{note}</p>}
    </div>
  );
}

// ------------------------------ INBOX ---------------------------------------
function InboxPanel({
  g,
  messages,
  rogueLive,
}: {
  g: ReturnType<typeof useGame>;
  messages: ReturnType<typeof useGame>["messages"];
  rogueLive: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      {rogueLive &&
        g.me!.status === "alive" &&
        (g.game!.config?.mechanics as { notes?: boolean })?.notes !== false && <NoteComposer g={g} />}
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

// D38: pass a note — postage applies, the courier is not your friend
function NoteComposer({ g }: { g: ReturnType<typeof useGame> }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const postage = Number(g.game!.config?.notePostage ?? 15);
  const stamps = g.me!.stamps ?? 0;
  // pub FIELD TRIAL: the machine sells stamps at the counter — postage only
  // (review R3 #4: the server honoured stamplessNotes; the UI didn't)
  const stampless = g.game!.config?.stamplessNotes === true;
  const sym = g.game!.story_public?.currency?.symbol ?? "Ƀ";
  const others = g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id);

  // D38a: no stamp, no post — go talk in person. The composer only exists for
  // players the machine has granted posting rights.
  if (!stampless && stamps < 1)
    return (
      <p className="text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
        The post office doesn't know you. Posting rights are earned — or you could always just… walk over.
      </p>
    );

  if (!open)
    return (
      <button className="btn btn-ghost w-full" onClick={() => setOpen(true)}>
        ✉ Pass a note ·{" "}
        {stampless ? `${postage}${sym} postage` : `${stamps} stamp${stamps === 1 ? "" : "s"} · ${postage}${sym} postage`}
      </button>
    );

  return (
    <div className="panel p-4">
      <p className="kicker flex items-center justify-between">
        <span>
          pass a note
          <InfoDot hint="The house carries your letters for a fee. The house also reads them, occasionally edits them, and answers to nobody. A signature on an envelope proves nothing." />
        </span>
        <button className="text-xs underline" style={{ color: "var(--ink-dim)" }} onClick={() => setOpen(false)}>
          close
        </button>
      </p>
      <select className="input mt-2" aria-label="recipient" value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">To whom?</option>
        {others.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <textarea
        className="input mt-2 h-20"
        aria-label="your note"
        maxLength={300}
        placeholder="Written in haste…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn mt-2 w-full"
        disabled={busy || !to || !text.trim()}
        onClick={async () => {
          setBusy(true);
          setNote("");
          try {
            const r = await g.actions.sendNote(to, text.trim());
            if (r.ok) {
              setNote("Posted. The house carries it from here.");
              setText("");
            } else
              setNote(
                r.result === "insufficient_postage"
                  ? `Postage is ${postage} — your purse disagrees.`
                  : (r.error ?? "The post office said no.")
              );
          } finally {
            setBusy(false);
          }
        }}
      >
        Send · {postage}{sym}
      </button>
      {note && (
        <p className="mt-2 text-sm" style={{ color: note.startsWith("Posted") ? "var(--gold)" : "var(--danger)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

// ------------------------------- ASK ----------------------------------------
function AskPanel({
  g,
  audienceMessages,
}: {
  g: ReturnType<typeof useGame>;
  audienceMessages: ReturnType<typeof useGame>["messages"];
}) {
  const game = g.game!;
  const [ai, setAi] = useState<"rogue" | "good">("rogue");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const names = game.story_public?.ais;
  // single-voice night (pub FIELD TRIAL): no good AI is published — one door, no picker
  const twoVoices = Boolean(names?.good?.name);
  const cost = Number(game.config?.audienceCost ?? 250);
  const thread = audienceMessages.slice().reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-4">
        <p className="kicker">
          an audience with the machine
          <InfoDot
            hint={`One question, answered in its own voice, for ${cost} from your purse. Capped per night. It may lie. It may not reveal who serves whom — it enjoys being asked.`}
          />
        </p>
        {twoVoices ? (
          <div className="mt-3 flex gap-2">
            <button className={`btn flex-1 text-xs ${ai === "rogue" ? "" : "btn-ghost"}`} onClick={() => setAi("rogue")}>
              {names?.rogue?.name ?? "the villain"}
            </button>
            <button className={`btn flex-1 text-xs ${ai === "good" ? "" : "btn-ghost"}`} onClick={() => setAi("good")}>
              {names?.good?.name ?? "the other one"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
            {names?.rogue?.name ?? "the machine"} is listening.
          </p>
        )}
        <textarea
          className="input mt-3 h-20"
          aria-label="your question for the machine"
          placeholder="Choose your question carefully…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn mt-2 w-full"
          disabled={busy || !q.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await g.actions.audience(ai, q.trim());
              setNote(r.ok ? "" : (r.error ?? "the machine declined"));
              if (r.ok) setQ("");
            } finally {
              setBusy(false);
            }
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
      <textarea
        className="input h-20"
        aria-label="your scheme"
        placeholder="I want to…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn"
        disabled={busy || text.trim().length < 5}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await g.actions.petition(text.trim());
            setNote(
              r.ok
                ? "Submitted. The machine will consider it."
                : r.result === "one_scheme_at_a_time"
                  ? "One scheme at a time, pirate."
                  : (r.error ?? "Declined.")
            );
            if (r.ok) setText("");
          } finally {
            setBusy(false);
          }
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
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  return (
    <button
      className="btn mt-2 w-full"
      disabled={state === "busy" || state === "done"}
      onClick={async () => {
        setState("busy");
        const r = await g.actions.volunteer();
        setState((r as { ok?: boolean })?.ok ? "done" : "failed");
      }}
    >
      {state === "done"
        ? "The machine has noticed you."
        : state === "failed"
          ? "The house lost you — tap again"
          : state === "busy"
            ? "…"
            : "I'm in"}
    </button>
  );
}

// ------------------------------- MORE ---------------------------------------
function MorePanel({ g, rogueLive }: { g: ReturnType<typeof useGame>; rogueLive: boolean }) {
  const me = g.me!;
  const game = g.game!;
  const notesKey = `parlour-notes-${game.id}-${me.id}`;
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(notesKey) ?? "";
    } catch {
      return "";
    }
  });

  // rules first and OPEN all night (IA review #11); the dead persona demotes
  const about = (
    <Accordion title="About the game" kicker="📖 how tonight works" defaultOpen>
      <AboutContent mode={game.mode} hijacked={!!game.hijacked_at} cost={Number(game.config?.audienceCost ?? 250)} />
    </Accordion>
  );
  const character = me.character && (
    <Accordion
      title={me.character.personaName ?? "Your character"}
      kicker={rogueLive ? "🎭 who you were, before" : "🎭 your character"}
      defaultOpen={!rogueLive}
    >
      <CharacterSheet ch={me.character} defaultOpen />
    </Accordion>
  );

  return (
    <div className="flex flex-col gap-4">
      {rogueLive ? about : character}
      {rogueLive ? character : about}

      {me.seat_code && (
        <div className="panel px-4 py-2 text-center text-sm" style={{ color: "var(--ink-dim)" }}>
          your seat code: <b style={{ color: "var(--gold)", letterSpacing: "0.2em" }}>{me.seat_code}</b>
          <span className="mt-0.5 block text-xs italic">need it only to rejoin on another phone. {g.roster.find((p) => p.is_host)?.name ?? "the host"} can look it up.</span>
        </div>
      )}

      <Accordion title="My notes" kicker="📔 yours alone — never leaves this phone">
        <textarea
          className="input h-36"
          aria-label="your private notes"
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

      {g.history.length > 0 && (
        <Accordion title="Earlier tonight" kicker="🧾 what's done is done">
          <ul className="flex flex-col gap-2 text-sm">
            {g.history.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1" style={{ color: "var(--ink-dim)" }}>
                  {c.brief}
                </span>
                <span
                  className="text-xs whitespace-nowrap"
                  style={{ color: c.status === "completed" ? "var(--gold)" : "var(--ink-dim)" }}
                >
                  {c.status === "completed" ? "✓ done" : c.status === "expired" ? "let pass" : c.status}
                </span>
              </li>
            ))}
          </ul>
        </Accordion>
      )}

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
        <p><b style={{ color: "var(--ink)" }}>Your purse.</b> Offers restore coins to it — taking one is entirely your business, and entirely private. Honest work pays too. The meters on the Now screen move for everyone at once.</p>
        <p><b style={{ color: "var(--ink)" }}>Paper.</b> Slips with codes are hidden around the party. Found one? Type it in on the Now screen. Told to hide one? Do it well.</p>
        <p><b style={{ color: "var(--ink)" }}>Your mark.</b> The symbol at the bottom of Now. If asked to verify someone, get them to SHOW you theirs — never say yours aloud.</p>
        <p><b style={{ color: "var(--ink)" }}>Accusations.</b> The room may vote to name the machine's human voice — its "front man". Right — they burn (exposed, but still playing). Wrong — everyone pays for it. The night ends with one final naming: get it right, together, or the machine keeps everything.</p>
        <p><b style={{ color: "var(--ink)" }}>Talking to the machines.</b> The Ask tab buys you audiences ({cost} a question), takes your schemes, and hears volunteers.</p>
        <p><b style={{ color: "var(--ink)" }}>Passing notes.</b> With a stamp — earned, never given freely — Inbox lets you write to anyone, for postage. The house carries your letters. The house reads your letters. Nothing about that arrangement is in your favour, and a signature proves nothing. No stamp? Walk over and whisper like an honest pirate.</p>
        <p><b style={{ color: "var(--ink)" }}>Need out?</b> Hold the ◦ button for a moment — a ring fills while you hold. It's private, it's instant, and it's always okay.</p>
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

// GAPS #8: the slim intake, finally typeable. Shows once (pre-hijack), optional,
// dismissible; the generator weaves whatever arrives.
function IntakeCard({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const game = g.game!;
  const doneKey = `parlour-intake-${game.id}-${me.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(doneKey) === "1";
    } catch {
      return false;
    }
  });
  const [occupation, setOccupation] = useState("");
  const [relation, setRelation] = useState("");
  const [arrival, setArrival] = useState("");
  const [busy, setBusy] = useState(false);
  const [intakeErr, setIntakeErr] = useState("");

  const hasIntake = !!(me as { intake?: Record<string, unknown> }).intake?.occupation;
  if (dismissed || hasIntake || game.hijacked_at || game.status === "reveal" || game.status === "ended") return null;

  const finish = () => {
    try {
      localStorage.setItem(doneKey, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="panel p-4">
      <p className="kicker">the invitation asks (optional — but it makes the story yours)</p>
      <div className="mt-2 flex flex-col gap-2">
        <input className="input" aria-label="what do you do?" placeholder="What do you do? (job, hobby, claim to fame)" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
        <input className="input" aria-label="how do you know the host?" placeholder="How do you know the host?" value={relation} onChange={(e) => setRelation(e.target.value)} />
        <input className="input" aria-label="when will you arrive?" placeholder="When will you arrive? (e.g. 7:30ish)" value={arrival} onChange={(e) => setArrival(e.target.value)} />
        <div className="flex gap-2">
          <button
            className="btn flex-1"
            disabled={busy || (!occupation.trim() && !relation.trim() && !arrival.trim())}
            onClick={async () => {
              setBusy(true);
              setIntakeErr("");
              try {
                const res = await fetch("/api/intake", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    code: game.code,
                    intake: { occupation: occupation.trim(), relationToHost: relation.trim(), expectedArrival: arrival.trim() },
                  }),
                });
                // only dismiss on real success — a 500 must not eat the data (review UX#5)
                if (res.ok) {
                  finish();
                  g.refetch();
                } else setIntakeErr("The house lost that — try again.");
              } catch {
                setIntakeErr("The house lost that — try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            That's me
          </button>
          <button className="btn btn-ghost" onClick={finish}>
            Skip
          </button>
        </div>
        {intakeErr && (
          <p className="text-sm" role="status" style={{ color: "var(--danger)" }}>
            {intakeErr}
          </p>
        )}
      </div>
    </div>
  );
}

// D42a: the hosts' private "feels slow" nudge — softer than break-glass
function DragFlagButton({ g }: { g: ReturnType<typeof useGame> }) {
  const [state, setState] = useState<"idle" | "sent">("idle");
  useEffect(() => {
    if (state !== "sent") return;
    const t = setTimeout(() => setState("idle"), 60_000); // re-arm after a while
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      className="btn btn-ghost"
      disabled={state === "sent"}
      onClick={async () => {
        await g.actions.flagDragging();
        setState("sent");
      }}
    >
      {state === "sent" ? "⏭ noted, quietly" : "⏭ feels slow"}
    </button>
  );
}

function LiveVote({ g }: { g: ReturnType<typeof useGame> }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const candidates = g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id);
  const rogue = g.game!.mode === "rogue";
  const unmasking = g.game!.status === "unmasking";
  return (
    <VoteTable
      candidates={candidates}
      votedId={g.myVote} // server-derived — survives reloads and tab switches (review H8)
      busy={busy}
      note={note}
      title={!rogue ? "The round table" : unmasking ? "THE UNMASKING" : "The accusation"}
      subtitle={
        !rogue
          ? "Who do you banish? You may change your mind until the house calls time."
          : unmasking
            ? "One name, together: who speaks for the machine RIGHT NOW? Right — and it loses its head. Wrong — and everything on that meter is its, forever."
            : "Who is the machine's human voice right now? Right — they burn. Wrong — you'll all be billed for it."
      }
      onVote={async (id) => {
        setBusy(true);
        setNote("");
        try {
          const r = await g.actions.vote(id);
          if (!r.ok) setNote(r.error ?? "The house didn't hear that — try again.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

// D43: the conductor's readout — live, private, anonymized. What "the machine
// heard you" actually looks like.
type Pulse = {
  phase: string;
  minutesInPhase: number | null;
  machineLastActedMinsAgo: number | null;
  flag: { minsAgo: number | null; mine: boolean; movesSince: number | null } | null;
  ticker: { what: string; minsAgo: number | null }[];
};

function ConductorStrip({ g }: { g: ReturnType<typeof useGame> }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const code = g.game!.code;
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/host/pulse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (res.ok && alive) setPulse(await res.json());
      } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [code, g.publicEvents.length]); // refreshes with the event stream too

  if (!pulse) return null;
  const ago = (m: number | null) => (m === null ? "—" : m < 1 ? "now" : `${m}m ago`);
  return (
    <div className="mt-3 rounded p-3 text-xs" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <b style={{ color: "var(--ink)" }}>{pulse.phase}</b>
          <span style={{ color: "var(--ink-dim)" }}>
            {pulse.minutesInPhase !== null && ` · ${pulse.minutesInPhase}m in`}
          </span>
        </span>
        <span style={{ color: "var(--ink-dim)" }}>machine acted {ago(pulse.machineLastActedMinsAgo)}</span>
      </div>
      {pulse.flag && (
        <p className="mt-1.5" style={{ color: "var(--gold)" }}>
          ⏭ {pulse.flag.mine ? "your" : "a"} flag, {ago(pulse.flag.minsAgo)} —{" "}
          {pulse.flag.movesSince === 0
            ? "nothing yet. It knows."
            : `${pulse.flag.movesSince} thing${pulse.flag.movesSince === 1 ? "" : "s"} have happened since`}
        </p>
      )}
      {pulse.ticker.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5" style={{ color: "var(--ink-dim)" }}>
          {pulse.ticker.slice(0, 5).map((t, i) => (
            <li key={i}>
              · {t.what} <span className="opacity-60">({ago(t.minsAgo)})</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 italic opacity-60" style={{ color: "var(--ink-dim)" }}>
        who did what stays sealed — this is the pulse, not the plot
      </p>
    </div>
  );
}

function HostTools({ g }: { g: ReturnType<typeof useGame> }) {
  const game = g.game!;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [twist, setTwist] = useState("");
  const [seats, setSeats] = useState<{ name: string; seat_code: string | null }[] | null>(null);
  const sealed = !!game.story_public?.meta;

  async function act(action: string) {
    setBusy(true);
    try {
      const res = await g.actions.breakglass(action);
      if (action === "reveal_twist" && res.twist) setTwist(res.twist);
      if (action === "read_seats") setSeats(res.seats ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-5">
      <p className="kicker">Host — ✦</p>
      <ConductorStrip g={g} />
      <div className="mt-3 flex flex-wrap gap-2">
        {!sealed && (
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await g.actions.sealStory();
                g.refetch();
              } finally {
                setBusy(false);
              }
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
        {game.mode === "rogue" && game.status === "act1" && !game.hijacked_at && (
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => {
              if (confirm("Fire the takeover NOW? Every phone in the room goes dark at once."))
                act("fire_hijack");
            }}
          >
            ⚡ Begin the takeover
          </button>
        )}
        {Boolean(game.config?.tutorial) && (
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              if (confirm("Skip this induction step? It will be marked SKIPPED in the record — re-run it before the real night."))
                act("tutorial_skip");
            }}
          >
            ⏭ Skip induction step
          </button>
        )}
        <button className="btn btn-ghost" disabled={busy} onClick={() => (seats ? setSeats(null) : act("read_seats"))}>
          🔑 Seat codes
        </button>
        <Link href={`/tv/${game.code}`} className="btn btn-ghost">
          📺 House channel
        </Link>
        <DragFlagButton g={g} />
        {Number(game.config?.timeScale ?? 1) > 1 && (
          <Link href={`/sandbox/${game.code}`} className="btn btn-ghost">
            🧪 Sandbox
          </Link>
        )}
        {/* opening the panel is LOCAL — pausing the whole party is its own
            explicit act inside it (IA review #5) */}
        {!open && (
          <button className="btn btn-ghost" onClick={() => setOpen(true)}>
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
            These controls are loud. "Pause the night" shows every guest the flicker.
          </p>
          <div className="flex flex-wrap gap-2">
            {!game.paused ? (
              <button className="btn btn-danger" disabled={busy} onClick={() => act("open")}>
                ⏸ Pause the night (publicly)
              </button>
            ) : (
              <button className="btn" disabled={busy} onClick={() => act("resume")}>
                ▶ Resume
              </button>
            )}
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
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Close panel
            </button>
          </div>
          {twist && <p className="text-sm italic">{twist}</p>}
        </div>
      )}
      {seats && (
        <div className="panel mt-3 p-3 text-sm">
          <p className="kicker">🔑 seat codes — for a guest whose phone died</p>
          <ul className="mt-2 flex flex-col gap-1">
            {seats.map((s) => (
              <li key={s.name} className="flex justify-between gap-3">
                <span style={{ color: "var(--ink-dim)" }}>{s.name}</span>
                <span style={{ color: "var(--gold)", letterSpacing: "0.15em" }}>{s.seat_code ?? "—"}</span>
              </li>
            ))}
          </ul>
          <button className="mt-2 text-xs underline" style={{ color: "var(--ink-dim)" }} onClick={() => setSeats(null)}>
            hide
          </button>
        </div>
      )}
    </div>
  );
}

// I3: long-press 1.5s → private out. A ring fills during the hold so the
// gesture is learnable (IA review #1); server success is confirmed before the
// player is reassured (a11y review H9).
function PanicButton({ g }: { g: ReturnType<typeof useGame> }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  function down() {
    setHolding(true);
    timer.current = setTimeout(() => {
      setArmed(true);
      setHolding(false);
    }, 1500);
  }
  function up() {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  }

  return (
    <>
      <button
        aria-label="hold for a quieter night — private"
        className="fixed right-4 bottom-20 z-40 h-12 w-12 rounded-full border text-lg"
        style={{
          borderColor: holding ? "var(--gold)" : "var(--ink-dim)",
          opacity: holding ? 1 : 0.45,
          background: holding
            ? "conic-gradient(var(--gold) 0deg, var(--gold) var(--hold-deg, 360deg), transparent var(--hold-deg, 360deg))"
            : "color-mix(in srgb, var(--bg) 70%, transparent)",
          transition: holding ? "background 1.5s linear" : "none",
        }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onContextMenu={(e) => e.preventDefault()}
      >
        ◦
      </button>
      {armed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="quieter evening"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => state !== "sending" && setArmed(false)}
          onKeyDown={(e) => e.key === "Escape" && state !== "sending" && setArmed(false)}
        >
          <div className="panel panel-hero max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {state === "sent" ? (
              <>
                <p>Understood. The house will quietly ask less of you. Nobody will know.</p>
                <button
                  className="btn mt-4"
                  autoFocus
                  onClick={() => {
                    setArmed(false);
                    setState("idle");
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold">Need a quieter evening?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-dim)" }}>
                  This privately tells the game to ease off you. No one else will ever see this.
                </p>
                {state === "failed" && (
                  <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>
                    That didn't reach the house — please try again.
                  </p>
                )}
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    className="btn"
                    autoFocus
                    disabled={state === "sending"}
                    onClick={async () => {
                      setState("sending");
                      const r = await g.actions.panic();
                      setState((r as { ok?: boolean })?.ok ? "sent" : "failed");
                    }}
                  >
                    {state === "sending" ? "…" : "Yes, ease off"}
                  </button>
                  <button className="btn btn-ghost" disabled={state === "sending"} onClick={() => setArmed(false)}>
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
