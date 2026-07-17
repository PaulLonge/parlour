# PARLOUR

A live social-deduction party game engine. Guests play on their phones; an AI
director proposes every move, a deterministic referee disposes. Two game modes:

- **Classic murder** — the AI writes an original murder-mystery for your real
  guest list and runs the night blind to everyone, host included: secret
  characters, whispered challenges, emergent killers, round-table banishments,
  respawns, a reveal ceremony. Traitors backbone, murder-mystery skin,
  Blood-on-the-Clocktower soul.
- **The Long Con (rogue — the default at `/new`)** — the murder mystery you were
  promised never existed. A rogue AI hijacks the night mid-party, "drains"
  every purse, and starts hiring: bribes, missions, paper codes, notes and
  wiretaps, forgeries, petitions, wagers with escrow and side bets, accusations
  that burn, and one final unmasking with receipts.

Built for Paul's 30th, November 2026 (plus a lighter pub "field trial" preset).

**The paper trail** (read in this order when picking the project up):
- [`docs/OVERVIEW.md`](docs/OVERVIEW.md) — **start here**: the intrigue stack, how the app works, tech stack, current status (living doc, co-edited by Paul)
- [`SPEC.md`](SPEC.md) — how it works: the ontology (object types, actions, visibility, phase machine, the three seams)
- [`DECISIONS.md`](DECISIONS.md) — why it's this way: every design + build call, and the not-built-yet queue
- [`docs/modes.md`](docs/modes.md) — the mode library: heist, infection, and friends, specced against the three seams
- [`docs/story-seeds.md`](docs/story-seeds.md) — themes & twist repertoire for different groups and occasions
- [`docs/host-runbook.md`](docs/host-runbook.md) — the practical party guide: timeline, printing, comms, troubleshooting
- **In-app**: `/preview` (all five visual themes, zero-config) · `/bible` (any story JSON as a readable story bible + live validation) · `/sandbox/CODE` (possess any player from one device, host-only)

## How a night works

This section narrates the **classic murder** night; the rogue night's shape
(hijack → live play → accusations → the unmasking) is in
[`docs/OVERVIEW.md`](docs/OVERVIEW.md), which is authoritative for both.

1. **Create** the evening at `/new` (you're the host — and a blind player).
2. Guests open the link/QR, **tap their name** (or add one) — no accounts, no installs. If a phone dies, tap your name on any other device.
3. Pre-party (or at kickoff), the host taps **“Write & seal the story”**: the AI writes characters for every registered guest from their intake (job, how they know you…), a twist, challenges — validates it structurally — and seals it. Nobody sees it. If generation fails, the built-in reference story ("The Ashgrove Reunion") loads silently.
4. Put `/tv/CODE` on the television and tap *Light the candles* (this also keeps the director's heartbeat ticking).
5. Host taps **“Begin the evening”**. Arrivals are story events — latecomers get written in with an entrance beat. The director does the rest: secrets, challenges, dark offers, bodies, votes, the truth.
6. Break-glass (host phones): pausing is always *public* — the seal is never broken in secret. Panic (any guest): long-press the ◦ — privately eases them out of the intrigue.

## Stack

Next.js (App Router) + Supabase (Postgres, anonymous auth, RLS, realtime) + Vercel + Anthropic via AI SDK. Secrets are **architecturally** unreachable from phones (RLS + column grants + server-only tables), not merely hidden.

```
app/                    7 pages: / (join), /new, /g/[code] (player), /tv/[code] (house
                        channel), /bible, /preview, /sandbox/[code]
app/api/                all writes — 22 routes: join, arrive, intake, vote, panic,
                        breakglass, director/tick, story/{generate,samples}, game/create,
                        challenge/{complete,respond}, offer/accept, audience, petition,
                        volunteer, note, compose, code/{hide,find}, wager, flag, host/pulse
lib/engine/             the deterministic referee + rogue engine: phase legality, kill
                        lock, votes, economy, wagers, notes/wiretaps, glyphs, stats
lib/director/           the AI director loop + story generation (LLM, zod-validated)
lib/schemas/            the constraint language: Story, RogueStory, DirectorTool, GameConfig
supabase/migrations/    0001_init.sql through 0008_resolve.sql — schema, RLS, column
                        grants, and every economy/pressure-tool addition since (run
                        ALL, in order)
content/                golden-story.json (murder fallback), rogue-reference-story.json,
                        pub-story.json, pub-games.json, quiz-bank.json
scripts/                simulate.ts (murder), simulate-rogue.ts (rogue), land-story.ts
```

## Setup (~15 minutes)

1. **Supabase**: create a free project at supabase.com → SQL Editor → paste & run
   every file in `supabase/migrations/`, in order (`0001_init.sql` through
   `0008_resolve.sql`). The default mode at `/new` (rogue) does not work without
   0002 onward. (Or `npx supabase link --project-ref XXX && npx supabase db push`.)
   **Then, Authentication → Providers** (`/dashboard/project/_/auth/providers`):
   turn ON "Allow anonymous sign-ins" and turn OFF "Confirm email". Every player's
   identity (`lib/engine/auth.ts`) runs on anonymous-auth sessions, not real
   accounts — without this toggle, `/new` and `/api/join` both fail with
   "Anonymous sign-ins are disabled" and nothing else in the app will work.
   This is a project-level Auth setting, not something a migration can set —
   there's no CLI/API shortcut here, it's dashboard-only.
   ⚠️ **Anonymous sign-ins are rate-limited to 30/hour per IP** (Authentication →
   Rate Limits). Fine for a normal dev loop, but everyone at the actual party
   shares one home wifi's public IP — with rejoins, phone refreshes, and the
   induction dry run all counting against the same 30, this is realistic to hit
   on the night. Raise it in the dashboard before September's playtest, not
   during it.
2. **Env**: `copy .env.example .env.local` and fill in the Supabase URL, anon key,
   service-role key (Project Settings → API) and your `ANTHROPIC_API_KEY`.
3. **Run**: `npm run dev` → http://localhost:3000 → create an evening, open two more
   browser tabs (or your phone on the same wifi) and join with different names.
4. **Verify the engine**: `npm run simulate` (murder: arming → kill lock → vote →
   banishment → respawn → reveal) **and** `npm run simulate:rogue` (hijack →
   bribes → missions → codes → notes → accusation → unmasking). Both run full
   scripted games against your database, no LLM needed, and clean up after themselves.
5. **Deploy**: push to GitHub → import in Vercel → set the same env vars →
   your party URL is live. Print the QR.

### Optional: server-side heartbeat (belt & braces, D71: TV never required)

The TV page ticks the director while open (`app/tv/[code]/page.tsx`), but the
game must not stall if nobody has it open. `supabase/migrations/0010_heartbeat.sql`
adds a Supabase-native backup: pg_cron + pg_net call `/api/director/cron` once a
minute, and that route ticks **every** active game itself — no per-game code to
configure, unlike the old single-game cron snippet this replaces.

1. Apply `0010_heartbeat.sql` (same SQL-editor-or-`db push` path as the other
   migrations in `supabase/migrations/`).
2. Insert the one config row it reads its target from — **do this via the SQL
   editor or Supabase MCP, never commit it to a migration**:
   ```sql
   insert into public.heartbeat_config (id, url, secret)
   values (true, 'https://YOUR-APP.vercel.app', 'YOUR_DIRECTOR_TICK_SECRET')
   on conflict (id) do update set url = excluded.url, secret = excluded.secret;
   ```
   `secret` must equal the deployed app's `DIRECTOR_TICK_SECRET`. Until this row
   exists the cron job is a harmless no-op (it checks and returns early).

The TV stays up as a bonus ticker, not a conflict: `tickDirector()`
(`lib/director/director.ts`) coalesces per game — any tick within ~15s of the
last `director_log` row for that game is skipped before it reaches the LLM, so
a cron tick landing seconds apart from the TV's own heartbeat for the same
game normally costs one extra read, not a second model call. Honest gap: that
check-then-insert isn't wrapped in an advisory lock (the code says so — "gap
#3 (interim)"), so two ticks arriving within milliseconds of each other could
both pass the check before either logs, and both call the LLM. Harmless
(the referee still validates both proposals), just not free — a real lock is
still on the backlog. The tutorial/induction path doesn't have this gap: it's
guarded by a DB unique index instead (`0009_tutorial_lock.sql`).

Verify locally before trusting it at the party: start a game past lobby,
`curl -X POST http://localhost:3000/api/director/cron -H "x-tick-secret: YOUR_SECRET"`,
and confirm a new `director_log` row appears for it (or `{"skipped":"..."}` in
the response if it was coalesced/paused/ended) — then check the live game state
moved. Calling it with no games running, or with the wrong secret (expect 401),
should also behave.

### Vetting generation quality (without spoiling your party)

```
curl -X POST https://YOUR-APP/api/story/samples -H "content-type: application/json" -d "{\"theme\":\"a 1970s ski lodge\"}"
```

## Costs (order of magnitude)

Supabase free tier and Vercel hobby cover a 30-phone party. AI: story
generation ~$1–3; the director over a 5-hour night ~$5–20 depending on model
tiering (`.env`). Well under the £/$100-per-party budget.

## Playtest checklist (September)

- [ ] 6–8 real humans, phones, one TV
- [ ] Does the arming feel dangerous? Do kill methods work socially?
- [ ] Round length: is 25 min right? (config)
- [ ] Do people check phones at the right moments (announcer cadence)?
- [ ] Vet 2–3 `/api/story/samples` batches beforehand
- [ ] Try: a phone death mid-game (rejoin by name), a latecomer (entrance beat), a panic press
