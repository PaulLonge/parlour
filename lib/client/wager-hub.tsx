"use client";

// D45: the wager hub — throw down, accept, report, side-bet. The phone is the
// bookie; the games are played in the flesh (or pass-and-play for phone duels).

import { useMemo, useState } from "react";
import type { useGame, Wager } from "./useGame";
import { MiniGame, PHONE_GAMES } from "./minigames";
import pubGames from "@/content/pub-games.json";

const DUEL_PRESETS = [
  ...pubGames.games.filter((g) => g.type === "duel" || g.type === "phone-duel").map((g) => g.name),
  "Custom…",
];

export function WagerHub({ g }: { g: ReturnType<typeof useGame> }) {
  const me = g.me!;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState<Wager | null>(null);

  const nameOf = (id: string) => g.roster.find((p) => p.id === id)?.name ?? "?";
  const incoming = g.wagers.filter((w) => w.status === "proposed" && w.opponent_id === me.id);
  const outgoing = g.wagers.filter((w) => w.status === "proposed" && w.challenger_id === me.id);
  const active = g.wagers.filter((w) => w.status === "accepted");
  const disputed = g.wagers.filter((w) => w.status === "disputed");
  const openBooks = g.books.filter((b) => b.challenger !== me.name && b.opponent !== me.name);

  const cfg = g.game!.config as { wagerCapPct?: number; wagerCapFloor?: number };
  const cap = Math.max(Number(cfg.wagerCapFloor ?? 10), Math.floor(me.balance * Number(cfg.wagerCapPct ?? 0.3)));

  return (
    <div className="flex flex-col gap-3">
      {playing && (
        <MiniGame
          gameName={playing.game_desc}
          playerA={nameOf(playing.challenger_id)}
          playerB={nameOf(playing.opponent_id)}
          onClose={() => setPlaying(null)}
        />
      )}

      <ProposeCard g={g} cap={cap} busy={busy} setBusy={setBusy} setNote={setNote} />

      {incoming.map((w) => (
        <div key={w.id} className="panel pulse-danger p-4" style={{ borderColor: "var(--gold)" }}>
          <p className="kicker">🎲 you've been challenged</p>
          <p className="mt-1">
            <b>{nameOf(w.challenger_id)}</b> — {w.game_desc} — for <b>◎{w.amount}</b>
          </p>
          <p className="mt-1 text-xs italic" style={{ color: "var(--ink-dim)" }}>
            Accepting escrows both stakes with the machine. No welching possible.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn flex-1"
              disabled={busy || me.balance < w.amount}
              onClick={async () => {
                setBusy(true);
                const r = await g.actions.respondWager(w.id, true);
                setNote(r.ok ? "" : (r.result ?? r.error ?? "no"));
                setBusy(false);
              }}
            >
              {me.balance < w.amount ? "can't cover it" : "Accept"}
            </button>
            <button
              className="btn btn-ghost flex-1"
              disabled={busy}
              onClick={() => g.actions.respondWager(w.id, false)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {active.map((w) => {
        const iSaid = w.challenger_id === me.id ? w.challenger_says : w.opponent_says;
        const isPhoneGame = PHONE_GAMES.some((p) => w.game_desc.toLowerCase().includes(p.toLowerCase()));
        return (
          <div key={w.id} className="panel p-4">
            <p className="kicker">⚔ in play — {w.game_desc} for ◎{w.amount} each</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
              {nameOf(w.challenger_id)} vs {nameOf(w.opponent_id)} — play it out, then BOTH report the winner.
            </p>
            {isPhoneGame && (
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPlaying(w)}>
                ▶ Play here (pass this phone)
              </button>
            )}
            {iSaid ? (
              <p className="mt-2 text-sm italic" style={{ color: "var(--gold)" }}>
                Your account is in. Awaiting the other side.
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                {[w.challenger_id, w.opponent_id].map((pid) => (
                  <button
                    key={pid}
                    className="btn btn-ghost flex-1"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const r = await g.actions.reportWager(w.id, nameOf(pid));
                      setNote(r.ok ? "" : (r.result ?? "no"));
                      setBusy(false);
                    }}
                  >
                    {nameOf(pid)} won
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {disputed.map((w) => (
        <div key={w.id} className="panel p-4" style={{ borderColor: "var(--danger)" }}>
          <p className="kicker kicker-danger">⚖ disputed — {w.game_desc}</p>
          <p className="mt-1 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            Two testimonies, one lie. The machine will rule. It enjoys this part.
          </p>
        </div>
      ))}

      {outgoing.length > 0 && (
        <p className="text-xs italic" style={{ color: "var(--ink-dim)" }}>
          Thrown down: {outgoing.map((w) => `${nameOf(w.opponent_id)} (◎${w.amount})`).join(", ")} — awaiting nerve.
        </p>
      )}

      {openBooks.length > 0 && <SideBetCard g={g} books={openBooks} cap={cap} busy={busy} setBusy={setBusy} setNote={setNote} />}

      {note && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {note.replaceAll("_", " ")}
        </p>
      )}
    </div>
  );
}

function ProposeCard({
  g,
  cap,
  busy,
  setBusy,
  setNote,
}: {
  g: ReturnType<typeof useGame>;
  cap: number;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [amount, setAmount] = useState(20);
  const [game, setGame] = useState(DUEL_PRESETS[0]);
  const [custom, setCustom] = useState("");
  const others = useMemo(
    () => g.roster.filter((p) => p.status === "alive" && p.id !== g.me!.id),
    [g.roster, g.me]
  );

  if (!open)
    return (
      <button className="btn w-full" onClick={() => setOpen(true)}>
        🎲 Challenge someone · up to ◎{cap}
      </button>
    );

  const gameDesc = game === "Custom…" ? custom : game;
  return (
    <div className="panel panel-hero p-4">
      <p className="kicker">throw down</p>
      <select className="input mt-2" aria-label="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)}>
        <option value="">Against whom?</option>
        {others.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <select className="input mt-2" aria-label="the game" value={game} onChange={(e) => setGame(e.target.value)}>
        {DUEL_PRESETS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      {game === "Custom…" && (
        <input className="input mt-2" aria-label="custom game" placeholder="name your game (write-ins welcome)" value={custom} onChange={(e) => setCustom(e.target.value)} />
      )}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          className="input"
          aria-label="stake"
          min={1}
          max={cap}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(cap, Number(e.target.value) || 0)))}
        />
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--ink-dim)" }}>
          cap ◎{cap}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn flex-1"
          disabled={busy || !opponent || !gameDesc.trim() || amount < 1}
          onClick={async () => {
            setBusy(true);
            const r = await g.actions.proposeWager(opponent, amount, gameDesc.trim());
            setNote(r.ok ? "" : (r.result ?? r.error ?? "no"));
            if (r.ok) setOpen(false);
            setBusy(false);
          }}
        >
          Send it
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>
          Never mind
        </button>
      </div>
    </div>
  );
}

function SideBetCard({
  g,
  books,
  cap,
  busy,
  setBusy,
  setNote,
}: {
  g: ReturnType<typeof useGame>;
  books: ReturnType<typeof useGame>["books"];
  cap: number;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  return (
    <div className="panel p-4">
      <p className="kicker">📖 the book is open — back a side, 1:1 vs the house</p>
      <div className="mt-2 flex flex-col gap-3">
        {books.map((b) => (
          <div key={b.id} className="text-sm">
            <p>
              {b.challenger} vs {b.opponent} — {b.game_desc} (◎{b.amount} each)
            </p>
            <div className="mt-1 flex items-center gap-2">
              {[b.challenger, b.opponent].map((name) => (
                <button
                  key={name}
                  className="btn btn-ghost flex-1 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await g.actions.sideBet(b.id, name, amounts[b.id] || 10);
                    setNote(r.ok ? "" : (r.result ?? "no"));
                    setBusy(false);
                  }}
                >
                  back {name}
                </button>
              ))}
              <input
                type="number"
                className="input !w-20"
                aria-label="side bet amount"
                min={1}
                max={cap}
                value={amounts[b.id] || 10}
                onChange={(e) => setAmounts({ ...amounts, [b.id]: Math.max(1, Math.min(cap, Number(e.target.value) || 0)) })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
