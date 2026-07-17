# PARLOUR — Playtest Readiness (security pass)

> Static audit only — no code run, no live Supabase call, no push to main. Scope: the
> items CHECKLIST.md flagged (`players_public`/`wagers_public`/`games_public` SECURITY
> DEFINER views; `bounties`/`codes`/`scheduled_messages`/`wiretaps` RLS-enabled-no-policy)
> plus GAPS.md's money-loop coverage gap. Last updated: 2026-07-17.

## Security verdicts

| Item | Verdict | Evidence | Why |
|---|---|---|---|
| `players_public` view | SAFE | `supabase/migrations/0001_init.sql:164-167`, `:217` | `security_invoker = off` but the `select` list is explicit: `id, game_id, name, is_host, status, arrived_at, created_at`. No `role`, `character`, `balance`, `intake`, `seat_code`, `sight`, `powers`, `resolve`. Client only ever reads it via `supabaseBrowser()` (anon key) — `lib/client/useGame.ts:177` — and the `PublicPlayer` type it hydrates (`useGame.ts:7-13`) has no secret fields either, so there's no wildcard-select anywhere upstream of the type. |
| `wagers_public` view | SAFE | `supabase/migrations/0002_rogue.sql:145-156` | Explicit columns (`amount`, `game_desc`, `status`, `created_at`, challenger/opponent/winner **names**, not ids-with-secrets), filtered to `status in ('accepted','disputed','settled','voided')` and `game_id in (select my_game_ids())`. `proposed`/`declined` rows are excluded by the `where` — the "decline and nobody will ever know" promise (comment at `:141-144`) holds structurally, not just by convention. `my_game_ids()` calls `auth.uid()` (`0001_init.sql:183-186`), which reads the request's JWT claims, not the view owner's — so a security-definer view still scopes correctly per-caller. Read only via anon key at `useGame.ts:236`. |
| `games_public` view | SAFE | `supabase/migrations/0002_rogue.sql:228-233` | Explicit columns matching the same allowlist already enforced by column-level grant on the base `games` table (`0002_rogue.sql:13-16`, re-asserted `:94-98` after `join_password` was added). Excludes `sealed_story`, `frontman_player_id`, `join_password`. Confirmed `config` jsonb itself carries no secrets — it's built from `GameConfig` (`lib/schemas/config.ts:4-90`), a whitelist of tuning numbers (round timers, bribe tiers, targets), and `join_password` is written to its own column, not folded into `config` (`app/api/game/create/route.ts:64-65`). Read only via anon key at `app/invite/[code]/page.tsx:42` and `useGame.ts:157`. |
| `bounties` (RLS, no policy) | SAFE | `supabase/migrations/0007_bounty.sql:17` | Zero policies on an RLS-enabled table denies **all** access (select/insert/update/delete) to any role without `BYPASSRLS`/ownership — this is independent of table GRANTs. Confirmed nothing routes around it: no view or security-definer function anywhere in `supabase/migrations/` selects from `bounties`, and every code path that touches it (`lib/engine/bounty.ts`, `app/api/bounty/route.ts:21-22`) goes through `supabaseAdmin()` (service-role, `lib/supabase/admin.ts`), never `supabaseBrowser()`. The answer (`expected` column) never reaches the wire pre-verification. |
| `codes` (RLS, no policy) | SAFE | `supabase/migrations/0002_rogue.sql:64` | Same reasoning. All access is via `admin.from("codes")` inside `lib/engine/referee.ts` (e.g. `:739`) and the `/api/code/hide`, `/api/code/find` routes, all service-role. No client-side query anywhere (`lib/client/` has zero references). |
| `scheduled_messages` (RLS, no policy) | SAFE | `supabase/migrations/0006_pressure.sql:17` | Same reasoning. Touched only from `lib/engine/referee.ts` (`:661`, `:977`, `:987`) via the admin client — dead-drop content never has a client-reachable path; delivery happens by the server writing an ordinary `messages` row (which *does* have RLS: `messages_select_own`, `0001_init.sql:205-206`) to the recipient only. |
| `wiretaps` (RLS, no policy) | SAFE | `supabase/migrations/0002_rogue.sql:188` | Same reasoning. Set/read only via `lib/engine/notes.ts` (`setWiretap`) called from `lib/engine/referee.ts`, service-role. A guest can never query who's tapped or who's tapping. |

**One assumption underneath all seven SAFE verdicts, flagged as NEEDS-RUNTIME-CHECK
(can't be confirmed by reading code):** this all depends on the standard Supabase role
setup — `anon`/`authenticated` are ordinary roles with no `BYPASSRLS` and no table
ownership. Nothing in this repo or its history grants that, and doing so would be an
unusual manual dashboard/SQL action, but a from-the-database confirmation (`select
rolname, rolbypassrls from pg_roles where rolname in ('anon','authenticated')`) is the
only way to close this out for certain, and that's a live-project read this audit was
scoped not to do.

**Why the Supabase advisors flag these four tables at all:** the advisor is a generic
"RLS enabled, zero policies — did you forget?" lint. It can't tell deliberate
lockdown from an oversight. Here it's deliberate (the migrations say so inline, e.g.
`0007_bounty.sql:17`: "no client policies: server-only (the answer must not leak)") and
the static trace above backs that up. Nothing to fix.

## `supabase/migrations/0011_security_hardening.sql`

**Not created.** Every flagged item traced to SAFE under static analysis — no view
leaks a secret column, no no-policy table has a grant/view/function bypassing its
RLS deny-all. There is nothing at REAL EXPOSURE for a hardening migration to fix. If
the NEEDS-RUNTIME-CHECK item above ever comes back positive (some role has
`BYPASSRLS`), that's a role-privilege fix, not a schema migration, and out of scope
for a `.sql` file in this repo.

## Rate limit vs the party

Supabase anonymous sign-ins default to **30/hour/IP** (dashboard: Authentication →
Rate Limits). Every player identity in this app *is* an anonymous-auth session
(`lib/engine/auth.ts` — no real accounts), so every join, every phone-death rejoin,
and every dropped-wifi reconnect consumes one. A 15-guest party on one host's home
wifi shares one public IP. Budget: 15 initial joins already spends half the bucket;
add a couple of phone swaps, the tutorial dry run, and normal flakiness on real venue
wifi, and 30/hour is realistic to exhaust mid-party — the failure mode is a guest
stuck unable to (re)join with no visible countdown. **Raise this before September**,
in Authentication → Rate Limits, not during the event. (Already called out in
README.md Setup step 1 and CHECKLIST.md's THE GATE section — repeating here because
it's the one item that's a genuine ship-blocker if forgotten, not a nice-to-have.)

## Money-loop simulation coverage — still a gap

Per GAPS.md ("KNOWN BACKLOG"), the FIELD TRIAL's core money loop has **never
executed against a database**. Specifically untested by either `simulate.ts` or
`simulate-rogue.ts`:

- **Wagers end-to-end**: escrow on accept, both-report match path, both-report
  mismatch → dispute → machine arbitration, and the side-bet sweep that pays/pockets
  when a wager settles.
- **The `submitResponse` verification ladder** (`lib/engine/rogue.ts:214-217`) —
  code / cross-confirmation / submission / self verification kinds.
- **`adjudicate` → meter crossing** — the director-judged path that feeds
  plunder/compute off an open-answer call, as opposed to the code/glyph paths that
  simulate *does* cover.
- **Petitions, forgeries, `mint_code`, parley** — all director-judgement paths;
  GAPS.md notes these are "simulate + the pub night are their tests" but simulate
  doesn't actually reach them yet.
- **`debit_if_covered` refusal** (`lib/engine/economy.ts:20`, the RPC defined at
  `supabase/migrations/0002_rogue.sql:212-221`) — the "can't go negative" guard has
  never been driven to its refusal branch by a script; only the happy (covered)
  path is implicitly exercised whenever any spend succeeds in `simulate-rogue.ts`.

CHECKLIST.md's `npm run simulate:rogue` run (55 events, 22 transactions) *does*
exercise: hijack, bribe-arming, front-man appointment, the wager + pari-mutuel
side-bet economy at a **surface** level, hide/find codes, wiretaps + held/edited
mail, wrongful-vs-burning accusations, rotation, two-sided unmasking. What it
doesn't prove is the failure/edge branches above — dispute, refusal-on-insufficient-
balance, and the LLM-adjudicated paths, which by construction a scripted no-LLM
simulate can't touch. This audit did not run either simulate script (out of scope);
this section is a pointer to GAPS.md's own accounting, not a new finding.

## Remaining human-only items

Nothing here is closeable by more code review:

- **THE INDUCTION on two real phones** (Paul's + Co-Host's) — the first-hour test this
  was built for, per CHECKLIST.md THE GATE. Still open.
- **Real director prompt spot-checks** — judgement/taste/latency of the live LLM
  director, explicitly called out in GAPS.md as the one thing the induction
  deliberately can't cover (only its optional audience step touches the model).
  Still open.

Both require Paul (and Co-Host) on real devices against the live deploy — no static
pass substitutes for either.
