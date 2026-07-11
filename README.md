# PARLOUR

A live social-deduction party game engine. Guests play on their phones; an AI
director — sealed from everyone, **including the host** — writes an original
murder-mystery story for your real guest list and runs the night: secret
characters, whispered challenges, emergent killers, round-table banishments,
respawns, and a reveal ceremony. Traitors backbone, murder-mystery skin,
Blood-on-the-Clocktower soul.

Built for Paul's 30th, November 2026.

**The paper trail** (read in this order when picking the project up):
- [`SPEC.md`](SPEC.md) — how it works: the ontology (object types, actions, visibility, phase machine, the three seams)
- [`DECISIONS.md`](DECISIONS.md) — why it's this way: every design + build call, and the not-built-yet queue
- [`docs/modes.md`](docs/modes.md) — the mode library: heist, infection, and friends, specced against the three seams
- [`docs/story-seeds.md`](docs/story-seeds.md) — themes & twist repertoire for different groups and occasions
- [`docs/host-runbook.md`](docs/host-runbook.md) — the practical party guide: timeline, printing, comms, troubleshooting
- **In-app**: `/preview` (the three visual themes, zero-config) · `/bible` (any story JSON as a readable story bible + live validation)

## How a night works

1. **Create** the evening at `/new` (you're the host — and a blind player).
2. Guests open the link/QR, **tap their name** (or add one) — no accounts, no installs. If a phone dies, tap your name on any other device.
3. Pre-party (or at kickoff), the host taps **“Write & seal the story”**: the AI writes characters for every registered guest from their intake (job, how they know you…), a twist, challenges — validates it structurally — and seals it. Nobody sees it. If generation fails, the built-in reference story ("The Ashgrove Reunion") loads silently.
4. Put `/tv/CODE` on the television and tap *Light the candles* (this also keeps the director's heartbeat ticking).
5. Host taps **“Begin the evening”**. Arrivals are story events — latecomers get written in with an entrance beat. The director does the rest: secrets, challenges, dark offers, bodies, votes, the truth.
6. Break-glass (host phones): pausing is always *public* — the seal is never broken in secret. Panic (any guest): long-press the ◦ — privately eases them out of the intrigue.

## Stack

Next.js (App Router) + Supabase (Postgres, anonymous auth, RLS, realtime) + Vercel + Anthropic via AI SDK. Secrets are **architecturally** unreachable from phones (RLS + column grants + server-only tables), not merely hidden.

```
app/                    pages: / (join), /new, /g/[code] (player), /tv/[code] (house channel)
app/api/                all writes: join, arrive, challenge/complete, vote, panic,
                        breakglass, director/tick, story/generate, story/samples, game/create
lib/engine/             referee: phase legality, kill lock, votes, respawns (deterministic)
lib/director/           the AI director loop + story generation (LLM, zod-validated)
lib/schemas/            the constraint language: Story, DirectorTool, GameConfig
supabase/migrations/    schema + RLS
content/golden-story.json  the spoiled-OK fallback story & few-shot exemplar
scripts/simulate.ts     scripted-bot full-game test (no LLM needed)
```

## Setup (~15 minutes)

1. **Supabase**: create a free project at supabase.com → SQL Editor → paste & run
   `supabase/migrations/0001_init.sql`.
   (Or `npx supabase link --project-ref XXX && npx supabase db push`.)
2. **Env**: `copy .env.example .env.local` and fill in the Supabase URL, anon key,
   service-role key (Project Settings → API) and your `ANTHROPIC_API_KEY`.
3. **Run**: `npm run dev` → http://localhost:3000 → create an evening, open two more
   browser tabs (or your phone on the same wifi) and join with different names.
4. **Verify the engine**: `npm run simulate` — runs a full scripted game
   (arming → kill lock → vote → banishment → respawn → reveal) and deletes itself.
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
