# PARLOUR — The Gap Register

> **Last updated: 2026-07-12** · what's missing, unproven, or undecided — honestly.
> Fixed items move to the bottom. Paul: add/strike freely.

## CRITICAL — would break the first sandbox run (being fixed now)

1. **Rogue games had no story path.** `/api/story/generate` only knew the murder
   generator — a rogue game could never seal NO QUARTER. → FIXED: rogue games seal
   the reference story, dealt to players, with the COVER title ("Death on the Poop
   Deck") as the public branding pre-hijack.
2. **No manual hijack trigger.** Only the director could fire the takeover; if it
   dawdled at the party's peak moment, the host had no lever. → FIXED: break-glass
   gains "begin the takeover".
3. **Director stampede.** Every event fires a tick via `after()` with NO debounce or
   concurrency lock — a burst of joins/codes could run several directors at once,
   proposing conflicting moves and burning tokens. → FIXED (interim): ticks coalesce
   — a tick within 15s of the last one is skipped. Proper advisory lock = backlog.
4. **Bribe double-credit race.** `acceptOffer` checked status then updated — two fast
   taps could credit twice and double-tick the meter. → FIXED: atomic
   claim (update-where-still-offered, verify a row moved).

## IMPORTANT — needed before the September playtest

*(#5–#10 all FIXED in the "fix it all" pass — see Fixed, below.)*

## DECIDE — Paul's calls, nothing blocked but the calendar

11. **November's twist**: keep the bribes-tally winner, or stack it with "one ship,
    two flags" (#0) and/or "the real one" (#4)? The tri-fold is maximal vertigo.
12. **Co-Host's role** (BOSUN's champion / full-knowledge chaos / secret villainess)
    and **your own allegiance** (plain / chaos agent / secretly rogue).
13. **Physical prizes** for the awards ceremony — foam finger for the Wrong'un is
    canon; the rest is shopping.
14. **Theme pick** for murder mode (moot for the party; matters only if the classic
    mode ever runs).

## KNOWN BACKLOG (designed, not built — in rough order)

- The rogue GENERATOR (November's factory: prompt + reference exemplar + validators
  — the story exists, the machine that writes the next one doesn't).
- **Simulate coverage for the D45 economy** (review R3 work order): wagers
  end-to-end (escrow/rollback, both-report, dispute, settle, side-bet sweeps),
  the `submitResponse` verification ladder, `adjudicate`→meter crossing,
  petitions/forgeries/mint_code/parley, `debit_if_covered` refusal. The FIELD
  TRIAL's core money loop has never touched a database.
- Dead schema/config pruning-or-wiring (review R3 #10): `beats` table,
  `murders.discovered`, `messages.read_at`/`data`, `players.status='ghost'`,
  and the unread config knobs (`roundMinutes`, `voteMinutes`,
  `playersPerTraitor`, `arrivalThresholdPct`, `minPlayersToStart`,
  `killChallengeExpiryMinutes`, `bribeTiers`/`computeTiers`) — wire them into
  the director prompt or delete them before they calcify.
- PDCA setup dialogue + visual venue panel (D26) · slip print-sheet page ·
  pre-party invite/character-reveal drip · TTS house voice · costume portraits ·
  paper-pack export · optional PWA/push · awards-ceremony interactivity ·
  hijacked-theme emoji muting · audience remaining-count · scheme status surface ·
  modal focus-trap hardening · host-runbook rewrite for ROGUE + the pub night
  (banner added meanwhile) · `/api/director/tick` is unauthenticated when no
  `x-tick-secret` is configured (known design: the TV metronome — but it's a
  real-money endpoint; revisit before deploy).

## FIXED (this pass)

- **#1–#4 criticals**: rogue story sealing (cover title public), manual hijack lever,
  director tick coalescing, atomic bribe claims.
- **#5 stats & awards engine**: `lib/engine/stats.ts` computes six awards (incl. THE
  RICHEST PIRATE — resolving #9, money's terminal value is a podium moment) + a
  personal "your night, itemised" card messaged to every player at the unmasking.
- **#6 the receipts render**: the ceremony emits public `receipts` + `final_awards`
  events; the TV's CeremonyBoard shows the verdict, the timestamped bribe ledger
  (names withheld), and the podium.
- **#7 mission pools refreshed**: all 38 missions verification-tagged; new glyph,
  choice-quiz (incl. the origin-story quiz and CALICO's catechism: "what is the
  correct number of mistakes?"), poll, and forgery-grant missions added; schema
  extended and revalidated clean.
- **#8 intake form**: an optional, dismissible card on the Now tab (pre-hijack) +
  `/api/intake` — occupation, relation to host, arrival.
- **#10 BOSUN's win enforced**: crossing the compute target emits a public
  `compute_complete` event the director must answer.
- **D44 two nights**: pub-lite preset (fast rounds, codes/post OFF, cheaper
  audiences) as a /new checkbox; referee + UI + director all respect tonight's table.
- **D45 FIELD TRIAL pass** (registered late): wagers with escrow + both-report +
  disputes, side bets against the house, pass-and-play phone duels, per-night
  join passwords, the pub story + curated game library, quiz bank (D46). Its
  money paths carry the same atomic-claim discipline as bribes; its untested
  surface is logged under KNOWN BACKLOG → simulate coverage.
- **Review round 3 (2026-07-12) — cross-cutting pass, all fixed same-day**:
  `games_public` view (a fresh device could never reach the join screen — the
  games RLS policy required membership the guest didn't have yet); `useGame`
  players fetch scoped by `game_id` (second game on a device bricked the first);
  `getCaller` uppercases the room code (lowercase URLs joined fine then 404'd
  every action); NoteComposer honours `stamplessNotes` (the pub post office was
  UI-bricked); referee switch gained a `default: throw` exhaustiveness backstop
  (unmatched tools logged silent OK verdicts); murder machinery mode-gated
  against rogue games (`advance_phase` to `round.*`, kill challenges, breakglass
  `skip_to_assembly`→parley, `end_gracefully`→the unmasking ceremony);
  `plunder_complete` crossing event (the rogue's win pressure is now code, like
  BOSUN's); wagers added to realtime (declines/settles now reach the other
  party); `timeScale` applied to kill-offer + wiretap expiries; single-voice
  nights hide the second Ask door; currency symbol flows from the story (pub =
  ◎); stamps optimistic-concurrency item struck (fixed earlier). Docs de-drifted:
  README (both migrations, both simulates, real repo map), SPEC scope note,
  modes.md ROGUE=built, host-runbook legacy banner, interaction-model
  glyph/choice rows.

## UNPROVEN — waiting on the keys

- **Everything.** Zero lines have executed against a database. First hour with keys:
  both migrations → `npm run simulate` + `npm run simulate:rogue` → deploy → a full
  sandbox playthrough on Paul's Pixel → REAL director spot-checks (replacing the
  Fable-executed ones Paul already reviewed).
- Real-world latency of the event→tick→move loop; Anthropic spend per hour of party;
  Supabase realtime behavior on party wifi; the glitch on real Android/iOS Safari.
