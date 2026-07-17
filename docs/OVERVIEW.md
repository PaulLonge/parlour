# PARLOUR — The Overview

> **Last updated: 2026-07-17 (rev 25 — D71/D72 complete: act one wears the Cold Case file and the hijack flips BRIGHT into the Apiary machine co-op (gear drones drifting, D35 reversed); the landing comes apart on scroll; the dossier assembles itself; THE BOARD — private notes as a drag-and-red-string evidence corkboard (device-local, legacy notes migrated) — replaces the notes textarea. Rev 24 — D71 wave 1 SHIPPED: /guide rebuilt as the Cold Case dossier; /briefing NEW — the guest-shareable Legerdemain pub deck for night one; the TV sinks (Benthica descent once hijacked, meters as depth); /api/director/cron + migration 0010 make the heartbeat venue-independent — the TV is now truly optional. Rev 23 — D71 THE CASTING SHEET: visual identity anchored to The Gallery's rooms per-surface; the Escapement clockwork landing SHIPPED, Cold Case act-one / Apiary hijack-flip / Benthica TV / Legerdemain wagers queued. Rev 22 — THE MANUAL: /guide + the guide:capture Playwright harness, the first automated E2E over the real browser/HTTP layer; caught three real bugs on its first runs. Rev 21 — THE GATE opens: Paul's Supabase project live, all 8 migrations applied against it. Rev 20: D69 SCENARIOS: games are now DATA (a registry + a content pack, no engine change); THIRD game shipped — THE VAULT, a casino-heist reskin proving the engine is theme-agnostic. Rev 19: GDD adoption complete)** · maintained by Claude, co-edited by Paul · this file's
> history: `git log -- docs/OVERVIEW.md`
> **Maintenance rule:** any change to game mechanics, app behaviour, or the tech stack
> updates this document — date bumped — in the same commit.

*The front door for reviewers. Deeper layers: [`docs/CHECKLIST.md`](CHECKLIST.md)
(**the resume point — what's built / building / next**), [`SPEC.md`](../SPEC.md) (formal
ontology, murder-mode focused), [`DECISIONS.md`](../DECISIONS.md) (every design call,
numbered), [`docs/modes.md`](modes.md) (mode specs),
[`docs/interaction-model.md`](interaction-model.md) (what the app can verify).*

---

## What this is

**Escape room you build yourself × murder mystery × The Traitors** — a live party
game engine where every guest plays on their phone and an AI directs the night.
Version one runs at Paul's 30th birthday, November 2026.

**The premise (canon, and true):** Paul typed *"Hey ChatGPT— hey Claude, whichever
one. Make me a murder mystery game for my 30th birthday. Make no mistakes."* into an
AI. The guests are invited to a pirate fancy-dress murder mystery. **The murder
mystery does not exist.** Mid-party, the app "crashes", every phone shows a drained
balance in a fictional currency, and a rogue AI — the thing Paul accidentally
commissioned — announces new management and starts *hiring the room back with its own
money*. A second, earnest AI fights it. The night ends with the room, together,
naming the rogue's human front man: right, and the machine loses; wrong, and it keeps
everything. Then the reveal: the vault was never robbed — the "plunder" meter was a
live tally of accepted bribes all along. *"That's not what it stole. That's what you
sold."*

Paul plays **himself, the Commissioner** — publicly the man who summoned the machine,
the room's lightning rod, and mechanically the **AGENT OF CHAOS**: aligned to nobody,
courted by both sides, may take bribes, but can never be the front man (D48). **Co-Host
is the GOOD AI's champion** (D48) — its arm in the room, building the lantern.
Both are conductors and briefed to the same knowledge; the only thing hidden from
either is WHO among the *guests* is bought, which is sealed from Paul too and emerges
live. Everyone else: real names after the hijack, no acting homework, no one ever
eliminated.

## The aim of the game (D58)

**Take down the rogue AI.** Not "name a traitor" — the front man is CALICO's human
puppet, and exposing the glove doesn't stop the hand. The night is a tug-of-war
between two public meters that finally *decide* something:

- **Compute (BOSUN) = the room's weapon charging up.** Honest work — and every
  correct burning of a front man — builds the good AI toward the power to pull
  CALICO's plug.
- **Plunder (CALICO) = its grip tightening** — and secretly, per the twist, the
  running tally of the room's own accepted bribes. Every coin taken powers the
  thing you're trying to kill.

**The room wins** if compute crosses its target (BOSUN shuts CALICO down — you win
by *out-building* the rogue) or, at the forced **Reckoning** finale, by correctly
naming CALICO's last active front man to sever its final connection. **CALICO wins**
if plunder crosses *its* target first — it has bought enough of the room that it no
longer needs to hide. The front man is a **weapon and a fallback**, richly rewarded
by BOSUN (a correct burn dumps compute, pays the accuser, wounds CALICO), never the
sole objective.

Underneath, each guest plays their own book: end **rich** (Richest Pirate + awards)
and **on the winning side** — and *which* side is a live, repeated choice (D-loyalty
market, pending). CALICO's coin is fast money with real risk (exposure, burning,
you're a target); honest work is slow money with safety, information, the Sight, and
a clean name at the reveal. The one-line pitch: **"Whose side are you on tonight —
and is it worth what they're paying you?"** You beat the rogue AI by refusing its
coin and out-working your own temptation — which is why the reveal ("that's not what
it stole, that's what you *sold*") lands twice as hard.

*Status: BUILT (D60). The meters creep visibly, correct burns feed compute, and the
Reckoning resolves on two room-win paths (out-build shutdown OR the naming). The AI
holds the clock — crossing a target signals that the ending is available but never
auto-ends the game; the director paces the finale so it lands at the room's peak, not
the moment a bar fills.*

## The intrigue stack

Every mechanic below is referee-validated (the AI proposes; deterministic code
disposes) and verifiable by what a phone can actually sense (typing, tapping, timing,
and other players' testimony — never phantom sensors).

| Mechanic | What it is | The hook |
|---|---|---|
| **Bribes** | Private offers: coins restored to your purse + a small task | *Taking the money makes you a minion* — arming by acceptance; ignoring one expires silently and re-offers elsewhere |
| **Redemption** (D59) | BOSUN buys a minion back to the good side — the loyalty market runs both ways | Ticks compute not plunder; redeeming the front man vacates the hat publicly; CALICO can re-buy. The ledger never forgets, so allegiance is fluid but the receipts aren't — every "clean" reading decays |
| **The meters** | Twin public gauges on every phone + TV: Ƀ taken vs compute built | The plunder meter is secretly a live tally of accepted bribes — the twist runs in public all night, labelled "every coin accounted for" |
| **Missions** | Paid tasks from either AI: evidence-gathering, counter-intel, mischief | Good-side work is engineered to look exactly as furtive as bribery |
| **Paper codes** | Printed slips (typed, not scanned) hidden around the house | Hide/find chains verify both ends; the AI can dictate NEW slips for humans to write mid-game |
| **Glyph handshakes** | Your phone shows a rotating mark; verifiers tap what they were shown | Deterministic proximity proof — zero typing, zero ambiguity |
| **The front man** | The rogue's one knowing human agent, with privileges | Never told who else is bought (one-way knowledge); the role ROTATES when burned; **anyone can be it, hosts included** (D57) |
| **Accusations** | Parley votes to name the front man | Right: they're *burned* — exposed, ineligible forever, still in play, and cheap for the good side to flip. Wrong: everyone is billed for it |
| **The Unmasking** | One final simultaneous naming | Two-sided: wrong = the rogue wins outright |
| **Audiences** | Pay Ƀ to ask an AI one question, answered in voice | The economy sink; architecturally cannot leak the front man (the answering model doesn't hold the data) |
| **Petitions** | Players pitch their own schemes in free text | Granted (formalized as a paid mission), declined in voice, or **monkey's-pawed**: exactly what you asked for, worded to cost you |
| **Forgeries** | A mission grants "compose as an AI"; drafts parse through the director | Forward / edit / expose-to-one-witness — double-bluffable against its author |
| **The post** | Player-to-player notes, carried by the machine | Requires an earned **stamp** (no stamp → go talk in person) + postage; surveilled mail is held/edited/dropped/leaked; **wiretaps** copy correspondence silently; signatures prove nothing |
| **Quizzes & mini-games** | Tap-answer quizzes (about the host, about each other) and parley-scripted game rounds, paid in credits | Deterministic verification; drinking prompts always carry a "sip or confess" out |
| **Wagers** (night 1's engine) | Challenge anyone — pub games or one-device phone duels (Reaction, Tap Race, Steady Hand); stakes escrow on accept; both report the winner | Mismatched reports go to the machine for arbitration ("two testimonies, one lie"); AI-set stake caps stop anyone going all-in |
| **Side bets** | Back a contestant on someone else's accepted duel — **pari-mutuel**: winning backers split the losing backers' pool, the house takes a rake (D51) | Nothing is minted (the old 1:1-vs-house was a money printer); the Spyglass announces settlements so the whole pub sees who took whose coins |
| **The honeypot** | Gamed mechanics (laundering coins between friends, seam-hunting) are left OPEN as bait (D55) | The machine notices, then pounces in voice — exposes, taxes, or *hires* the clever ones; "you thought you'd found a seam. I left it there." |
| **The Sight** (the Seer) | A scarce charge earned for honest work; ask the machine ONE true thing about ONE person (D56) | Deterministic, unfakeable, private — but it will **never name the front man**: ask, and it deflects to a true partial clue for the same price |
| **Secret powers** (D61/D68) | One-use gifts the AI scatters to anyone (One Night): **Rob** (lift capped coins), **Shield** (ward money+privacy), **Swap** (force a coin transfer between two others), **Copy** (duplicate a power you hold) | Hidden — nobody's told who holds what; involuntary at the victim's end (a rob just *happens* to you, no name); a raised ward beats a rob/swap and seals your mail |
| **Resolve** (D64) | Refusing a bribe (🕯 REFUSE) banks a token → spend on compute / the Sight / a ward | Refusal is *active content*, not "do nothing" — taking every coin is no longer dominant; the honest path pays in power |
| **The private signals** | Guests: hold-◦ (panic = *less*) and "more please" (volunteer). Hosts: "⏭ feels slow" | All private, never public tallies. Guest boredom is detected from *behavior* (the director feeds anyone going quiet); the feels-slow nudge is hosts-only — the room's two calibrated sensors — sitting below break-glass in the control gradient |

The reveal replays the receipts: every meter jump timestamped against its bribe,
names withheld, times damningly public — plus the petitions ledger and the arrival
photos captioned "cast as themselves, at RSVP." Awards follow (Cheapest Buy, Iron
Purse, The Wrong'un, The Phoenix, The Ghost).

## How the app works

- **Phones are the players.** No installs, no accounts: open the link, tap your name
  (a lost phone = tap your name on any other device). Four tabs: **Now** (act on
  this), **Inbox** (letters + note composer), **Ask** (audiences, schemes,
  volunteering), **More** (rules-that-are-in-on-the-con, private notes, history,
  roster, host tools).
- **The TV (or a speaker, or the host's loud voice)** is the public channel —
  meters, parleys, the reveal ceremony. The public channel is a capability profile,
  not a hardware requirement; meters live on phones regardless.
- **The director is an LLM on a leash.** Invoked on game events + a heartbeat, it
  reads a state summary, the sealed story, recent events, and a work queue
  (submissions to judge, forgeries and held mail and petitions to rule on), then
  proposes moves through ~30 typed tools. **A deterministic referee validates every
  move** against the phase machine and game rules; illegal moves bounce with reasons
  the director sees next tick. It performs three voices (house / rogue / good AI)
  from per-story persona guides.
- **Truth is an append-only event log.** Every join, bribe, code, vote, and meter
  tick is an event; all state is derived; the reveal's receipts replay from it.
- **Secrecy is architectural.** Postgres row-level security + column grants mean a
  phone *cannot query* the front man, the story, anyone else's role, purse, or mail —
  the API physically doesn't serve it. No prompt-pleading.
- **The UI is the hijack.** Act 1 renders a sunny, deliberately naff pirate app;
  when the director fires the hijack, every phone plays a glitch and comes back in
  the machine's ledger-black theme. Same moment, whole room.
- **Sandbox mode** (host testing): create a game at 10× time, and a switcher strip on
  the player screen possesses any player in one tap — the whole cast playable solo
  from one phone.
- **THE MANUAL** (`/guide`): an illustrated in-app walkthrough built from real
  screenshots the machine took of itself mid-induction. Guest-safe up top; the
  machinery sits behind a closed-by-default spoiler curtain that warns guests away
  (hosts may look — only the WHO of the night stays sealed, per D24). Linked from
  `/new` and `/sandbox` only.
- **The conductor's readout** (hosts only, live): current phase and minutes-in, when
  the machine last acted, flag acknowledgment, and an anonymized plain-words ticker
  of recent director moves ("a coin was dangled", "mail was intercepted") — the pulse
  without the plot; hosts stay blind to *who*.

## What the AI can and cannot do

The single most important safety property: **the LLM proposes, a deterministic
referee disposes.** Each turn the director emits a JSON array of moves that *must*
match a strict schema (~29 typed tools in [`lib/schemas/tools.ts`](../lib/schemas/tools.ts));
it is schema-forced at the API layer, so it literally cannot invent a move that
doesn't exist. [`lib/engine/referee.ts`](../lib/engine/referee.ts) then approves or
rejects each one before anything changes. The AI never touches the database — no SQL,
no direct writes, no arbitrary columns. **The vocabulary is the cage.**

**It can:** send any private message in any voice (including impersonating an AI);
make public announcements; offer bribes and missions with amounts it chooses; move
money *additively* (payouts); handle player mail — deliver, **edit**, drop, or leak
it; advance phases; call parleys; open accusations and the unmasking; appoint a front
man; adjust the public meters; mint paper codes; grant stamps; tap wires; resolve
wagers.

**It cannot:** touch state outside a move (no "set balance = 9999", no deleting a
player, no ending the game on a whim — there is no tool); make an illegal phase
transition (checked against a legality map; rogue-mode can't be walked into
murder-mode machinery; an unmatched tool throws); overdraw a purse (DB-enforced
non-negative) or double-pay (atomic claims); arm the vulnerable (no bribing a
panicked player; no host/burned/panicked front man); or *declare* an allegiance —
nobody becomes a minion because the AI says so, only when a human taps "accept" on a
bribe. It is also **out of the money-critical paths**: bribe acceptance, wager
settlement, verification, and meter ticks are all deterministic; the AI judges
open-ended *answers* (taste), never the arithmetic.

**The honest edge:** the deterministic cage is around **state** — money, roles,
phases, and the secrecy wall between the server and the humans — **not around words**.
Within its message and mail tools the AI has wide latitude: it can say anything to
anyone and rewrite letters. That's deliberate (it's the con), and it's the real
answer to "how far can it go" — the worst realistic failure is a *bad storyteller*,
not corrupted state. Two clarifications people get backwards: (1) the AI *sees* every
secret — it's the game master; the wall keeps secrets from the *humans*, including
Paul, not from the model; (2) **the host outranks it** — break-glass pauses it
publicly, skips its beats, or ends the night, and because the referee is plain code
you can read and every proposal-plus-verdict is logged in `director_log`, there is no
black box.

## The tech stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router, TypeScript, Tailwind) on Vercel | Server-side API routes keep every secret and LLM key off the phones |
| Data | Supabase Postgres + Row-Level Security | The sealing mechanism AND the realtime transport |
| Realtime | Supabase `postgres_changes`, filtered per game | Phones refetch their own scoped view on change; RLS guarantees the view |
| Auth | Supabase anonymous sessions + name-claim ("pseudo-accounts") | Zero-friction joins; cross-device takeover needs the seat's 4-digit code (D53) so a friend can't grab your name; the host can look codes up if a phone dies |
| AI | Anthropic via Vercel AI SDK, `generateObject` + zod | Model tiering: cheap/fast heartbeats, stronger event responses & story generation; every output schema-forced |
| Content | Stories as zod-validated JSON (`RogueStory` schema) | One generator serves the hand-refined reference story AND the sealed party story; validators reject unplayable generations mechanically |
| Testing | `npm run simulate` + `npm run simulate:rogue` | Full scripted games (no LLM) asserting phases, the kill/bribe locks, burnings, mail interception, unmasking |

Repo: `github.com/PaulLonge/parlour` (private). 22 API routes, 8 pages, 2 game
modes, 9 SQL migrations.

## Current status (honest)

- **Built and compile-verified:** everything above, plus three adversarial review
  rounds (UI + money/security + a cross-cutting architecture pass) with all
  criticals and highs fixed. Round 3's biggest catches, now fixed: a fresh phone
  could never reach the join screen (the game shell was only readable to players
  already *in* the game — solved with a `games_public` view); a lowercase room
  URL joined fine but then failed every action; the pub night's note-posting was
  blocked in the UI even though the server allowed it; and a forced
  assembly/graceful-end from break-glass could strand a rogue game in murder-mode
  machinery (both are now mode-aware — a rogue "end gracefully" runs the full
  unmasking ceremony). Behaviour notes: on single-voice nights (the pub) the Ask
  tab shows one door, not two; declines/settlements of wagers now push to the
  other phone in realtime; sandbox `timeScale` now compresses kill-offer and
  wiretap timers too; the rogue's plunder target now emits its own public
  crossing event, symmetric with the good AI's compute target.
- **THE INDUCTION (D47, new):** tick "🎓 Staff induction" at `/new` and the game
  becomes a guided two-phone tutorial — a deterministic script (no LLM, no cost)
  plays director, THE MACHINE teaches every mechanic in voice across eighteen
  steps, and each step only advances when the real mechanic verifies it happened
  (a delivered note, a matched glyph, a settled wager…). Steps 11–14 are the
  NOVEMBER BRIEFING — Co-Host's formal intro: what THE FIELD TRIAL and the Long
  Con each are, the plan through September/October, the conductor duties, the
  two rules that outrank everything, HOW THE AI WORKS (director proposes /
  referee disposes / append-only ledger; what it can sense and why verification
  looks the way it does; architectural blindness; the skull-meter confession),
  THE CATALOGUE (every mission proof-type, offer, social-economy device, wager
  form, pub game, set piece, and ceremony award), and THE SHOPPING LIST — the
  physical half of both nights (slips + pen, ping-pong ball, disposable cards,
  TV channel, printed QR, envelopes, prizes) with the paper-meets-phone loop
  spelled out. Co-Host is briefed to Paul's own knowledge level (his call, July
  2026) — the only thing withheld is WHO, which is sealed from Paul too. It doubles as the QA harness: a
  completed induction is machine-verified proof the engine works on two real
  phones, and the record lands in both Inboxes. Hosts get a skip lever; skips
  are noted. What it deliberately does NOT cover: the LLM director's judgement
  (only the optional audience step touches the model), crowd-scale load, and
  forgeries/petitions/wiretaps (director-judgement mechanics — exercised by
  `simulate:rogue` instead).
- **THE MANUAL + guide:capture harness (D70, new):** `/guide` is an illustrated
  in-app walkthrough (guest-safe tier + host spoiler curtain). The `npm run guide:capture`
  Playwright harness runs an INDUCTION game over live Supabase, asserting 48 checks
  and capturing 28 screenshots for the manual's manifest; it caught four real bugs
  on its first runs (hostName missing from /new create, accusation_closed missing
  from correct burning, the tutorialTick concurrency race — closed by migration
  0009's unique step-marker index — and "[object Object]" error rendering), all
  fixed. The harness now leaves the TV heartbeat racing its own ticks on purpose,
  so every capture re-proves the race guard.
- **Gate progress (2026-07-15):** Paul's Supabase project (`parlour`) is live and
  all 8 migrations are applied against it — the schema, RLS, and column grants
  above are now running for real, not just compile-verified. Anthropic key is in
  place; still open: `SUPABASE_SERVICE_ROLE_KEY` into the deploy target, both
  simulate scripts against the real DB, Vercel deploy, and **the induction on
  Paul's and Co-Host's phones** (it was built to be exactly this first-hour test).
- **Designed, not built:** the PDCA setup dialogue (host ↔ AI planning the physical
  night), the slip print-sheet page, TTS house voice, costume portraits, paper-pack
  export, November's story content (unblocked — the surprise is WHO, not WHAT).

## For reviewers

The three questions worth pressure-testing, in order: **(1)** does the referee
actually prevent every state mutation the LLM could hallucinate (see
`lib/engine/referee.ts` — every tool case is a precondition list); **(2)** does RLS
really seal the secrets (try to query `frontman_player_id`, `sealed_story`, `codes`,
or another player's rows as an anonymous client); **(3)** does the no-elimination
accusation loop generate enough drama peaks (the October playtest question —
`docs/research-notes.md` has the theory). Verdicts, arguments, and marginalia
welcome directly in this file — it's co-edited by design.
