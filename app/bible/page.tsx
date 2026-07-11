"use client";

// The story bible — a human-readable view of any Story JSON, with the same
// structural validation the generation pipeline runs. Zero-config (no DB).
// Loads the golden story by default; paste any generated Story to inspect it.
// This is the "visualise the JSONs" surface: content people edit prose, the
// engine keeps eating JSON.

import { useMemo, useState } from "react";
import { Story, validateStoryStructure, type Character } from "@/lib/schemas/story";
import goldenJson from "@/content/golden-story.json";

const anchor = (persona: string) => `p-${persona.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function Bible() {
  const [raw, setRaw] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [parseError, setParseError] = useState("");
  const [story, setStory] = useState<Story>(() => Story.parse(goldenJson));

  const problems = useMemo(() => {
    const names = story.characters.map((c) => c.forPlayer).filter(Boolean) as string[];
    return validateStoryStructure(story, names);
  }, [story]);

  // inbound thread count per persona (same math as the validator)
  const threads = useMemo(() => {
    const all = [...story.characters, ...story.spares];
    const map = new Map<string, number>();
    for (const c of all) {
      const inbound = all.filter((o) => o !== c && o.connections.some((x) => x.personaName === c.personaName)).length;
      map.set(c.personaName, c.connections.length + inbound);
    }
    return map;
  }, [story]);

  function loadPasted() {
    try {
      const parsed = Story.parse(JSON.parse(raw));
      setStory(parsed);
      setParseError("");
      setPasteOpen(false);
    } catch (e) {
      setParseError(e instanceof Error ? e.message.slice(0, 800) : String(e));
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 pb-24 md:p-8">
      <header className="text-center">
        <p className="deco-rule kicker justify-center">the story bible — what the engine will perform</p>
        <h1 className="candle font-display mt-3 text-5xl" style={{ color: "var(--gold)" }}>
          {story.meta.title}
        </h1>
        <p className="mt-2 italic" style={{ color: "var(--ink-dim)" }}>
          {story.meta.tagline}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          {story.meta.genre} · {story.meta.setting}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn btn-ghost" onClick={() => setPasteOpen(!pasteOpen)}>
            {pasteOpen ? "cancel" : "📋 paste a story JSON"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setStory(Story.parse(goldenJson));
              setParseError("");
            }}
          >
            ↺ golden story
          </button>
        </div>
        {pasteOpen && (
          <div className="panel mt-4 flex flex-col gap-2 p-4 text-left">
            <textarea
              className="input h-40 font-mono text-xs"
              placeholder='{"meta": {...}, "characters": [...], ...}'
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <button className="btn" onClick={loadPasted} disabled={!raw.trim()}>
              Render it
            </button>
          </div>
        )}
        {parseError && (
          <pre className="panel mt-3 overflow-x-auto p-3 text-left text-xs" style={{ color: "var(--danger)" }}>
            {parseError}
          </pre>
        )}
      </header>

      {/* validation verdict — same checks the generation pipeline runs */}
      <section className="panel panel-hero mt-8 p-5">
        <p className="kicker">structural validation (the generation gate)</p>
        {problems.length === 0 ? (
          <p className="mt-2" style={{ color: "var(--gold)" }}>
            ✓ Playable. Every character cast once, no dangling connections, everyone reachable by ≥2 plot threads.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm" style={{ color: "var(--danger)" }}>
            {problems.map((p, i) => (
              <li key={i}>✗ {p}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs" style={{ color: "var(--ink-dim)" }}>
          {story.characters.length} characters · {story.spares.length} spares · {story.killMethods.length} kill
          methods · {story.socialChallengePool.length} social challenges
        </p>
      </section>

      {/* the cast */}
      <SectionTitle>The cast</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {story.characters.map((c) => (
          <PersonaCard key={c.personaName} c={c} threads={threads.get(c.personaName) ?? 0} />
        ))}
      </div>

      <SectionTitle>The spares — door-joins &amp; respawns</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {story.spares.map((c) => (
          <PersonaCard key={c.personaName} c={c} threads={threads.get(c.personaName) ?? 0} spare />
        ))}
      </div>

      {/* mechanics content */}
      <SectionTitle>Kill methods</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {story.killMethods.map((k) => (
          <div key={k.name} className="panel p-4">
            <p className="font-display text-lg" style={{ color: "var(--danger)" }}>
              ⚔ {k.name}
            </p>
            <p className="mt-1 text-sm">{k.brief}</p>
            <p className="mt-2 text-xs italic" style={{ color: "var(--ink-dim)" }}>
              TV: “{k.discoveryText}”
            </p>
          </div>
        ))}
      </div>

      <SectionTitle>Social challenge pool</SectionTitle>
      <div className="panel p-5">
        {[1, 2, 3].map((d) => (
          <div key={d} className="mb-3">
            <p className="kicker">{"🕯".repeat(d)} difficulty {d}{d === 3 ? " — requires cunning" : d === 1 ? " — drunk-proof" : ""}</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {story.socialChallengePool
                .filter((c) => c.difficulty === d)
                .map((c, i) => (
                  <li key={i}>• {c.brief}</li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {/* the twist — spoiler-gated */}
      <SectionTitle>The twist</SectionTitle>
      <details className="panel panel-hero p-5">
        <summary className="cursor-pointer font-display text-lg" style={{ color: "var(--danger)" }}>
          🔒 Spoiler — only open this for a story that is NOT your party
        </summary>
        <p className="mt-3">{story.twist.summary}</p>
        <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Reveal line: “{story.twist.revealText}”
        </p>
      </details>

      <SectionTitle>Reveal ceremony &amp; awards</SectionTitle>
      <div className="panel p-5">
        <ol className="flex flex-col gap-2 text-sm">
          {story.revealScript.map((line, i) => (
            <li key={i} className="italic">
              {i + 1}. “{line}”
            </li>
          ))}
        </ol>
        <hr className="divider my-4" />
        <div className="flex flex-wrap gap-2">
          {story.awards.map((a) => (
            <span key={a.title} className="panel px-3 py-2 text-sm">
              🏆 <b>{a.title}</b> <span style={{ color: "var(--ink-dim)" }}>— {a.criteria}</span>
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="deco-rule font-display mt-10 mb-4 justify-center text-2xl" style={{ color: "var(--gold)" }}>
      {children}
    </h2>
  );
}

function PersonaCard({ c, threads, spare = false }: { c: Character; threads: number; spare?: boolean }) {
  return (
    <div id={anchor(c.personaName)} className={`panel p-5 ${spare ? "" : "panel-hero"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xl" style={{ color: "var(--gold)" }}>
          {c.personaName}
        </p>
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: threads < 2 ? "var(--danger)" : "var(--ink-dim)" }}
          title="plot threads touching this character (validator requires ≥2)"
        >
          {threads} thread{threads === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-sm italic" style={{ color: "var(--ink-dim)" }}>
        {c.archetype}
        {c.forPlayer ? ` · written for ${c.forPlayer}` : ""}
      </p>
      <p className="mt-2 text-sm">{c.background}</p>
      <p className="mt-2 text-sm">
        <span className="kicker">secret&ensp;</span>
        {c.secret}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.connections.map((x, i) => (
          <a
            key={i}
            href={`#${anchor(x.personaName)}`}
            className="rounded px-2 py-1 text-xs"
            style={{ border: "1px solid var(--border)", color: "var(--gold)" }}
            title={x.what}
          >
            → {x.personaName}
          </a>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs" style={{ color: "var(--ink-dim)" }}>
          entrance beat · mannerism · costume
        </summary>
        <div className="mt-2 flex flex-col gap-1" style={{ color: "var(--ink-dim)" }}>
          <p>📣 “{c.entrance.announcement}”</p>
          <p>🤫 {c.entrance.starterSecret}</p>
          <p>👉 {c.entrance.nudgeTask}</p>
          <p>🎭 {c.mannerism}</p>
          <p>🧥 {c.costumeHint}</p>
        </div>
      </details>
    </div>
  );
}
