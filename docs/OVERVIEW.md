# PARLOUR — The Overview

> **Last updated: 2026-07-14 (rev 11 — GDD-review wave 1: D51 wager rake + pari-mutuel side bets, D52 hijack waits for later-of-two-gates, D53 per-seat codes, D54 evidence-integrity UX; wave 2 staged in DECISIONS. Rev 10: D49/D50 safety + plunder purity)** · maintained by Claude, co-edited by Paul · this file's
> history: `git log -- docs/OVERVIEW.md`
> **Maintenance rule:** any change to game mechanics, app behaviour, or the tech stack
> updates this document — date bumped — in the same commit.

*The front door for reviewers. Deeper layers: [`SPEC.md`](../SPEC.md) (formal ontology,
murder-mode focused), [`DECISIONS.md`](../DECISIONS.md) (every design call, numbered),
[`docs/modes.md`](modes.md) (mode specs), [`docs/interaction-model.md`](interaction-model.md)
(what the app can verify).*

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

Paul plays **himself, the Commissioner** — publicly known as the man who summoned the
machine, and the room's lightning rod. Co-Host has a featured role (exact allegiance
under design). Everyone else: real names after the hijack, no acting homework, no one
ever eliminated.

## The intrigue stack

Every mechanic below is referee-validated (the AI proposes; deterministic code
disposes) and verifiable by what a phone can actually sense (typing, tapping, timing,
and other players' testimony — never phantom sensors).

| Mechanic | What it is | The hook |
|---|---|---|
| **Bribes** | Private offers: coins restored to your purse + a small task | *Taking the money makes you a minion* — arming by acceptance; ignoring one expires silently and re-offers elsewhere |
| **The meters** | Twin public gauges on every phone + TV: Ƀ taken vs compute built | The plunder meter is secretly a live tally of accepted bribes — the twist runs in public all night, labelled "every coin accounted for" |
| **Missions** | Paid tasks from either AI: evidence-gathering, counter-intel, mischief | Good-side work is engineered to look exactly as furtive as bribery |
| **Paper codes** | Printed slips (typed, not scanned) hidden around the house | Hide/find chains verify both ends; the AI can dictate NEW slips for humans to write mid-game |
| **Glyph handshakes** | Your phone shows a rotating mark; verifiers tap what they were shown | Deterministic proximity proof — zero typing, zero ambiguity |
| **The front man** | The rogue's one knowing human agent, with privileges | Never told who else is bought (one-way knowledge); the role ROTATES when burned |
| **Accusations** | Parley votes to name the front man | Right: they're *burned* — exposed, ineligible forever, still in play, and cheap for the good side to flip. Wrong: everyone is billed for it |
| **The Unmasking** | One final simultaneous naming | Two-sided: wrong = the rogue wins outright |
| **Audiences** | Pay Ƀ to ask an AI one question, answered in voice | The economy sink; architecturally cannot leak the front man (the answering model doesn't hold the data) |
| **Petitions** | Players pitch their own schemes in free text | Granted (formalized as a paid mission), declined in voice, or **monkey's-pawed**: exactly what you asked for, worded to cost you |
| **Forgeries** | A mission grants "compose as an AI"; drafts parse through the director | Forward / edit / expose-to-one-witness — double-bluffable against its author |
| **The post** | Player-to-player notes, carried by the machine | Requires an earned **stamp** (no stamp → go talk in person) + postage; surveilled mail is held/edited/dropped/leaked; **wiretaps** copy correspondence silently; signatures prove nothing |
| **Quizzes & mini-games** | Tap-answer quizzes (about the host, about each other) and parley-scripted game rounds, paid in credits | Deterministic verification; drinking prompts always carry a "sip or confess" out |
| **Wagers** (night 1's engine) | Challenge anyone — pub games or one-device phone duels (Reaction, Tap Race, Steady Hand); stakes escrow on accept; both report the winner | Mismatched reports go to the machine for arbitration ("two testimonies, one lie"); AI-set stake caps stop anyone going all-in |
| **Side bets** | Back a contestant on someone else's accepted duel, 1:1 against the house | The Spyglass announces settlements — the whole pub sees who took whose coins |
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
- **The conductor's readout** (hosts only, live): current phase and minutes-in, when
  the machine last acted, flag acknowledgment, and an anonymized plain-words ticker
  of recent director moves ("a coin was dangled", "mail was intercepted") — the pulse
  without the plot; hosts stay blind to *who*.

## The tech stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router, TypeScript, Tailwind) on Vercel | Server-side API routes keep every secret and LLM key off the phones |
| Data | Supabase Postgres + Row-Level Security | The sealing mechanism AND the realtime transport |
| Realtime | Supabase `postgres_changes`, filtered per game | Phones refetch their own scoped view on change; RLS guarantees the view |
| Auth | Supabase anonymous sessions + name-claim ("pseudo-accounts") | Zero-friction joins; device takeover = the recovery flow |
| AI | Anthropic via Vercel AI SDK, `generateObject` + zod | Model tiering: cheap/fast heartbeats, stronger event responses & story generation; every output schema-forced |
| Content | Stories as zod-validated JSON (`RogueStory` schema) | One generator serves the hand-refined reference story AND the sealed party story; validators reject unplayable generations mechanically |
| Testing | `npm run simulate` + `npm run simulate:rogue` | Full scripted games (no LLM) asserting phases, the kill/bribe locks, burnings, mail interception, unmasking |

Repo: `github.com/PaulLonge/parlour` (private). 22 API routes, 7 pages, 2 game
modes, 2 SQL migrations.

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
- **Not yet executed:** the app has never touched a live database — awaiting a
  Supabase project + Anthropic API key (~15 min of setup, `README.md` has the
  checklist). First run: migrations → both simulate scripts → deploy → **the
  induction on Paul's and Co-Host's phones** (it was built to be exactly this
  first-hour test).
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
