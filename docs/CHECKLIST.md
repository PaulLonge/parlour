# PARLOUR — Build Checklist (living)

> The resume point. Any session starts here: what's shipped, what's mid-build, what's
> next, what's waiting on Paul. Canonical *why* lives in [`DECISIONS.md`](../DECISIONS.md);
> this is the *state*. Update it in the same commit as the work. Last touched: 2026-07-17.

## ✔ THE INTRIGUE ENGINE IS BUILT

The spine + every green-lit GDD-review item are shipped (see below). THE GATE is now
**open** (2026-07-17): Supabase is live and migrated, `.env.local` is fully filled, both
`npm run simulate` + `npm run simulate:rogue` pass clean against the real project (two real
bugs found and fixed along the way — see below), and Vercel is git-linked, has all env vars
set, and is deployed live at https://parlour-six-alpha.vercel.app. Still open: the
two-phone induction and real director prompt spot-checks.

## ▶ The spine (all shipped)

The design ran ahead of the code; these three were the foundation everything else needed.

- [x] **1. Two-way loyalty market** (D59) — `offer_redemption`, front-man-turned, ledger
      cumulative. Shipped `c31ebcb`.
- [x] **2. THE ENDGAME — take down the AI** (D58/D60). Meters creep visibly (bars); correct
      burns feed compute; `resolveUnmasking` has two room-win paths (out-build shutdown OR
      the naming); the AI HOLDS THE CLOCK (crossing a target signals, never auto-ends — it
      paces the finale). TV headline reflects the win path. Shipped `eba39c5`.
      - ✓ resolved: compute bar **visible** (creeping), AI controls when it actually ends.
- [x] **3. Powers economy** (D59c/D61) — grantable secret one-use powers: **Rob** (lift
      capped coins, blocked by a ward) + **Shield** (money/privacy ward — stops robs AND
      wiretaps) SHIPPED; **Swap**/**Copy** staged (tool accepts, UI shows "soon"). Involuntary
      at the victim's end, private. Bars made "almost fake" (cap 92%, AI ends the game).
      Shipped `0d06845`.

## ⧗ Queued next (pressure tools, then the rest of GDD wave 2)

- [x] **Blackmail** (D62) — machine weaponises wiretapped mail; real teeth (refuse → the
      expiry sweep leaks it publicly); panic exempt. Shipped `da8fd4c`.
- [x] **Dead-drop** (D62) — held message delivered on a timer or on-burn/on-unmasking;
      `fireDueDrops`, atomic. Shipped `da8fd4c`.
- [x] **Bounty** (D63) — public price on an action, a *race* (first correct answer wins),
      phone-verified, server-only answer; BountyBoard on Now. Shipped `2c805a7`.
- [x] **Resolve + explicit refusal** (D64) — 🕯 REFUSE on the bribe card banks a token →
      compute / Sight / ward. Fixes "take every bribe." (GDD #1) `90fe1d0`
- [x] **Front-man lifecycle** (D67) — public rotation cue (hat moved, not who) + prompt
      (tenure, clue-leaving acts, freeze before Reckoning). (GDD #2) `90fe1d0`
- [x] **Scaled targets** (D66) — recomputed from arrived headcount at the hijack (GDD #6) ·
      **Bribe retune** 75/150/300/600 (D65, GDD #3) · **Decoy survives the hijack** (D68, GDD #8) ·
      **Pub collaborator** as a real system (D68, GDD #5) · **Tribunal windows** (D67 prompt, GDD #7)
      · **Swap/Copy powers** finished (D68). `90fe1d0`

**GDD review adoption COMPLETE** — every green-lit item shipped; only the Dead-Reckoning
paper-fallback kit stays deferred.

## 🎭 Scenarios (D69) — games are now DATA

- [x] **Scenario registry** (`content/scenarios.ts`) — a game = a data entry (mode + story
      pack + preset + skin). `/new` renders it; create resolves mode/preset; generate seals
      the named pack. Adding a game = entry + JSON, **no engine change**. `e6d2017`
- [x] **Third scenario shipped: THE VAULT** (`content/vault-story.json`) — a casino-heist
      reskin (MIDAS vs LEDGER, ◆ Chips), schema-validated, proving the rogue engine is
      theme-agnostic. To add more: write a persona-less `RogueStory` JSON + a registry entry.

## ✅ Shipped (recent — newest first, with commit)

- [x] D59 two-way loyalty; Shield→money/privacy ward; chaos→granted-power economy (design) `c31ebcb`
- [x] D57 hosts CAN front (reverses D48) + balance readout for smart recruitment `7756def`
- [x] D58 "aim of the game" section recorded (take down the AI) `7756def`
- [x] D56 THE SIGHT / the Seer — bounded deterministic truth, never names front man `2009aaf`
- [x] OVERVIEW "What the AI can and cannot do" one-pager (+ Drive copy) `e92e07d`
- [x] D55 THE HONEYPOT — exploits left as bait the con catches `f670bc5`
- [x] D51 wager rake + pari-mutuel side bets · D52 hijack two-gate timing · D53 per-seat
      codes · D54 evidence-integrity UX `2aa6207`
- [x] D49 safety-as-plumbing · D50 plunder purity (wrongful ≠ plunder) `df8c9c7`
- [x] D47/D47a THE INDUCTION — 18-step two-phone tutorial + November briefing
- [x] Review rounds 1–3 (UI, money/security, cross-cutting) — all criticals/highs fixed

## ❓ Open forks / awaiting Paul

- [ ] D58 build-time: compute bar visible vs hidden (above)
- [x] ~~Team knowledge~~ → DECIDED: CALICO-controlled selective introductions
- [x] ~~Two-way loyalty yes/no~~ → yes, shipped
- [ ] Two night join passwords (a word each, e.g. "yellow"/"blue")
- [ ] Commissioner's-Interview open threads: climbing story, karaoke/pub-order, the anime
      people *assume* is his favourite
- [ ] Physical prizes beyond the canon foam finger (the Wrong'un)
- [ ] NHIE question vetting (post-keys)

## ⛔ THE GATE (open — schema live, both simulates green, deploy still needs env vars)

- [x] Paul's Supabase project — `parlour` (`zhaajhegqztymrvvnsgz`, eu-west-2), created 2026-07-15
- [x] Run **all 8 migrations** in order (0001 → 0008) — applied 2026-07-15 via a Claude Code
      cloud session, confirmed still applied 2026-07-17 (this repo's migration files aren't
      in the Supabase-CLI timestamp-prefixed naming convention, so don't assume any
      GitHub↔Supabase auto-deploy integration tracks/reapplies them the normal way).
- [x] `.env.local` fully filled (2026-07-17) — Supabase URL/anon key via MCP,
      `SUPABASE_SERVICE_ROLE_KEY` + `ANTHROPIC_API_KEY` pasted in by Paul, `DIRECTOR_TICK_SECRET`
      generated. Local-only — none of this is in Vercel's env vars yet (see below).
- [x] Fixed a real bug found running `npm run simulate` for the first time: `package.json`
      had no `"type": "module"`, so tsx/esbuild transformed the top-level-await scripts as
      CJS and crashed before touching the DB. Added `"type": "module"` (2026-07-17, no CJS
      `require`/`module.exports` anywhere in the codebase, so this is safe).
- [x] Fixed a real referee bug found by that same first run: `close_vote`'s case in
      `applyDirectorMoves` (`lib/engine/referee.ts`) calls `closeVote()`, which phases itself
      off its own freshly-loaded `GameState` — not the batch's shared `s` — so the phase
      change to `round.banishment` never propagated back, and any later move in the *same*
      director tool-call batch (e.g. closing a vote then advancing to `endgame`) was wrongly
      rejected as an illegal transition. This isn't just a test artifact — a real director
      batching those two moves together would have hit it too. Fixed by syncing `s.game` after
      `close_vote`, mirroring the pattern `setPhase` already uses.
- [x] `npm run simulate` — **fully green, 29/29** (2026-07-17), after both fixes above.
- [x] `npm run simulate:rogue` — **fully green** (2026-07-17): hijack, bribe-arming, front-man
      appointment, wager economy + pari-mutuel side bets, hide/find codes, wiretaps + held/edited
      mail, wrongful-vs-burning accusations, rotation, two-sided unmasking. 55 events, 22
      transactions in one throwaway game.
- [x] Vercel project **created and git-linked** (Paul did the dashboard import) — `parlour`
      on team `paul-longe-s-projects`, auto-deployed from `main`.
- [x] Vercel env vars set (2026-07-17, via `vercel env add` — the Vercel MCP connector has
      no write tool for this, so the CLI was installed and Paul ran `vercel login`
      interactively). All 9 keys from `.env.local` pushed to production/preview/development;
      `NEXT_PUBLIC_BASE_URL` uses the real canonical alias (`https://parlour-six-alpha.vercel.app`)
      for production/preview and `localhost:3002` for development. Redeployed to production
      (`dpl_7fxZFfdbjDz1hULcHF4wUE8Jr6H7`, READY, aliased live) — homepage and `/new` verified
      200 with no runtime errors. Note: only static/client pages were smoke-tested; the
      Supabase/Anthropic-calling API routes haven't been exercised on the live deployment yet
      (deliberately didn't POST a real game into production Supabase from here).
- [ ] **THE INDUCTION on Paul's + Co-Host's phones** (built to be exactly this first-hour test)
- [ ] Real director prompt spot-checks (the thing the induction deliberately can't test)

Security note: Supabase advisors flag `players_public`/`wagers_public`/`games_public` as
SECURITY DEFINER views and `beats`/`bounties`/`codes`/`director_log`/`murders`/
`scheduled_messages`/`wiretaps` as RLS-enabled-no-policy. The no-policy tables on
`murders`/`beats`/`director_log` are correct per AGENTS.md (no client policies, spoiler
containment); `bounties`/`codes`/`scheduled_messages`/`wiretaps` having zero policies is
worth a deliberate check — confirm those are meant to be server-route-only (service role)
and not something a client needs direct read access to.

## 🗄 Backlog (designed, not built — lower priority)

Rogue story GENERATOR (November's factory) · dead schema/config pruning (`beats`,
`murders.discovered`, `ghost` status, unread knobs) · PDCA venue setup dialogue · slip
print-sheet page · invite drip · TTS · portraits · paper-pack export · proper director
advisory lock · host-runbook rewrite for ROGUE + pub · reveal "arc" stats for flipped players.
