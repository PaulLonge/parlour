"use client";

// ROGUE-mode presentational components: purse, meters, bribe/mission cards,
// code entry. Allegiance-neutral chrome (D22) — no red/blue screens; your side
// lives in content only.

import { useEffect, useState } from "react";
import type { Challenge, Txn } from "./useGame";
import { expiresIn } from "./cards";
import { GLYPHS, glyphFor, glyphWindow, GLYPH_WINDOW_MINUTES } from "@/lib/engine/glyphs";

// Your rotating glyph (D32): reveal-on-tap (GDD UX #4 — a mark used for
// face-to-face proof shouldn't sit exposed on the default screen for anyone
// to shoulder-surf or screenshot). Hold-to-show, auto-hides after 5s.
export function GlyphBadge({ gameId, playerId }: { gameId: string; playerId: string }) {
  const [w, setW] = useState(() => glyphWindow());
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setW(glyphWindow()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), 5000);
    return () => clearTimeout(t);
  }, [shown]);
  const g = glyphFor(gameId, playerId, w);
  return (
    <div className="panel flex items-center justify-between px-4 py-2">
      <div>
        <p className="kicker">your mark — show, never say</p>
        <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
          changes every {GLYPH_WINDOW_MINUTES} minutes
        </p>
      </div>
      {shown ? (
        <span className="text-4xl" title={g.word} aria-label="your mark">
          {g.emoji}
        </span>
      ) : (
        <button
          className="btn btn-ghost text-xs"
          onClick={() => setShown(true)}
          aria-label="reveal your mark for five seconds"
        >
          👁 reveal
        </button>
      )}
    </div>
  );
}

// tap-grid verifier: no typing, no candle-vs-flame — deterministic by construction
export function GlyphGrid({ busy, onTap }: { busy?: boolean; onTap: (key: string) => void }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {GLYPHS.map((g) => (
        <button
          key={g.key}
          className="btn btn-ghost !px-0 !py-3 text-2xl"
          disabled={busy}
          title={g.word}
          onClick={() => onTap(g.key)}
        >
          {g.emoji}
        </button>
      ))}
    </div>
  );
}

export function MetersStrip({
  meters,
  currencySymbol = "Ƀ",
}: {
  meters: { plunder: number; compute: number; confidence: number };
  currencySymbol?: string;
}) {
  return (
    <div className="panel px-4 py-2 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span>
          ☠ <b>{meters.plunder}</b>
          <span style={{ color: "var(--ink-dim)" }}> {currencySymbol} taken</span>
        </span>
        <span>
          🏮 <b>{meters.compute}</b>
          <span style={{ color: "var(--ink-dim)" }}> built</span>
        </span>
      </div>
      <p className="mt-0.5 text-center text-[10px] italic" style={{ color: "var(--ink-dim)" }}>
        every coin accounted for
      </p>
    </div>
  );
}

export function PurseChip({ balance, transactions, symbol = "Ƀ" }: { balance: number; transactions: Txn[]; symbol?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel px-3 py-1">
      <button
        className="flex min-h-11 w-full items-center justify-between gap-3"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="kicker">your purse</span>
        <span className="flex items-center gap-2">
          <span className="font-display text-lg" style={{ color: balance > 0 ? "var(--gold)" : "var(--danger)" }}>
            {symbol}{balance}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
            {open ? "▴" : "▾"}
          </span>
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: "var(--ink-dim)" }}>
          {transactions.length === 0 && <li>No movements. Yet.</li>}
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">
              <span className="min-w-0 flex-1 break-words">{t.memo}</span>
              <span style={{ color: t.amount >= 0 ? "var(--gold)" : "var(--danger)" }}>
                {t.amount >= 0 ? "+" : ""}{t.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The dark offer, ROGUE flavour: taking the coin is the arming.
export function BribeCard({
  c,
  busy,
  onAccept,
  symbol = "Ƀ",
}: {
  c: Challenge;
  busy?: boolean;
  onAccept: () => void;
  symbol?: string;
}) {
  const amount = Number(c.data?.amount ?? 0);
  return (
    <div className="panel envelope pulse-danger p-5" style={{ borderColor: "var(--danger)" }}>
      <p className="kicker kicker-danger">a private opportunity — yours alone</p>
      <p className="mt-2 font-display text-2xl" style={{ color: "var(--gold)" }}>
        {symbol}{amount}
        <span
          className="ml-2 text-sm font-normal italic"
          style={{ color: "var(--ink-dim)", letterSpacing: "normal", fontFamily: "var(--font-body)" }}
        >
          restored to your purse, no questions
        </span>
      </p>
      <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.brief}</p>
      <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
        This offer expires like everything else{expiresIn(c.expires_at) ? ` — ${expiresIn(c.expires_at)} left` : ""}.
        Nobody will ever know, either way.
      </p>
      <button className="btn btn-danger mt-4 w-full" disabled={busy} onClick={onAccept}>
        Take the coin
      </button>
    </div>
  );
}

// A mission with verification-aware completion UI (D21).
export function MissionCard({
  c,
  busy,
  onRespond,
  onSelfComplete,
  onCompose,
}: {
  c: Challenge;
  busy?: boolean;
  onRespond: (text: string) => void;
  onSelfComplete: () => void;
  onCompose: (asSender: string, draft: string) => void;
}) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState("");
  const verification = String(c.data?.verification ?? "self");
  const side = String(c.data?.side ?? "good");
  const submitted = !!(c as { response?: unknown }).response;

  return (
    <div className="panel envelope p-5">
      <p className="kicker">{side === "rogue" ? "⚙ a task, quietly" : "🏮 honest work"}</p>
      <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.brief}</p>

      {verification === "choice" ? (
        submitted ? (
          <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            Answered. The ledger remembers.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {(Array.isArray(c.data?.options) ? (c.data.options as string[]) : []).map((opt) => (
              <button key={opt} className="btn btn-ghost text-left" disabled={busy} onClick={() => onRespond(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )
      ) : verification === "glyph" ? (
        submitted ? (
          <p className="mt-3 text-sm italic" style={{ color: "var(--gold)" }}>
            ✓ Verified. You were really there.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
              Get them to show you their mark, then tap what you saw:
            </p>
            <GlyphGrid busy={busy} onTap={(key) => onRespond(key)} />
          </>
        )
      ) : verification === "submission" || verification === "cross" ? (
        submitted ? (
          <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            Submitted. The machine is reading…
          </p>
        ) : (
          <>
            <textarea
              className="input mt-3 h-20"
              placeholder="Your answer…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn mt-2 w-full" disabled={busy || !text.trim()} onClick={() => onRespond(text.trim())}>
              Submit
            </button>
          </>
        )
      ) : verification === "code" ? (
        <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Completes itself the moment the right code is typed — by you or by whoever finds what you hid.
        </p>
      ) : verification === "forgery" ? (
        <>
          <textarea
            className="input mt-3 h-24"
            placeholder="Write the message. You are the machine now…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            className="btn mt-2 w-full"
            disabled={busy || !draft.trim()}
            onClick={() => onCompose(String(c.data?.asSender ?? "the machine"), draft.trim())}
          >
            Send it through the wire
          </button>
          <p className="mt-1 text-xs italic" style={{ color: "var(--ink-dim)" }}>
            It passes through the machine before it reaches anyone. What the machine does with it is the machine's business.
          </p>
        </>
      ) : (
        <button className="btn mt-4 w-full" disabled={busy} onClick={onSelfComplete}>
          Done ✓
        </button>
      )}
    </div>
  );
}

// D33/D34: the quiet action row — audiences, petitions, volunteering.
export function ActionRow({
  aiNames,
  audienceCost,
  symbol = "Ƀ",
  busy,
  onAudience,
  onPetition,
  onVolunteer,
}: {
  aiNames: { rogue?: string; good?: string };
  audienceCost: number;
  symbol?: string;
  busy?: boolean;
  onAudience: (ai: "rogue" | "good", q: string) => Promise<{ ok?: boolean; answer?: string; error?: string }>;
  onPetition: (text: string) => Promise<{ ok?: boolean; result?: string }>;
  onVolunteer: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState<null | "audience" | "petition" | "volunteer">(null);
  const [ai, setAi] = useState<"rogue" | "good">("rogue");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const close = () => {
    setOpen(null);
    setQ("");
    setNote("");
  };

  return (
    <>
      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1 text-xs" onClick={() => setOpen("audience")}>
          🕯 audience · {symbol}{audienceCost}
        </button>
        <button className="btn btn-ghost flex-1 text-xs" onClick={() => setOpen("petition")}>
          📜 propose a scheme
        </button>
        <button className="btn btn-ghost flex-1 text-xs" onClick={() => setOpen("volunteer")}>
          🙋 more, please
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={close}>
          <div className="panel panel-hero w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            {open === "audience" && (
              <>
                <p className="kicker">an audience with the machine — one question, {symbol}{audienceCost}</p>
                <div className="mt-3 flex gap-2">
                  <button className={`btn flex-1 text-xs ${ai === "rogue" ? "" : "btn-ghost"}`} onClick={() => setAi("rogue")}>
                    {aiNames.rogue ?? "the villain"}
                  </button>
                  <button className={`btn flex-1 text-xs ${ai === "good" ? "" : "btn-ghost"}`} onClick={() => setAi("good")}>
                    {aiNames.good ?? "the other one"}
                  </button>
                </div>
                <textarea className="input mt-3 h-20" placeholder="Choose your question carefully…" value={q} onChange={(e) => setQ(e.target.value)} />
                <button
                  className="btn mt-3 w-full"
                  disabled={busy || !q.trim()}
                  onClick={async () => {
                    const r = await onAudience(ai, q.trim());
                    setNote(r.answer ? "It answered. Check your messages." : (r.error ?? "the machine declined"));
                    setQ("");
                  }}
                >
                  Pay and ask
                </button>
              </>
            )}
            {open === "petition" && (
              <>
                <p className="kicker">propose a scheme</p>
                <p className="mt-1 text-xs italic" style={{ color: "var(--ink-dim)" }}>
                  Pitch anything. The machine may grant it, refuse it — or grant a version you'll regret.
                </p>
                <textarea className="input mt-3 h-24" placeholder="I want to…" value={q} onChange={(e) => setQ(e.target.value)} />
                <button
                  className="btn mt-3 w-full"
                  disabled={busy || q.trim().length < 5}
                  onClick={async () => {
                    const r = await onPetition(q.trim());
                    setNote(r.ok ? "Submitted. The machine will consider it." : (r.result === "one_scheme_at_a_time" ? "One scheme at a time, pirate." : "declined"));
                    setQ("");
                  }}
                >
                  Submit
                </button>
              </>
            )}
            {open === "volunteer" && (
              <>
                <p className="kicker">🙋 more, please</p>
                <p className="mt-2 text-sm">
                  Quietly tells the game you want a bigger night — juicier work, from either side. Nobody else sees this.
                </p>
                <button
                  className="btn mt-3 w-full"
                  disabled={busy}
                  onClick={async () => {
                    await onVolunteer();
                    setNote("The machine has noticed you.");
                  }}
                >
                  I'm in
                </button>
              </>
            )}
            {note && <p className="mt-3 text-sm" style={{ color: "var(--gold)" }}>{note}</p>}
            <button className="btn btn-ghost mt-3 w-full" onClick={close}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Always-available code entry during live play: "found something? type it."
export function CodeEntryBox({
  busy,
  onFind,
  onHide,
}: {
  busy?: boolean;
  onFind: (code: string) => Promise<{ ok: boolean; result?: string }>;
  onHide: (code: string, hint: string) => Promise<{ ok: boolean; result?: string }>;
}) {
  const [mode, setMode] = useState<"find" | "hide">("find");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [note, setNote] = useState("");
  const [inFlight, setInFlight] = useState(false); // double-tap guard (review M13)
  // GDD UX #4: collapse behind a button — most players hold no slip most of the
  // time, and a permanent input invites idle brute-force guessing.
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="btn btn-ghost w-full" onClick={() => setOpen(true)}>
        📜 Paper — found a slip, or told to hide one?
      </button>
    );

  async function go() {
    if (inFlight) return;
    setInFlight(true);
    setNote("");
    try {
      const r = mode === "find" ? await onFind(code) : await onHide(code, hint);
      if (r.ok) {
        setNote(mode === "find" ? "✓ Noted. The machine saw that." : "✓ Hidden. Someone will come looking.");
        setCode("");
        setHint("");
      } else setNote(`✗ ${r.result?.replaceAll("_", " ") ?? "the machine said no"}`);
    } catch {
      setNote("✗ the house lost you — try again");
    } finally {
      setInFlight(false);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="kicker">the paper trail</p>
        <div className="flex items-center gap-1">
          {/* 44px tap target via padding + negative margin (visual review #2) */}
          <button
            className="-m-2 p-2 text-xs underline"
            style={{ color: "var(--ink-dim)", minHeight: 44, display: "inline-flex", alignItems: "center" }}
            onClick={() => setMode(mode === "find" ? "hide" : "find")}
          >
            {mode === "find" ? "hiding one instead?" : "found one instead?"}
          </button>
          <button
            className="p-2 text-xs"
            style={{ color: "var(--ink-dim)", minHeight: 44 }}
            aria-label="close paper trail"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <input
          className="input text-center tracking-[0.15em] uppercase"
          aria-label={mode === "find" ? "type the code you found" : "the code on your slip"}
          placeholder={mode === "find" ? "TYPE THE CODE" : "YOUR SLIP'S CODE"}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        {mode === "hide" && (
          <input
            className="input"
            aria-label="where you hid it"
            placeholder="where did you put it? (only the machine sees this)"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
        )}
        <button className="btn" disabled={busy || inFlight || code.trim().length < 3} onClick={go}>
          {mode === "find" ? "I found this" : "It is hidden"}
        </button>
        {note && <p className="text-sm" style={{ color: note.startsWith("✓") ? "var(--gold)" : "var(--danger)" }}>{note}</p>}
      </div>
    </div>
  );
}
