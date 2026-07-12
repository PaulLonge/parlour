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
supabase/migrations/    0001_init.sql + 0002_rogue.sql — schema, RLS, column grants (BOTH required)
content/                golden-story.json (murder fallback), rogue-reference-story.json,
                        pub-story.json, pub-games.json, quiz-bank.json
scripts/                simulate.ts (murder), simulate-rogue.ts (rogue), land-story.ts
```

## Setup (~15 minutes)

1. **Supabase**: create a free project at supabase.com → SQL Editor → paste & run
   `supabase/migrations/0001_init.sql`, **then** `0002_rogue.sql` — both, in order.
   The default mode at `/new` (rogue) does not work without 0002.
   (Or `npx supabase link --project-ref XXX && npx supabase db push`.)
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

### Optional: server-side heartbeat (belt & braces)

The TV page ticks the director while open. For a backup that survives the TV tab
dying, run in the Supabase SQL editor (replace URL + secret):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('parlour-heartbeat', '*/3 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/director/tick',
    headers := '{"content-type":"application/json","x-tick-secret":"YOUR_SECRET"}'::jsonb,
    body := '{"code":"YOURCODE","trigger":"heartbeat"}'::jsonb
  );
$$);
-- when the party's over:  select cron.unschedule('parlour-heartbeat');
```

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
