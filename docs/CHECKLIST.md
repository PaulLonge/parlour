# PARLOUR — Build Checklist (living)

> The resume point. Any session starts here: what's shipped, what's mid-build, what's
> next, what's waiting on Paul. Canonical *why* lives in [`DECISIONS.md`](../DECISIONS.md);
> this is the *state*. Update it in the same commit as the work. Last touched: 2026-07-14.

## ▶ Building now (the spine — in order)

The design ran ahead of the code; these three are the foundation everything else needs.

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

- [ ] **Blackmail** — machine uses held/wiretapped mail as leverage; real teeth (refuse → it
      leaks); panic exempt. (greenlit, defaults set)
- [ ] **Bounty** — public price on an action, a *race* (first to claim wins), phone-verified
      (no TV needed). (greenlit)
- [ ] **Dead-drop** — delayed/conditional message (timer + on-burn / on-unmasking triggers).
      (greenlit)
- [ ] **Resolve + explicit refusal** — DECLINE button banks a token → good-side powers; fixes
      "take every bribe." (GDD #1)
- [ ] **Front-man lifecycle** — min tenure, office-acts leak clues, announce THAT the hat
      moved, freeze before the Reckoning. (GDD #2) · **Shield** rides here.
- [ ] **Scheduled tribunal windows** (GDD #7) · **Scaled targets** from content budget (GDD #6)
      · **Bribe retune** 75/150/300/600 gated (GDD #3) · **Decoy survives the hijack** (GDD #8)
      · **Pub collaborator as a real system** (GDD #5).

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

## ⛔ THE GATE (blocks all execution — nothing has run against a real DB)

- [ ] Paul's Supabase project + Anthropic API key
- [ ] Run **4 migrations** in order (0001 → 0004)
- [ ] `npm run simulate` + `npm run simulate:rogue` green against real Supabase
- [ ] Vercel deploy + env vars
- [ ] **THE INDUCTION on Paul's + Co-Host's phones** (built to be exactly this first-hour test)
- [ ] Real director prompt spot-checks (the thing the induction deliberately can't test)

## 🗄 Backlog (designed, not built — lower priority)

Rogue story GENERATOR (November's factory) · **wager-economy simulate coverage** (rake +
pari-mutuel changed the math, untested) · dead schema/config pruning (`beats`,
`murders.discovered`, `ghost` status, unread knobs) · PDCA venue setup dialogue · slip
print-sheet page · invite drip · TTS · portraits · paper-pack export · proper director
advisory lock · host-runbook rewrite for ROGUE + pub · reveal "arc" stats for flipped players.
