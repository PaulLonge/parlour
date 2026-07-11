"use client";

// ROGUE-mode presentational components: purse, meters, bribe/mission cards,
// code entry. Allegiance-neutral chrome (D22) — no red/blue screens; your side
// lives in content only.

import { useState } from "react";
import type { Challenge, Txn } from "./useGame";

export function MetersStrip({
  meters,
  currencySymbol = "Ƀ",
}: {
  meters: { plunder: number; compute: number; confidence: number };
  currencySymbol?: string;
}) {
  return (
    <div className="panel flex items-center gap-4 px-4 py-2 text-sm">
      <span title="the plunder meter — every coin accounted for">
        ☠ <b>{meters.plunder}</b>
        <span style={{ color: "var(--ink-dim)" }}> {currencySymbol} drained</span>
      </span>
      <span className="flex-1 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
        every coin accounted for
      </span>
      <span title="compute assembled">
        🏮 <b>{meters.compute}</b>
        <span style={{ color: "var(--ink-dim)" }}> compute</span>
      </span>
    </div>
  );
}

export function PurseChip({ balance, transactions, symbol = "Ƀ" }: { balance: number; transactions: Txn[]; symbol?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel px-3 py-1.5">
      <button className="flex w-full items-baseline justify-between gap-3" onClick={() => setOpen(!open)}>
        <span className="kicker">your purse</span>
        <span className="font-display text-lg" style={{ color: balance > 0 ? "var(--gold)" : "var(--danger)" }}>
          {symbol}{balance}
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: "var(--ink-dim)" }}>
          {transactions.length === 0 && <li>No movements. Yet.</li>}
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">
              <span className="truncate">{t.memo}</span>
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
      <p className="kicker" style={{ color: "var(--danger)" }}>
        a private opportunity — yours alone
      </p>
      <p className="mt-2 font-display text-2xl" style={{ color: "var(--gold)" }}>
        {symbol}{amount}
        <span className="ml-2 text-sm font-normal italic" style={{ color: "var(--ink-dim)" }}>
          restored to your purse, no questions
        </span>
      </p>
      <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.brief}</p>
      <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
        This offer expires like everything else. Nobody will ever know, either way.
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

      {verification === "submission" || verification === "cross" ? (
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

  async function go() {
    setNote("");
    const r = mode === "find" ? await onFind(code) : await onHide(code, hint);
    if (r.ok) {
      setNote(mode === "find" ? "✓ Noted. The machine saw that." : "✓ Hidden. Someone will come looking.");
      setCode("");
      setHint("");
    } else setNote(`✗ ${r.result?.replaceAll("_", " ") ?? "no"}`);
  }

  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between">
        <p className="kicker">the paper trail</p>
        <button className="text-xs underline" style={{ color: "var(--ink-dim)" }} onClick={() => setMode(mode === "find" ? "hide" : "find")}>
          {mode === "find" ? "hiding one instead?" : "found one instead?"}
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <input
          className="input text-center tracking-[0.3em] uppercase"
          placeholder={mode === "find" ? "TYPE WHAT YOU FOUND" : "CODE ON YOUR SLIP"}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        {mode === "hide" && (
          <input className="input" placeholder="where did you put it? (only the machine sees this)" value={hint} onChange={(e) => setHint(e.target.value)} />
        )}
        <button className="btn" disabled={busy || code.trim().length < 3} onClick={go}>
          {mode === "find" ? "I found this" : "It is hidden"}
        </button>
        {note && <p className="text-sm" style={{ color: note.startsWith("✓") ? "var(--gold)" : "var(--danger)" }}>{note}</p>}
      </div>
    </div>
  );
}
