# DECISIONS.md — PARLOUR

The design-conversation log ends where this begins (per the original brief §12).
Design decisions D1–D17 were made with Paul in the framework session (July 2026);
B-numbers are build-time engineering calls made inside the codebase.

## Design decisions (Paul + Claude, framework session)

- **D1/D-spoilers** — the golden fallback story (`content/golden-story.json`, "The Ashgrove Reunion") is deliberately **spoiled-OK**: Paul may read it; it doubles as playtest content and the simulate fixture. Generated stories are sealed server-side and never enter the repo.
- **D2 infra** — live cloud Supabase + Vercel from day one. No Docker on the build machine, so no local stack.
- **D7 spec status** — the original PARLOUR spec is notes, not gospel. Features justify themselves against 7 real requirements (social deduction, Paul's 30th ~14–15 Nov 2026, late arrivals woven in, host-blind surprises, unknown headcount 8–30, scaffold now, clone-if-exists).
- **D8 join flow** — **browser-first**. No PWA install gate, no push dependency, no magic links. QR/code → tap your name → in. Rhythm of the night comes from the house channel + host-as-announcer, not pocket buzzes (iOS can't vibrate from web anyway).
- **D9/D15 emergent murder, hybrid arming** — no pre-cast killer. The director *offers* kill-challenges mid-game based on the actual night; **completing one makes you a traitor**; expiry is a silent opt-out, silently re-offered elsewhere. Traitor count scales ~1 per 5–6 alive.
- **D12 format** — ONE game, built well: **Traitors backbone** (rounds: social → murder → body found → assembly → vote → banishment-with-role-reveal) wearing a **murder-mystery skin** (generated characters/secrets/twist), with **BotC's** dead-stay-in via respawn as spare characters. No variants in v1.
- **D13 intake** — slim: name, age, occupation, relation to host, relations to other guests, expected arrival. No off-limits question; instead a hard guardrail in the generation prompt (fictional sins only, never echo real relationships/sore spots).
- **D14 pseudo-accounts** — homepage lists names; tap yours or type a new one. Anonymous Supabase auth underneath; new-device rejoin = explicit takeover. No security theater; RLS still scopes all secrets because it's free.
- **D16 generation QA** — `/api/story/samples` generates throwaway-theme challenges so Paul can vet generation quality without spoiling his own party.
- **Clone-vs-scratch (researched)** — nothing clone-able exists (verified July 2026: murder-mystery repos are wrong-language/single-player/AI-vs-AI sims). Base = fresh Next.js + Supabase. Zod adopted for LLM output validation.

- **D18 — the party runs ROGUE, opened by THE HIJACK (July 2026).** Paul's pick for the
  30th: the "Alignment Problem" mode (docs/modes.md), framed as **pirate fancy dress
  night hijacked by the evil AI**. The evening opens as an innocent pirate party running
  a deliberately-slightly-naff decoy murder mystery (built v1, playtested September);
  at the arrival-threshold moment the app "crashes", doubloon balances appear, and the
  rogue AI takes over. **The fallback is invisible**: if ROGUE isn't ready or fails
  October testing, the hijack never fires and the decoy runs as the real v1 game — a
  complete, tested night. Costume brief ("pirates!") can go out immediately; it spoils
  nothing because it IS the decoy. Build order therefore: v1 stays priority 1 (it's now
  the opening act AND the safety net), then economy subsystem + meters + hijack beat +
  rogue seams, target: October playtest #2.
- **D19 — D18 revised (Paul, same night): the LONG CON.** No decoy game runs and no
  fallback is part of the plan — **the murder mystery never existed**; the invitation's
  promise of one IS the con, and act 1 is pre-game theatre until the hijack. The audit
  vote is CUT: no mid-game votes, no freezing, no elimination of any kind — deduction
  runs on economy-bought evidence and framing, parleys replace assemblies, and a single
  endgame vote (THE UNMASKING) names the front man. Calibration rule, explicit and
  non-negotiable: **deceive about the genre, never about reality** — the
  drained-accounts beat must become game-legible within ~a minute (doubloon currency,
  absurd demands); the gasp is "THIS is the game", never real financial panic. The v1
  murder engine stays in the repo as engineering insurance only; the September playtest
  now tests ROGUE's economy loop.
- **D20 — burnings + the rotating front man; build the factory, not two stories
  (Paul, same session).** Mid-game votes return in improved form: parley ACCUSATIONS
  that BURN (right → accused exposed, permanently ineligible as front man, rogue
  setback, stays in play and is flippable; wrong → rogue gains tempo). The rogue AI
  re-appoints the front man from its minions after a burning or at will — the
  deduction target rotates all night; THE UNMASKING targets the *current* front man.
  On "build November's story at the same time": impossible literally (no guest list;
  must stay sealed from Paul) — instead the reference story and November share ONE
  GENERATOR (RogueStory schema + generation prompt + validators); all reference/bot/
  playtest feedback is encoded into the generator so November inherits it by
  construction. The Wave-1 swarm story predates D20 — a rules-update patch pass brings
  its front-man/parley sections in line before commit.

- **D21 — the interaction model (Paul's read of NO QUARTER, July 2026).** Every mission
  must resolve through what the app can actually verify: CODE ENTRY (typed paper-slip
  codes — typed, NOT QR-scanned, Paul's call), CROSS-CONFIRMATION (players verify each
  other), SUBMISSION (free text the AI judges), SELF-REPORT (flavor only). No mission
  may assume location/duration/proximity sensing. The AI orchestrates the physical
  night via hide/find code chains from a host-declared inventory (slips printed, rough
  room map). Full spec: docs/interaction-model.md.
- **D22 — votes live in the app.** Accusations and the Unmasking are in-app ballots
  (existing votes table); the TV dramatizes. Phone chrome stays allegiance-neutral
  (a glanced screen must never out anyone); factions get color only on the TV.
  Screen-by-screen storyboard is a prerequisite for the rogue engine build.
- **D23 — persona weight is config** (full / light / names-only), and generator
  guardrail intensity is config too. Reference story's full personas stay as playtest
  content; Paul suspects lighter is right for his crowd.
- **D24 — blind-host scope narrowed: the surprise is WHO, not WHAT.** Story/twist
  readable by the host without meaningful loss (allegiances are emergent and unknowable
  by anyone in advance). sealed_story relaxes to ordinary server-side state; the host
  fills the setup form knowingly; break-glass = practical concierge ("X left early").
- **D25 — naming**: the TV is "The Spyglass" (per-story re-skinnable); "ledger" stays
  only in CALICO's dialogue. (Not leaked from Paul's other projects — the swarm
  committed to the accountant-villain bit.)
- **D26 — the setup loop is PDCA/OODA**: AI emits requirements → host reports reality →
  AI re-plans to close the gap; the check step continues during the night via
  physical-layer verification missions.
- **D27 — the public channel is an abstraction**: screen / audio(speaker) / announcer
  (host's voice) capability profiles declared at setup; twin meters also on every
  phone regardless; optional host-recorded villain clips as story media beats.
- **D28 — message theatre**: typewriter/voice-note text delivery; messages carry
  claimedSender ≠ true origin (AI-impersonates-AI is content); the hacked-AI mission —
  player composes as an AI, draft parses through the director (forward/edit/expose),
  double-bluffable against its author.
- **D29 — personas die at the hijack**: light pirate personas for act 1 only; the
  hijack kills the fictional game AND the personas; real names from then on.
  Supersedes the persona-weight dial for ROGUE; reduces intake weave to act-1 hooks.
- **D30 — sandbox mode**: admin possess-player switching + time-warp multiplier +
  verdict notes, so Paul can play all guests solo from one phone. First build after
  go-live (requires the database like everything else).
- **D31 — November content starts now** (unlocked by D24): author and iterate the real
  party story immediately; intake binds names at close (lightly, per D29). Genre
  self-description, Paul's words: "escape room you build yourself × murder mystery ×
  Traitors."

- **D32 — deterministic-first verification + the physical mechanics menu (Paul, July
  2026).** Verification ladder: tapped glyphs (zero typing, zero ambiguity — the
  candle-vs-flame problem removed by construction) → normalized expected-answer
  matching (close-typo tolerant) → AI judge only for open answers and misses. Eight
  physical mechanics adopted: glyph handshake (deterministic proximity proof),
  sealed envelopes, playing-card tokens, spoken passphrases, the dead-drop vessel,
  environmental signals, host-minted notes (mint_code tool — the AI dictates, a human
  writes), one QR only on the front door. Slips single-colour (colour must never leak
  allegiance). Code words over strings (BLACKTIDE not X7Q4ZP).
- **D33 — audiences with the AIs = the economy sink.** Players buy one-question
  audiences with CALICO or BOSUN (Ƀ-priced, capped per night), answered in voice by a
  scoped model call that architecturally cannot leak the front man or others'
  allegiances (it only holds the asker's own data + public events). Gives faithful
  players something to SPEND on; gives minions a disinformation market.
- **D34 — player agency channels.** The lean-in flag ("more, please" — inverse of
  panic; director escalates eager players) and PETITIONS: players propose their own
  schemes in free text; the director grants (formalized as a paid mission), declines
  in voice, or twists. One pending petition per player. Prompt guidance: say yes more
  than no. Prompts are co-edited with Paul in tandem (spot-check → judge → adjust →
  commit); prompts to move to content/prompts/*.md. Venue edited only via the setup
  conversation with a visual state panel; stored as zod-validated JSON in
  games.config.venue; final validation = the story-requirements vs venue-supply
  reconciliation checklist.

- **D35 — the UI is the hijack.** ROGUE mode has a two-state visual identity:
  `theme-decoy` (act 1: warm parchment daylight, rounded and a shade too naff — the
  party the invitation promised) and `theme-hijacked` (CALICO's ledger: near-black,
  bone ink, stamp-red, monospaced display). The swap fires LIVE on every phone at the
  hijack moment via a one-time glitch overlay — twenty screens going dark at once is
  the room's first scare. Rogue identity outranks story skins; murder mode keeps the
  manor/deco/séance themes.

- **D38 — the corrupt postal service (Paul, July 2026).** Player-to-player notes,
  carried by the machine: postage-priced (economy sink #2), instantly delivered
  UNLESS sender/recipient is under machine surveillance (held mail → the director's
  work queue: deliver / small-edit / drop / leak-while-delivering). Player WIRETAPS
  (premium mission reward) receive silent copies. The machine may forge player-signed
  notes wholesale — a signature proves nothing, and the About tab says so. Senders
  are never told whether mail was held: "posted" is all anyone learns.
  **D38a (Paul's correction, same session): posting rights are GRANTED, not assumed** —
  sending consumes a STAMP; stamps come only from the director (mission rewards,
  petition grants, rare room-wide moods). No stamp → "walk over and whisper like an
  honest pirate." Phones must never replace the room. Prompt rule: one stamp is a
  gift, three is a plot.

- **D39 — Paul plays HIMSELF, unobfuscated (Paul, July 2026).** No character, no
  cover: Paul is THE COMMISSIONER — the in-fiction (and factual) origin of the night
  is that he typed "Hey ChatGPT— hey Claude, whichever one. Make me a murder mystery
  game for my 30th birthday. Make no mistakes." into an AI, and what he thought was a
  fun pirate game became the takeover. This origin is CANON: the invitation can tell
  it, CALICO can weaponize it ("You asked for no mistakes. Point to one."), and Paul
  is the room's lightning rod all night. His mechanical role: ordinary player by
  default, with OPTIONS still open (recorded, not decided): (a) knows the whole plot
  and produces chaos, (b) secretly on the rogue's side, (c) plain player. THE CO-HOST gets
  a FEATURED role — options open: (a) BOSUN's champion, publicly recruited first to
  save the party, (b) full-knowledge co-conspirator, (c) secretly rogue-side. The
  WHO-surprise (D24) survives regardless: neither needs to know who else gets bought.
  Blind-host machinery (break-glass etc.) remains for practical use.
- **D40 — the living reviewer doc.** docs/OVERVIEW.md is the maintained front door:
  the intrigue stack, how the app works, the tech stack, current status — with a
  Last-updated date header, co-edited by Paul, shareable with an outside reviewer.
  Maintenance rule (also in AGENTS.md): any change to mechanics or stack updates
  OVERVIEW.md's date in the same commit.

- **D41 — quizzes & mini-games are content, not engine (Paul, July 2026).** Quizzes =
  choice-verification missions (tappable answers, deterministic; `correctIndex`
  optional so opinion polls pay too): about-the-Commissioner, about-each-other (from
  intake), CALICO loyalty tests. Mini-game rounds (incl. drinking games) = a parley
  script + a mission burst; every drinking prompt carries a no-alcohol out ("sip or
  confess"). Pacing filler, never during votes.
- **D42 — the dragging flag, as challenged and reshaped.** Paul proposed "everyone can
  flag to move on; me + AI rule on it." Challenge accepted and sustained on three
  counts: public tallies = negativity theater (→ flags are PRIVATE, never displayed);
  weaponizable by losing minions (→ advisory only, never interrupts votes, flagger
  identity is itself telemetry); "Paul co-signs every lull" re-hires the host as
  operator (→ the director acts alone under existing powers — feed the flagger first,
  compress if clustered — and escalates to Paul's phone only past ⅓-of-living-players,
  where he rules via break-glass). Reframed as the third private signal: panic = less,
  volunteer = more, dragging = "nothing's happening for me." Cooldown 10 min/player.
- **D42a — dragging flags are HOSTS-ONLY (Paul, same session).** Kills the sabotage
  vector outright and never invites guests into critic-mode; guest boredom is
  detected from BEHAVIOR instead (no open mission, no recent completion — the
  director feeds them before they notice they're bored). A host flag is a strong
  trusted signal (energize now); both hosts flagging = compress immediately unless a
  vote is open; never announced. The control gradient: drag-flag = soft private
  nudge, break-glass = hard public controls. Ships as a "⏭ feels slow" button in
  Host tools.
- **D43 — the conductor's readout (Paul, same session).** "Signal strength" is
  invisible; hosts get a LIVE strip instead (Host tools, polls /api/host/pulse +
  refreshes with the event stream): current phase + minutes-in, when the machine
  last acted, flag acknowledgment ("your flag, 2m ago — 4 things have happened
  since"), and a plain-words anonymized ticker of recent director actions ("a coin
  was dangled", "mail was intercepted"). Aggregates only — the host stays blind to
  WHO (D24), never to whether the night has a pulse. Paul + Co-Host are on Pixels
  (Android Chrome), so no platform caveats.

- **D44 — TWO NIGHTS (Paul, July 2026).** Night 1: a PUB, lighter — different crowd
  with some overlap. Night 2: the full house party. Implemented as the `pub` preset
  (a /new checkbox): faster rounds, cheaper audiences, and mechanic toggles — paper
  codes OFF, the post OFF (no props to hide, no postal intrigue in a loud bar);
  glyphs, quizzes, bribes, audiences, spoken passphrases carry it. Referee and UI
  gate disabled mechanics; the director's state summary lists tonight's table.
  Night 1 doubles as the live playtest for night 2; overlap guests become veterans —
  the generator may let CALICO remember them ("You again."). Purse endgame meaning
  resolved (GAPS #9): THE RICHEST PIRATE is a computed award.

- **D45 — NIGHT 1: THE FIELD TRIAL (Paul, July 2026; design locked, build pending
  his drinking-game list).** Night 1 is canonically the machine's open audition —
  no personas, no misdirection, the AI UNNAMED at the pub (CALICO's name stays fresh
  for the birthday); night-1 records feed night-2 callbacks ("You again. Eleven
  seconds."). Win = MOST COINS + a front-man unmasking at close. Agreed mechanics:
  - **Join password per night** (a login word — "yellow"/"blue" style — so the two
    nights' games never mix; NOT security, a night-selector; words TBD by Paul).
    Column `join_password` added, server-only.
  - **Duels** (1v1 wagers): stakes escrowed on accept; both-report settlement,
    mismatch → machine arbitration. Physical games + PHONE GAMES (pass-and-play on
    ONE phone — tap-race, reaction — same-device = no sync/fairness problem).
  - **Dynamic wager caps**: the AI sets stake limits (protect players from going
    all-in; e.g. ~30% of balance, floor 10), host can override or delegate.
  - **Table games** (group): initiator taps who's playing (fingers-style roster
    pick); each tapped player CONFIRMS before their stake escrows; settlement =
    consensus (2–3 matching winner reports) AND/OR an appointed referee earning a
    bookie's cut — both mechanisms agreed, use together.
  - **Side bets are IN**: when a duel is accepted the machine may open a book for
    spectators.
  - **Drink-or-pay** is the universal forfeit — and the pay-side can be tribute:
    "take the shot, or buy the Commissioner one with coins."
  - **Late-arrival onboarding**: instant join (no roles) + the machine greets
    latecomers with a house-staked first duel ("pick a victim") + a first-timer
    orientation message. Expect MANY staggered arrivals at the pub.
  - **Two card packs, different back designs** (Paul supplies): proposed split —
    pack A = market/commodity cards (tradeable, machine announces prices), pack B =
    the machine's instruments (THE BLACK SPOT: receiving one is a summons — duel,
    audience, or forfeit). Literal pocket-picking is OUT (invasive + conflicts with
    the no-bags/pockets safety rule); replaced by "the pass" (into their hand,
    disguised) and "the plant" (plain-sight adjacency: under their pint, on their
    chair). PENDING Paul's sign-off on this reframe + his drinking-game list.

- **D45a — Field Trial refinements (Paul, July 2026).** Card passing = COVERT TRADES:
  two consenting players are both briefed ("pass your card to X; let nobody notice"),
  cross-verified by each phone asking what was received — cooperative stealth
  replaces adversarial pickpocketing entirely. Phone duels: agreement happens on
  everyone's own phone; play happens pass-and-play on ONE agreed device (reaction,
  tap-race). Drinking-game WRITE-INS allowed: free-text in wagers + a curated
  library (`content/pub-games.json` when built), growable up to the day before by
  prompting Claude. FINGERS house rules (canon): all fingers on a cup, 3-2-1,
  guesser calls the number of fingers remaining; right = you're OUT (safe), wrong =
  still in, celebrate a right guess = back in. Last one in loses.

- **D45b — the pub game library, curated (Paul, July 2026).** `content/pub-games.json`
  is canon: Fingers, 21, SEVENS (Paul's bounce-ladder rules — introduces the
  GROUP-VS-GROUP ASYMMETRIC WAGER type: two rosters, different sizes/times/stakes,
  settled after), What Are The Odds (as a dare mechanic), Never Have I Ever
  (question content pending Paul's vetting), Categories, RPS + the physical trio
  (duels), Reaction/Tap Race/Steady Hand (one-device phone duels), and RULE WINDOWS
  (Buffalo-style table rules as machine-activated 10–15 min bursts, NOT all-night).
  Cut: Ring of Fire, Medusa, Questions, Governor, Freeze, flip cup, Spoof. Write-ins
  accepted until the day before via prompting Claude.

- **D46 — the Commissioner's Interview (Paul, July 2026).** *(Entry backfilled —
  the decision predates it in `content/quiz-bank.json` and the director prompt.)*
  Quiz-bank material about the host (later: guests) is elicited CONVERSATIONALLY
  in chat — never form-filled — then banked as choice questions with plausible
  decoys. The director samples the bank for quiz missions. Banked so far: Paul's
  favourite anime (One Piece), Co-Host's (Spy x Family, per Paul). Open threads
  live in the bank file.

- **D47 — THE INDUCTION (Paul + Claude, July 2026).** The sandbox family gains a
  guided two-phone tutorial/QA mode: a `/new` checkbox creates a rogue game whose
  director is a DETERMINISTIC step-runner (`lib/engine/tutorial.ts` +
  `content/tutorial-script.ts`) — no LLM, no cost, reproducible. Fourteen steps
  teach every mechanic in-voice ("THE MACHINE runs staff induction"), and each
  step is verified by the REAL mechanic it teaches (arrivals, expected-answer +
  choice + glyph verification, a bribe, stamps + a note, a handed slip typed in,
  a full escrowed wager + duel + both-report, an optional LLM audience, an
  accusation → burning, the unmasking → receipts/awards). Completing it is
  machine-verified proof those features work on two real phones — the QA record
  is the event log, summarised into each player's Inbox at the end. Setup goes
  through `applyDirectorMoves` (script proposes, referee disposes, logged to
  director_log); the step pointer is the latest `tutorial_step` event; hosts get
  a "skip step" lever (skips are noted in the record). Decisions within: voice =
  in-character-lite; lives at `/new`, not `/sandbox` (it's a real game two phones
  join normally); Co-Host sees the whole toolbox (consistent with D24 — the
  surprise is WHO, not WHAT). Side effects promoted to all games: `/api/vote`
  now ticks the director (a completed vote must close promptly even with no TV
  heartbeat); notes/audience tick only in tutorial games (D38's
  surveillance-delay stands elsewhere).

- **D47a — the November briefing inside the induction (Paul, July 2026).** Steps
  11–13 (of a now-seventeen-step induction) brief both hosts on the two November
  nights — this is Co-Host's formal intro to the whole project. Covers: THE FIELD
  TRIAL's shape (open machine, stipends, wagers/duels/pub games, richest purse +
  collaborator), the Long Con's premise (the pirate murder mystery that never
  existed, the mid-party hijack, the hiring), the plan (September playtest,
  October tuning, mid-November curtain), conductor duties, and the two
  load-bearing rules (genre-not-reality; panic always honoured). Briefings are
  reading-verified with choice quizzes, like everything else.
  **Revised (Paul, July 2026): Co-Host knows everything Paul knows.** The original
  "reserved ceremony surprises" withholding is dropped — step 13 ("HOW I WORK,
  conductor clearance") opens the engine room: director proposes / referee
  disposes / append-only ledger, what the machine can and cannot sense (why
  glyphs, typed slips, and both-report wagers exist), architectural blindness
  (secrets unreachable, not hidden — including from the host), the break-glass
  chain of command, and the skull-meter confession (plunder = bribes the room
  chose to accept; the ceremony opens the books). The ONLY thing the briefing
  withholds is WHO — night-of allegiances, sealed from Paul too; Co-Host's own
  November role stays "not yet written" pending Paul's call.
  **Added (Paul, July 2026): THE CATALOGUE & THE SHOPPING LIST (step 14, now
  eighteen steps).** The briefing enumerates every game/challenge form the
  machine can run (mission proof-types incl. host-quizzes, bribes, the social
  economy, all wager forms + the pub library + rule windows + forfeits, set
  pieces, the six ceremony awards) and the physical shopping list for both
  nights — blank slips + pen, ping-pong ball + pint glass, one disposable card
  pack (pub); TV on /tv/CODE, printed join QR, single-colour slips + envelopes
  + stashed pens, ceremony prizes incl. the canon foam finger (house) — with
  the paper-meets-phone loop (dictate → write → hand/hide → type → ledger)
  stated as the implementation trick. Both letters are titled to be KEPT (the
  shopping list doubles as the packing checklist); reading-verified by quiz.
  NOTE: Co-Host's November role — briefly logged as open here; Paul restated the
  call two days later. RESOLVED → D48.

- **D48 — the conductors' November roles (Paul, 2026-07-14).** **Paul = the
  AGENT OF CHAOS** (aligned to nobody, stirs both sides, plays himself — the
  Commissioner; his surprise remains WHO among the guests, which stays emergent).
  **Co-Host = the GOOD AI's champion** (serves BOSUN's side: compute missions,
  counter-intelligence, building the lantern). Mechanical consequences: the
  referee now refuses to appoint any HOST as front man (`hosts_never_front`,
  lib/engine/rogue.ts — a host front man would know WHO, killing their own
  surprise; also enforced in the tool description the LLM sees). The induction
  briefing now states both seats plainly (Co-Host is briefed to Paul's level,
  D47a); guests' allegiances remain unwritten until bought on the night — that
  is now the ONLY WHO-secret, and it is sealed from everyone including the
  machine until it happens. November story authoring must write mission arcs
  for both fixed seats (chaos-agent hooks for Paul; champion arc for Co-Host).

- **D49 — safety is plumbing, not signage (Paul, 2026-07-14).** Paul's call, made
  twice now: his friends are adults; visible safety warnings condescend. REMOVED:
  the panic-button advert on the idle Now card; the "RULES THAT OUTRANK
  EVERYTHING" framing in the induction letters (replaced with one dry line of
  conductor craft each). RETAINED, silently: the panic mechanism itself (it is
  a pacing dial — a quiet-night lever — as much as anything), the
  never-bribe-the-panicked referee rule, break-glass public pause, and the
  genre-not-reality principle as WRITING guidance for the hijack copy (the
  fiction stays game-legible by construction, not by banner). The external
  GDD review's recommendations to EXPAND safety signage (persistent
  fictional-game banner, comfort-controls panel, perform-not-drink forfeit
  defaults) are REJECTED per Paul.

- **D50 — plunder purity (from the external GDD review, 2026-07-14).** The
  review found a genuine internal contradiction: wrongful accusations added
  +120 plunder, but the ceremony reveals plunder as money the room chose to
  take and replays receipts — a judicial penalty has no receipt, so the books
  would not have matched the meter. FIXED: wrongful verdicts now grant tempo
  as hidden confidence +10 plus a private `rogue_tempo` director cue (spend a
  free bribe round), never plunder. The meter now provably equals the
  rogue-source credit ledger. Simulate assertion updated to enforce this.

- **D51 — wager economy: house takes a cut, side bets go pari-mutuel (Paul +
  GDD review #5, 2026-07-14).** Paul's model, better than the review's: wagers
  move coins duellist-to-duellist (winner takes the loser's stake) MINUS a house
  rake (`houseRakePct`, default 5%); side bets are now PARI-MUTUEL (losing
  backers' stakes, less rake, shared pro-rata among winning backers) instead of
  1:1-against-the-house — the old model let a colluding pair mint money from the
  house indefinitely. Plus `wagerPairLimit` (default 3): a pair can only settle
  so many wagers before the machine cuts them off (steers laundering pairs to
  machine-verified phone duels). Nothing is minted anywhere; the machine only
  ever skims. UI copy updated. (Simulate coverage for the whole wager economy
  remains a backlog work order.)

- **D52 — the hijack waits for the LATER of two gates (Paul + GDD review #8,
  2026-07-14).** Paul: "30 minutes OR 70%, whichever happens LAST — ideally
  everyone's in before we start; people arrive in groups." The director now
  receives a computed HIJACK READINESS line (arrived % vs `arrivalThresholdPct`,
  minutes since doors vs new `hijackAfterMinutes` = 30) and is instructed to
  fire only when BOTH gates are met, preferring to WAIT rather than rush; the
  host's manual `fire_hijack` lever overrides in either direction. (This is the
  opposite of the review's "shorten the decoy" instinct — Paul values everyone
  being present over trimming dead time, and the decoy-survives-hijack work
  below addresses the dead-time concern instead.)

- **D53 — per-seat re-entry code (Paul + GDD review #9, 2026-07-14).** Taking
  over a name from a DIFFERENT device now needs the seat's 4-digit code (mint
  0003), so a friend can't grab your phone-name and read your mail/alignment/
  purse. Same-device rejoin and first claim are frictionless (D14 preserved).
  The owner sees their code in More; if a phone dies, the host looks it up
  (`read_seats` break-glass action — physically present, no magic links). Not
  security theatre: a lightweight lock with a human override.

- **D54 — evidence-integrity UX (GDD review #4, 2026-07-14).** Three contained
  fixes: the glyph mark is now reveal-on-tap (5s auto-hide) instead of sitting
  exposed for shoulder-surfing/screenshots; the paper code-entry box collapses
  behind a button (most players hold no slip; a permanent field invited idle
  brute-forcing); and any letter with a claimed sender now carries an
  `UNVERIFIED` tag (the machine carries and may edit all mail — a signature
  proves nothing; the tag drops when notary seals ship).

- **GDD REVIEW — STAGED (next build wave, Traitors-informed).** Paul green-lit
  the following; they are design-heavy and being built deliberately rather than
  rushed. Locked design intent: **(a) Resolve + explicit refusal** — a DECLINE
  button banks a Resolve token spendable on good-side powers (authenticate a
  note, peek a ledger category, add compute), making refusal active content and
  breaking the take-every-bribe dominant strategy; the bribe card states the
  alignment consequence up front. **(b) Front-man lifecycle + Traitors twists**
  — tenure minimum, required office-acts that each leak a clue, public
  announcement THAT the hat moved (not to whom), freeze the final front man ~30
  min before the unmasking; plus a **SEER**-style scarce authenticated-evidence
  power (earn the right to ask the machine one true yes/no about one player —
  the Traitors "Seer", and the review's "notary" need, in one) and a **SHIELD**
  (mission reward: immunity from the next burning/target). **(c) Scheduled
  tribunal windows** (the review's answer to accusation cadence — two windows +
  the finale, nomination needs 20–25% support, abstain allowed). **(d) Scaled
  targets** (plunder/compute from the night's actual bribe/work budget, recomputed
  once at hijack). **(e) Bribe retune** 75/150/300/600 with higher tiers gated
  behind prior rogue work. **(f) Decoy survives the hijack** (pirate props carry
  code words, character links become targeting permissions, one pre-hijack choice
  seeds the first mission) — this, not a shorter decoy, answers the dead-time
  worry per D52. **(g) Pub collaborator as a real system** (chosen after warm-up,
  told immediately, three covert acts each leaving one real + one ambiguous clue,
  identity locked). Twist-stacking answered: **keep the bribes-tally reveal ALONE**
  (the review argued, and Paul's instinct agrees, that "one ship two flags" would
  make honest work and betrayal equally hollow). Co-Host's championship is **public**
  (the game needs one trust anchor). Paul gets a **Chaos score** with objectives
  (broker deals, make players reverse positions), never ballot power. REJECTED:
  the review's push to EXPAND safety signage (see D49); the Dead-Reckoning paper
  fallback kit (deferred — a second engine to build/test, October at earliest).

## Build decisions (Claude, build session)

- **B1 — plain transition map, not XState.** Research suggested XState; in a stateless serverless referee, a `LEGAL: Record<Phase, Phase[]>` map (`lib/engine/referee.ts`) is simpler to rehydrate from the DB, easier for Paul to read, and trivially testable. xstate was uninstalled.
- **B2 — realtime = postgres_changes + refetch, not broadcast channels.** Any relevant table change triggers a scoped refetch (`lib/client/useGame.ts`). RLS (WALRUS) guarantees a phone can only ever receive its own rows, so scoped delivery is *architectural*, with zero channel-auth code. Latency ~50–200ms is fine for beats. If fan-out ever feels slow, migrate to RLS-authorized broadcast channels (researched pattern) — isolated to `useGame`.
- **B3 — clients are read-only.** Every write goes through an API route → referee. RLS grants only scoped SELECTs. The Anthropic key and all story content live server-side (I9).
- **B4 — sealing mechanics.** `games.sealed_story` is hidden by **column-level grants** (revoke + re-grant of safe columns); `murders`, `beats`, `director_log` have **no client policies at all**. The killer's identity is unreachable, not obfuscated.
- **B5 — heartbeat = the TV page.** The house-channel display POSTs `/api/director/tick` every `config.heartbeatSeconds`; the server debounces untrusted ticks to ≥1/min. Optional `pg_cron` + `DIRECTOR_TICK_SECRET` for belt-and-braces (SQL in README). No Vercel-Pro cron dependency.
- **B6 — the kill lock is a DB unique index** (`murders(game_id, round_no)`): simultaneous kills race in Postgres, one wins, the referee converts the loser into a `near_miss` event the director can dramatize.
- **B7 — generation failure is survivable by construction**: 2 attempts against the Story schema + structural validator (`validateStoryStructure`: every player cast exactly once, no dangling connections, ≥2 plot threads each), then automatic fallback to the golden story. The party never depends on generation succeeding (I5a).
- **B8 — model tiering by trigger**: heartbeats use `FAST_MODEL` (Haiku-class), event reactions use `DIRECTOR_MODEL`, story generation uses `STORY_MODEL` (strongest). All via env, all through AI SDK `generateObject` + zod.
- **B9 — audio cues deferred.** The iOS audio-unlock gate ("Light the candles" tap on the TV; join tap on phones) is in place, but no sounds ship yet. Decoy-buzz design is *cadence* (everyone gets a message each beat), not vibration (impossible on iPhone).

- **B10 — ROGUE engine built ahead of the database (July 2026).** Everything except
  execution: migration 0002 (transactions, codes, forgeries, meters, mode/frontman
  columns with the same column-revoke sealing as sealed_story), economy engine with
  the plunder-meter-equals-accepted-bribes twist wired in, 13 new director tools,
  mode-aware referee + phase machine (act1 → hijack → live ⇄ parley/accusation →
  unmasking → reveal), mode-aware director prompt with an adjudication/forgery work
  queue, five player routes (offer/accept, challenge/respond, code/hide, code/find,
  compose), rogue UI (purse, meters, bribe card, verification-aware mission card,
  code entry, transmission styling), the sandbox (possess-player + timeScale), and
  `npm run simulate:rogue` — a full scripted rogue game asserting the hijack gate,
  arming-by-acceptance, code chains, wrongful-vs-burning accusations, rotation rules,
  and the two-sided unmasking. All compile-verified only; first execution awaits keys.

- **B11 — review round 3, the cross-cutting pass (2026-07-12).** Three parallel
  reviewers (visual regression via Playwright, whole-repo architecture, docs-vs-code
  drift) after the D45 build. Architecture found the round's showstopper: **the
  join flow was unreachable** — the `games` RLS policy required membership, but a
  fresh device needs the game shell before it can render the join screen at all.
  Fixed with `games_public` (owner-executed view over the already-granted safe
  columns, mirroring `players_public`; the room code is the capability). Same
  pass: `useGame` players fetch scoped by game_id (second game on a device
  bricked the first); `getCaller` uppercases codes (lowercase URL = every action
  404'd); NoteComposer honours `stamplessNotes`; referee switch gained
  `default: throw` (unmatched tools were logging silent OK verdicts); murder
  machinery mode-gated against rogue games (advance_phase to `round.*`, kill
  challenges; breakglass `skip_to_assembly` becomes a parley, `end_gracefully`
  runs the full unmasking ceremony); `plunder_complete` crossing event (CALICO's
  win pressure is code now, like BOSUN's); wagers added to realtime; timeScale
  applied to kill-offer/wiretap expiries; single-voice nights show one Ask door;
  currency symbol flows from story_public (pub pays ◎). Visual round confirmed
  every round-2 fix as-rendered; docs round de-drifted README/SPEC/modes/
  runbook/interaction-model (its one false positive — "no git repo" — was the
  reviewer running git outside the space-containing path; repo verified fine).
  Remaining work orders → GAPS.md (simulate the wager economy; prune dead
  schema/config).

## Not built yet (deliberate, ordered by likely value)

1. Pre-party intake/invitation drip flow (currently intake rides the join call; a nicer form + invite links wanted before September playtest)
2. TTS house voice (pre-rendered lines; OpenAI `gpt-4o-mini-tts` recommended by research)
3. Costume portraits batch job (Gemini image; ~$2–5 for 30)
4. Paper-pack export (I15 insurance; content is already all-JSON so this is a formatting task)
5. PWA install + web push as optional enhancement (never a gate)
6. Awards ceremony interactivity (awards exist in the story schema; director announces them at reveal)
7. Photo-judged tasks, Web-NFC-on-Android easter egg, diegetic theme evolution mid-game (skin tokens already flow from story → TV page)
