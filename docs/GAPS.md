# PARLOUR — The Gap Register

> **Last updated: 2026-07-11** · what's missing, unproven, or undecided — honestly.
> Fixed items move to the bottom with their commit. Paul: add/strike freely.

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

5. **The awards are prose, not code.** Cheapest Buy / Iron Purse / Wrong'un / Phoenix
   / Ghost are all COMPUTABLE from the event log (timestamps, refusal counts, vote
   outcomes) but no stats engine exists. Needed: `computeAwards(gameId)` + reveal
   integration + personal stat cards ("offered 4 bribes, took 2, suspected by 6").
6. **The receipts have no renderer.** Ledger Three (the itemized replay of meter
   jumps vs bribes, times public, names withheld) is the reveal's centerpiece and is
   currently only a story paragraph. Needs a TV component reading `transactions`.
7. **Reference story predates half the mechanics.** NO QUARTER's 32 missions were
   written before the verification taxonomy (D21), glyphs, stamps, wiretaps, and
   choice-quizzes existed. Needs a content pass: every mission tagged with its
   verification mode; add quiz/glyph/wiretap/stamp-grant missions to the pools.
8. **Intake is an API without a form.** The join screen collects a name only; the
   slim quiz (age, occupation, relations, arrival) has nowhere to be typed. Needed
   before invitations go out.
9. **End-of-purse meaning.** Money has sinks (audiences, postage) but no terminal
   value — final balances currently mean nothing at the reveal. Decide: a Richest
   Pirate award? Balances buy reveal-ceremony privileges? (Cheap, fun, undecided.)
10. **BOSUN's early win is prompt-only.** Compute-meter-full → good-AI victory is
    described to the director but has no enforced check; if the model ignores it,
    nothing happens. Consider an auto-event at threshold.

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
- PDCA setup dialogue + visual venue panel (D26) · slip print-sheet page ·
  pre-party invite/character-reveal drip · TTS house voice · costume portraits ·
  paper-pack export · optional PWA/push · awards-ceremony interactivity ·
  hijacked-theme emoji muting · audience remaining-count · scheme status surface ·
  modal focus-trap hardening · stamps decrement is read-modify-write (low stakes).

## UNPROVEN — waiting on the keys

- **Everything.** Zero lines have executed against a database. First hour with keys:
  both migrations → `npm run simulate` + `npm run simulate:rogue` → deploy → a full
  sandbox playthrough on Paul's Pixel → REAL director spot-checks (replacing the
  Fable-executed ones Paul already reviewed).
- Real-world latency of the event→tick→move loop; Anthropic spend per hour of party;
  Supabase realtime behavior on party wifi; the glitch on real Android/iOS Safari.
