"use client";

// backlog #1 — THE INVITATION: a shareable, guest-safe pre-party page. Guests
// RSVP and answer the intake days before the night, so the story generator
// has material and the door is fast on the evening itself.
//
// Guest-safe by construction: reads ONLY games_public (D8/D13/D14 apply — no
// sealed_story, no scenario blurbs, no mode hints). RSVP reuses the existing
// /api/join pseudo-account flow (same seats as the door — tapping this link
// twice with the same name is the same "takeover" story as JoinScreen's,
// handled minimally); intake reuses /api/intake exactly as the in-game
// IntakeCard does (app/g/[code]/page.tsx), once the RSVP has a session.
// Deliberately does not link /guide, /briefing, /bible, or any host surface —
// this page is handed to guests as-is, well before the night.

import { use, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { errorText } from "@/lib/client/ui";

type InvitePublic = {
  id: string;
  code: string;
  title: string;
  config: Record<string, unknown> | null;
  story_public: { meta?: { title?: string; tagline?: string } } | null;
};

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [game, setGame] = useState<InvitePublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      const supa = supabaseBrowser();
      // games_public ONLY — never games, never sealed_story (D8/D13/D14).
      const { data, error } = await supa
        .from("games_public")
        .select("id, code, title, config, story_public")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError("The house is unreachable — check your connection.");
        setLoading(false);
        return;
      }
      setGame((data as InvitePublic | null) ?? null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading)
    return (
      <Center>
        <p className="candle italic" style={{ color: "var(--ink-dim)" }}>
          Lighting the candles…
        </p>
      </Center>
    );
  if (loadError)
    return (
      <Center>
        <p>{loadError}</p>
        <button className="btn mt-4" onClick={() => location.reload()}>
          Try again
        </button>
      </Center>
    );
  if (!game)
    return (
      <Center>
        <p>No such evening. Check your invitation link.</p>
      </Center>
    );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <InvitationHeader game={game} />
      <RsvpFlow code={game.code} />
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </main>
  );
}

// ---------------------------------------------------------------------------
// The card itself — an invitation, not a login screen. Reuses app/page.tsx's
// vocabulary (kicker, deco-rule, candle, font-display, panel) rather than
// inventing new furniture.
// ---------------------------------------------------------------------------
function InvitationHeader({ game }: { game: InvitePublic }) {
  const meta = game.story_public?.meta;
  const cfg = (game.config ?? {}) as {
    targetEndAt?: string;
    invitation?: { costumeBrief?: string; hostLine?: string };
  };
  const dateLine = formatDateLine(cfg.targetEndAt);

  return (
    <header className="text-center">
      <p className="deco-rule kicker justify-center">you are invited</p>
      <h1 className="candle font-display mt-3 text-4xl leading-tight" style={{ color: "var(--gold)" }}>
        {meta?.title ?? game.title}
      </h1>
      {meta?.tagline && (
        <p className="mt-2 italic" style={{ color: "var(--ink-dim)" }}>
          {meta.tagline}
        </p>
      )}
      {dateLine && (
        <p className="mt-3 text-sm" style={{ color: "var(--ink)" }}>
          {dateLine}
        </p>
      )}
      {cfg.invitation?.hostLine && (
        <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          &ldquo;{cfg.invitation.hostLine}&rdquo;
        </p>
      )}
      {cfg.invitation?.costumeBrief && (
        <div className="panel mt-4 p-4 text-left">
          <p className="kicker">costume brief</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink)" }}>
            {cfg.invitation.costumeBrief}
          </p>
        </div>
      )}
    </header>
  );
}

// targetEndAt is stored as a full ISO datetime (D-new: "aim to finish
// around") — the invitation only wants the date it falls on.
function formatDateLine(targetEndAt?: string): string | null {
  if (!targetEndAt) return null;
  const d = new Date(targetEndAt);
  if (Number.isNaN(d.getTime())) return null;
  const formatted = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `the evening of ${formatted}`;
}

// ---------------------------------------------------------------------------
// RSVP → intake → done. Three small steps, one flow, no dead ends.
// ---------------------------------------------------------------------------
type Step = "rsvp" | "intake" | "done";

function RsvpFlow({ code }: { code: string }) {
  const [step, setStep] = useState<Step>("rsvp");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seatCode, setSeatCode] = useState<string | null>(null);

  async function rsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name: name.trim(), password: password.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 && json.needsPassword) {
        // minimal reuse of JoinScreen's 401 handling (app/g/[code]/page.tsx):
        // reveal the word field, never cache a rejected guess
        setNeedsPassword(true);
        setError(password ? "That's not tonight's word." : "Tonight's word has changed — ask your host.");
        return;
      }
      if (res.status === 409 && json.needsTakeover) {
        setError("That name has already RSVP'd from another device — your host can sort seats on the night.");
        return;
      }
      if (!res.ok || !json.playerId) {
        setError(errorText(json.error, "the house didn't hear that — try again"));
        return;
      }
      setSeatCode(typeof json.seatCode === "string" ? json.seatCode : null);
      setStep("intake");
    } catch {
      setError("The house lost you for a moment — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "intake") return <IntakeStep code={code} onDone={() => setStep("done")} />;
  if (step === "done") return <DoneCard seatCode={seatCode} />;

  return (
    <form className="panel panel-hero flex flex-col gap-3 p-6" onSubmit={rsvp}>
      <p className="kicker">rsvp</p>
      <input
        className="input"
        aria-label="your name"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      {needsPassword && (
        <input
          className="input text-center tracking-[0.15em] lowercase"
          aria-label="tonight's word"
          placeholder="ask your host"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      <button className="btn" disabled={busy || !name.trim() || (needsPassword && !password.trim())}>
        {busy ? "…" : "I'll be there"}
      </button>
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </form>
  );
}

// Same three questions, same copy, as IntakeCard in app/g/[code]/page.tsx —
// posted via /api/intake, which fits here: the RSVP above already minted an
// anonymous session for this browser, exactly like the in-game card assumes.
function IntakeStep({ code, onDone }: { code: string; onDone: () => void }) {
  const [occupation, setOccupation] = useState("");
  const [relation, setRelation] = useState("");
  const [arrival, setArrival] = useState("");
  const [busy, setBusy] = useState(false);
  const [intakeErr, setIntakeErr] = useState("");

  async function submit() {
    setBusy(true);
    setIntakeErr("");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          intake: { occupation: occupation.trim(), relationToHost: relation.trim(), expectedArrival: arrival.trim() },
        }),
      });
      // only advance on real success — a 500 must not eat the data (mirrors
      // IntakeCard's review UX#5 fix)
      if (res.ok) onDone();
      else setIntakeErr("The house lost that — try again.");
    } catch {
      setIntakeErr("The house lost that — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel panel-hero flex flex-col gap-3 p-6">
      <p className="kicker">the invitation asks (optional — but it makes the story yours)</p>
      <input
        className="input"
        aria-label="what do you do?"
        placeholder="What do you do? (job, hobby, claim to fame)"
        value={occupation}
        onChange={(e) => setOccupation(e.target.value)}
        autoFocus
      />
      <input
        className="input"
        aria-label="how do you know the host?"
        placeholder="How do you know the host?"
        value={relation}
        onChange={(e) => setRelation(e.target.value)}
      />
      <input
        className="input"
        aria-label="when will you arrive?"
        placeholder="When will you arrive? (e.g. 7:30ish)"
        value={arrival}
        onChange={(e) => setArrival(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn flex-1"
          disabled={busy || (!occupation.trim() && !relation.trim() && !arrival.trim())}
          onClick={submit}
        >
          That's me
        </button>
        <button className="btn btn-ghost" onClick={onDone} disabled={busy}>
          Skip
        </button>
      </div>
      {intakeErr && (
        <p className="text-sm" role="status" style={{ color: "var(--danger)" }}>
          {intakeErr}
        </p>
      )}
    </div>
  );
}

function DoneCard({ seatCode }: { seatCode: string | null }) {
  return (
    <div className="panel panel-hero flex flex-col items-center gap-2 p-6 text-center">
      <p className="deco-rule kicker justify-center">rsvp received</p>
      <p className="font-display mt-2 text-2xl" style={{ color: "var(--gold)" }}>
        You are expected.
      </p>
      {seatCode && (
        <div className="mt-3">
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
            your seat code
          </p>
          <p className="text-2xl" style={{ color: "var(--gold)", letterSpacing: "0.3em" }}>
            {seatCode}
          </p>
          <p className="mt-2 max-w-xs text-xs italic" style={{ color: "var(--ink-dim)" }}>
            save this — you'll only need it if you switch phones on the night.
          </p>
        </div>
      )}
    </div>
  );
}
