# PARLOUR — Build Checklist (living)

> The resume point. Any session starts here: what's shipped, what's mid-build, what's
> next, what's waiting on Paul. Canonical *why* lives in [`DECISIONS.md`](../DECISIONS.md);
> this is the *state*. Update it in the same commit as the work. Last touched: 2026-07-15.

## ✔ THE INTRIGUE ENGINE IS BUILT

The spine + every green-lit GDD-review item are shipped (see below). THE GATE is now
**half-open** (2026-07-15): Paul's Supabase project exists and all 8 migrations are
applied against it. Still open: service-role key wired into the deploy target, both
simulate scripts run for real, Vercel deploy, and the two-phone induction.

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

## ⛔ THE GATE (half-open — schema is live, nothing else has run yet)

- [x] Paul's Supabase project — `parlour` (`zhaajhegqztymrvvnsgz`, eu-west-2), created 2026-07-15
- [x] Anthropic API key — added to the Claude Code cloud environment's env vars
- [x] Run **all 8 migrations** in order (0001 → 0008) — applied 2026-07-15 against the
      real project via the Supabase MCP connector. (Note: this repo's migration files
      aren't in the Supabase-CLI timestamp-prefixed naming convention, so the
      GitHub↔Supabase auto-deploy integration may not track/reapply them the normal
      way — verify once that integration is exercised for real, don't assume it works
      on the strength of this manual run.)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — grab from Supabase dashboard (Project Settings → API,
      service_role secret) and add wherever the app actually runs (Vercel env vars, or
      local `.env.local` for `npm run simulate`)
- [ ] `npm run simulate` + `npm run simulate:rogue` green against real Supabase
- [ ] Vercel: project created, linked to the Supabase project (native integration syncs
      `NEXT_PUBLIC_SUPABASE_URL`/anon key/service-role key automatically), plus
      `ANTHROPIC_API_KEY` + `DIRECTOR_TICK_SECRET` set manually (Supabase's integration
      doesn't know about those two)
- [ ] **THE INDUCTION on Paul's + Co-Host's phones** (built to be exactly this first-hour test)
- [ ] Real director prompt spot-checks (the thing the induction deliberately can't test)

## 🗄 Backlog (designed, not built — lower priority)

Rogue story GENERATOR (November's factory) · dead schema/config pruning (`beats`,
`murders.discovered`, `ghost` status, unread knobs) · PDCA venue setup dialogue · slip
print-sheet page · invite drip · TTS · portraits · paper-pack export · proper director
advisory lock · host-runbook rewrite for ROGUE + pub · reveal "arc" stats for flipped players.
