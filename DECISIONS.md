# DECISIONS.md — PARLOUR

The design-conversation log ends where this begins (per the original brief §12).
Design decisions D1–D17 were made with Paul in the framework session (July 2026);
B-numbers are build-time engineering calls made inside the codebase.

## Design decisions (Paul + Claude, framework session)

- **D1/D-spoilers** — the golden fallback story (`content/golden-story.json`, "The Ashgrove Reunion") is deliberately **spoiled-OK**: Paul may read it; it doubles as playtest content and the simulate fixture. Generated stories are sealed server-side and never enter the repo.
- **D2 infra** — live cloud Supabase + Vercel from day one. No Docker on the build machine, so no local stack.
- **D7 spec status** — the original PARLOUR spec is notes, not gospel. Features justify themselves against 7 real requirements (social deduction, Paul's 30th ~14–15 Nov 2026, late arrivals woven in, host-blind surprises, unknown headcount 8–30, scaffold now, clone-if-exists).
- **D8 join flow** — **browser-first**. No PWA install gate, no push dependency, no magic links. QR/code → tap your name → in. Rhythm of the night comes from the house channel + host-as-announcer, not pocket buzzes (iOS can't vibrate from web anyway).
- **D9/D15 emergent murder, hybrid arming** — no pre-cast killer. The director *offers* kill-challenges mid-game based on the actual night; **completing one makes you a traitor**; expiry is a silent opt-out, silently re-offered elsewhere. Traitor count scales ~1 per 5–6 alive.
- **D12 format** — ONE game, built well: **Traitors backbone** (rounds: social → murder → body found → assembly → vote → banishment-with-role-reveal) wearing a **murder-mystery skin** (generated characters/secrets/twist), with **BotC's** dead-stay-in via respawn as spare characters. No variants in v1.
- **D13 intake** — slim: name, age, occupation, relation to host, relations to other guests, expected arrival. No off-limits question; instead a hard guardrail in the generation prompt (fictional sins only, never echo real relationships/sore spots).
- **D14 pseudo-accounts** — homepage lists names; tap yours or type a new one. Anonymous Supabase auth underneath; new-device rejoin = explicit takeover. No security theater; RLS still scopes all secrets because it's free.
- **D16 generation QA** — `/api/story/samples` generates throwaway-theme challenges so Paul can vet generation quality without spoiling his own party.
- **Clone-vs-scratch (researched)** — nothing clone-able exists (verified July 2026: murder-mystery repos are wrong-language/single-player/AI-vs-AI sims). Base = fresh Next.js + Supabase. Zod adopted for LLM output validation.

## Build decisions (Claude, build session)

- **B1 — plain transition map, not XState.** Research suggested XState; in a stateless serverless referee, a `LEGAL: Record<Phase, Phase[]>` map (`lib/engine/referee.ts`) is simpler to rehydrate from the DB, easier for Paul to read, and trivially testable. xstate was uninstalled.
- **B2 — realtime = postgres_changes + refetch, not broadcast channels.** Any relevant table change triggers a scoped refetch (`lib/client/useGame.ts`). RLS (WALRUS) guarantees a phone can only ever receive its own rows, so scoped delivery is *architectural*, with zero channel-auth code. Latency ~50–200ms is fine for beats. If fan-out ever feels slow, migrate to RLS-authorized broadcast channels (researched pattern) — isolated to `useGame`.
- **B3 — clients are read-only.** Every write goes through an API route → referee. RLS grants only scoped SELECTs. The Anthropic key and all story content live server-side (I9).
- **B4 — sealing mechanics.** `games.sealed_story` is hidden by **column-level grants** (revoke + re-grant of safe columns); `murders`, `beats`, `director_log` have **no client policies at all**. The killer's identity is unreachable, not obfuscated.
- **B5 — heartbeat = the TV page.** The house-channel display POSTs `/api/director/tick` every `config.heartbeatSeconds`; the server debounces untrusted ticks to ≥1/min. Optional `pg_cron` + `DIRECTOR_TICK_SECRET` for belt-and-braces (SQL in README). No Vercel-Pro cron dependency.
- **B6 — the kill lock is a DB unique index** (`murders(game_id, round_no)`): simultaneous kills race in Postgres, one wins, the referee converts the loser into a `near_miss` event the director can dramatize.
- **B7 — generation failure is survivable by construction**: 2 attempts against the Story schema + structural validator (`validateStoryStructure`: every player cast exactly once, no dangling connections, ≥2 plot threads each), then automatic fallback to the golden story. The party never depends on generation succeeding (I5a).
- **B8 — model tiering by trigger**: heartbeats use `FAST_MODEL` (Haiku-class), event reactions use `DIRECTOR_MODEL`, story generation uses `STORY_MODEL` (strongest). All via env, all through AI SDK `generateObject` + zod.
- **B9 — audio cues deferred.** The iOS audio-unlock gate ("Light the candles" tap on the TV; join tap on phones) is in place, but no sounds ship yet. Decoy-buzz design is *cadence* (everyone gets a message each beat), not vibration (impossible on iPhone).

## Not built yet (deliberate, ordered by likely value)

1. Pre-party intake/invitation drip flow (currently intake rides the join call; a nicer form + invite links wanted before September playtest)
2. TTS house voice (pre-rendered lines; OpenAI `gpt-4o-mini-tts` recommended by research)
3. Costume portraits batch job (Gemini image; ~$2–5 for 30)
4. Paper-pack export (I15 insurance; content is already all-JSON so this is a formatting task)
5. PWA install + web push as optional enhancement (never a gate)
6. Awards ceremony interactivity (awards exist in the story schema; director announces them at reveal)
7. Photo-judged tasks, Web-NFC-on-Android easter egg, diegetic theme evolution mid-game (skin tokens already flow from story → TV page)
