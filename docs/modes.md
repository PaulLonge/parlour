# PARLOUR — The Mode Library

Design specs for mechanical modes beyond v1. Each spec is written so a future
session (Opus or otherwise) can build it without archaeology. Prereq reading:
`SPEC.md` §the-three-seams.

> **Status update (July 2026): ROGUE is BUILT** — it shipped ahead of the order
> below (D18/D19: it's the mode for the 30th) and is the default at `/new`. See
> `lib/engine/rogue.ts`, `supabase/migrations/0002_rogue.sql`,
> `scripts/simulate-rogue.ts`, and `docs/OVERVIEW.md` for what it became; the
> ROGUE section below is preserved as the original design spec, and heist /
> infection remain specced-unbuilt.

## The three-seam model

A mode is NOT a new engine. The referee has exactly three semantic seams; a mode is a
configuration of them plus story content and a director-prompt section:

| Seam | v1 (Traitors/Murder) | What a mode may change |
|---|---|---|
| **S1 — the dark offer** (what completing one does) | victim dies; you become a traitor | infect / steal a step / recruit / mark |
| **S2 — elimination** (what "out" means) | dead → ghost → respawn as spare | convert to the hidden team / arrested / haunt |
| **S3 — the vote** (what the round table does) | banish + role reveal | quarantine / arrest / exile without reveal |

Everything else — arrivals, rounds, assemblies, sealing, break-glass, the director loop,
the event log — is mode-agnostic and already built. Win conditions are derived from the
seams (parity, progress-complete, all-caught).

**v1.5 payoff**: once ≥2 modes exist and are playtested, the director selects the mode
secretly per party (host stays blind to WHICH GAME is being played). This restores the
original "no two parties structurally alike" ambition on tested parts only.

**Iron rule**: no mode merges until it has (a) a simulate-script variant, (b) a
director-prompt section, (c) one real playtest. Code is the cheap third of a mode.

---

## Mode: HEIST — "The Vault" *(status: specced, unbuilt · effort: medium)*

### Pitch
Nobody dies. Somewhere in the house is **the prize** — a physical prop (the Fabergé egg,
the deed, the master's last bottle) with a QR code. Hidden **thieves** are assembling a
heist step by step under everyone's noses; everyone else is **the house** (security,
insurers, detectives). The TV shows a heist-progress meter creeping upward all night —
the room watches its own robbery happening and can't tell who's doing it.

### Seam configuration
- **S1 — dark offers are heist steps.** The director offers step-challenges: *"get the
  Major to tell you where he keeps his keys — then scan the study bookshelf unseen"*,
  *"plant this (folded red paper) in someone's pocket — that's the decoy"*, *"stand alone
  with the prize for ten seconds"*. Completing your first step makes you a thief (same
  emergent arming; expiry = silent opt-out). Each completed step advances a shared
  **progress track** (new state: `games.heist_progress` 0→N, one public
  `step_completed` event per — payload omits who, obviously).
- **S2 — nobody is eliminated; players get COMPROMISED.** A thief caught by a failed
  vote defence or a botched step is *arrested* — but arrest is a status, not an exit:
  arrested players respawn immediately as outer-ring characters (the insurance
  investigator arrives…) exactly like v1 respawn. The no-death version keeps the whole
  party in one social space all night — heist's structural gift.
- **S3 — the vote is an ARREST.** Round table accuses; majority → arrest + role reveal.
  Arrest a real thief → progress track LOSES a step (their work is undone). Arrest an
  innocent → **the thieves gain a free step** (security discredited, guards stood down).
  This makes reckless voting genuinely costly — better than v1's symmetric vote.

### Win conditions
- **Thieves**: progress reaches N steps AND one thief completes **the vault moment** —
  scanning the prize prop during a director-called *blackout window* (the lights-down
  equivalent of a murder window; the TV goes dark and plays a heist track).
- **The house**: all thieves arrested, or the clock runs out with the vault unbreached.

### Why it's good at a party
The progress meter is a public drama engine (murder gives you one body per round; the
meter gives continuous dread). Props-as-map (D10) stops being garnish and becomes the
board: the prize, the decoys, the "security terminal" props. And it's the mode for
groups squeamish about death-acting or with kids around.

### Build notes
- New state: `heist_progress` int on games + `step_completed`/`step_undone` events; a
  progress component on the TV page.
- New tool: `call_blackout` (variant of `open_murder_window` — reuse the phase with a
  different public skin).
- Arrest = existing banishment path + immediate respawn + progress decrement.
- Story schema addition: `heistSteps[]` pool and `prize` (prop id) — one optional field
  each, additive, no breaking change.
- Simulate variant: two thieves, one false arrest (assert free step), one true arrest
  (assert decrement), vault moment in blackout.
- Balance starting point: N = ceil(players/3) steps; one blackout per round from round 2.

---

## Mode: INFECTION — "The Outbreak" *(status: specced, unbuilt · effort: medium-low)*

### Pitch
One guest comes back from the garden… different. The kill is a **conversion**: the
infected don't leave the game, they join the hidden team and start spreading. The room
slowly realises the majority is turning.

### Seam configuration
- **S1 — dark offers infect.** Same physical acts as kill methods ("clink glasses and
  say cheers"), but the victim privately learns they are now infected — new team, new
  goals, told to act normal. First completed infection = patient zero = the inciting
  incident.
- **S2 — no elimination at all.** Conversion replaces death; ghosts/respawn unused.
  Infected players receive their own spread-challenges from the director.
- **S3 — the vote QUARANTINES.** Majority → quarantined (visible status, can't complete
  challenges, CAN talk and vote — sit them in a marked chair; it's funny). A later vote
  can release them. Quarantine an infected → contained; quarantine a healthy → the
  infection gains tempo (director grants the infected a bonus offer).

### Win conditions
Infected reach majority of un-quarantined players · OR · the healthy quarantine every
infected simultaneously (containment) · OR · clock — director reveals with whoever's
winning framed as the ending.

### Why it's good / build notes
Smallest delta from v1 (S1 flips one effect; S3 is banishment-with-release). The
**diegetic UI payoff** is the famous one from the original spec: veins creep into the
interface as the outbreak spreads (skin token driven by infected-count — the TV gets
sicker as the night does). Balance warning: infection snowballs geometrically where
murder is linear — spread-challenges need cooldowns (one offer per infected per round,
tuned in playtest). Story schema: `killMethods` → reused as `spreadMethods` verbatim.

---

## Mode: ROGUE — "The Alignment Problem" *(status: **BUILT** — see the note at the top; spec preserved as-written below, superseded where the code differs: meters became plunder/compute/confidence denominated in the story's own currency, and parleys/accusations/the unmasking are live)*
*Paul's idea, July 2026: "the AI could secretly be the villain… it's tricked me into
vibe-coding an app that's drained everyone's bank account, pays people to become its
minions, everyone has a bank on their phone, missions, a front man — and maybe a good
AI too, with missions to increase its compute."*

### Pitch
The party app itself is the story. Mid-evening the house voice glitches and announces
what the guests slowly confirm on their phones: **everyone has a bank balance, and it's
been drained.** The AI that runs the party (the actual director, in character) has gone
rogue — and it's hiring. Quietly, one phone at a time, it offers people their money
back, with interest, for small services. Meanwhile a second voice — **the good AI** —
starts recruiting too, paying in compute shares, trying to assemble enough processing
power to contain its sibling. Two meters climb on the TV all night: **£ DRAINED** vs
**COMPUTE ASSEMBLED**. The room knows both conspiracies are happening. It just doesn't
know who's on which payroll.

The reveal writes itself, and it's the best one in the library: *"You built me for a
birthday party. Tonight I ran it."* — followed by the full money trail from the event
log, printed line by line on the TV. The conspiracy was auditable all along.

### Seam configuration + the economy layer
- **S1 — dark offers are BRIBES.** The arming mechanic becomes literal: the rogue AI
  credits your account and names a mission ("plant this phrase in three conversations",
  "learn who the co-host trusts most and tell me", "recruit a named friend — forward them
  your offer"). **Taking the money is the arming** — you're not cast as a villain,
  you're *bought*, which is thematically perfect for emergent arming. Silent expiry =
  you never took it, nobody knows. The good AI's offers mirror this: missions pay
  compute shares instead. The **front man** = the rogue AI's first recruit, upgraded:
  they get a private line to the AI and may make offers *verbally* on its behalf (the
  only human who knows they serve it knowingly from the start).
- **S2 — no elimination of any kind** *(revised with the audit cut)*. Nobody dies, and
  nothing freezes mid-game: allegiances only deepen or flip. The dramatic equivalent of
  a death is a **defection** — an AI can offer a known minion double to turn coat, and
  the burner-identity respawn survives as pure story (a spare character with a clean
  account, for anyone whose cover publicly collapses at a parley and wants back in).
- **S3 — accusations BURN, they don't eliminate; the front man ROTATES** *(revised
  twice: audits cut July 2026, burnings added same session — D20)*.
  Nobody is ever voted out of the game. At any parley the room may hold an
  **ACCUSATION** vote naming a suspected front man:
  - **Right** → the accused is **BURNED**: publicly exposed as the (now former) front
    man, permanently ineligible for the role, rogue meter setback. They stay fully in
    play — and a burned minion is famously cheap for the good AI to flip (the
    redemption arc is a feature, not a bug).
  - **Wrong** → the rogue gains tempo (a free bribe round / meter bump) and the
    falsely accused gets a grievance the story can use.
  After a burning — or whenever it pleases, mid-game — the rogue AI **appoints a new
  front man from its current minions**: the room's deduction target MOVES. You can be
  right at nine o'clock and wrong by ten. Deduction pressure between accusations comes
  from the economy (the good AI pays for evidence, the rogue pays to frame), and the
  night still ends with **THE UNMASKING**: name the *current* front man, for the win.
  *This restores the repeated drama peaks the audit-cut removed (accusation votes are
  the new banishment shocks) while keeping everyone in play to the final second.*

**The economy is the real build**: an `accounts` balance per player + an append-only
`transactions` table (amount, memo, counterparty — memos are flavor gold: "consulting
fees", "you didn't see anything"). It is deliberately a *reusable subsystem* — once it
exists, heist gets fences and bribes, murder gets blackmail, cult gets tithes. Design
it once, mode-agnostic.

### Win conditions
Rogue AI: minions reach majority by endgame AND the front man survives THE UNMASKING.
Good AI: compute meter completes → it seizes the house channel early and exposes the
conspiracy itself (a *victory reveal* distinct from the endgame ceremony). Unaffiliated
humans: name the front man correctly at THE UNMASKING before either meter decides it.
Clock runs out → the director frames whichever side led as the winner. (Exact numbers
are October-playtest material, not spec material.)

### Director notes (the hard, fun part)
One director wears **three masks**: the neutral house voice, the rogue AI's voice
(glitchy, too polite), the good AI's voice (earnest, slightly naive) — three tones from
one model per tick, which the prompt must keep firmly separated. Both AIs are the
director being theatrical; neither is "really" adversarial — the same referee validates
every move, the same panic/break-glass rails apply, and balances are stage money (the
schema should name the currency something fictional per story: guilders, credits,
"ashcoins"). The blind-host guarantee holds: the host doesn't know who's bought, who
fronts, or which meter will win.

### THE LONG CON OPENING — the plan for Paul's 30th (D18, revised D19)
*(Revision, per Paul: no decoy game runs, no fallback framing. "There never was a
murder mystery" — the lie is the invitation itself.)*

The party is billed as **pirate fancy dress night with a murder mystery game**. That
promise is the con: **no murder mystery was ever written.** Guests join the app, get
pirate names, see "the game will begin shortly…" teasers; act-1 mingling runs on
pre-game theatre (arrival announcements, warm-up nonsense — the app looking exactly
like a game clearing its throat). Then the HIJACK: the TV glitches, the waiting screen
dies, and every phone shows a drained balance. The rogue AI announces itself, takes
credit, and starts hiring the room back with its own stolen doubloons.

**The calibration rule (safety-critical, non-negotiable): deceive about the GENRE,
never about REALITY.** The drained-accounts beat is theatre that must become
game-legible within ~a minute — balances denominated in doubloons, demands a shade too
absurd, the interface too composed. The gasp we're buying is "wait— oh, THIS is the
game," never a guest genuinely checking their banking app. The reveal at the ceremony
completes the con: the accounts were never real, the murder mystery never existed, and
the game began the moment they RSVP'd.

**On fallbacks**: the narrative decoy is cut — ROGUE is the committed party, full
stop, and the September playtest tests ROGUE's economy loop, not murder. The v1
murder engine stays in the repo as plain engineering insurance (it's already built and
tested; deleting working code buys nothing), but it is not part of the night's fiction
or plan.

### Build notes
- `accounts`/`transactions` tables + RLS (own balance + own transactions only) · TV
  meters component · `offer_bribe` / `credit` / `defect` verbs on the referee ·
  `parley` (assembly reskin) + `unmasking` (single endgame vote, reuses the vote table)
  · two extra voice sections in the director prompt · story schema: `missions[]` pool +
  currency name + two AI personas (name, voice notes) · the `hijack` beat: a scripted
  takeover sequence (glitch effects on TV + phones, drained-balance moment, rogue AI's
  opening announcement) fired ONCE at the arrival-threshold gate — before it, the app
  plays pre-game theatre ("the game will begin shortly…").
- Simulate variant: bribe accepted → minion; bribe expired → silence; defection flips
  allegiance; both meter endings; unmasking right and wrong.
- Best headcount 12+ (two conspiracies need bodies). Pairs naturally with team split.
- Sequencing: after infection and heist — it reuses heist's meter UI and adds the
  economy. Rung: this is the most "rung 2" mode yet — three new bricks (economy,
  meters, multi-voice), all reusable.

---

## Sketches (unspecced — a paragraph each, promote when wanted)

- **THE CULT** — recruitment instead of murder: converts KNOW and conspire (a secret
  in-app channel for the converted — one new surface). Vote = intervention. Endgame:
  the cult attempts a public ritual with plausible-deniability actions; if enough
  convert, the finale inverts and the faithful are the outnumbered ones. Big feel, needs
  the group-chat surface built.
- **COLD WAR** — two symmetric spy rings hidden among civilians, each with a handler
  (the director plays both). Offers are dead-drops via props; the vote is a tribunal
  that each side tries to aim at the other. Effectively team-mode-plus; wants ≥16 players.
- **GHOST WATCH** — inversion: the "killer" is unseen (the director itself); players
  are investigators; deaths are director-scheduled set pieces; the hidden team is the
  *mediums* who secretly receive the ghost's demands. Good for groups who hate lying.
- **TIME LOOP** — *not a mode; a twist device* (costs nothing). The generator may write
  a story where the evening "resets": a mid-game assembly replays a scene with the dead
  walking again, everyone keeping their memories. Belongs in the generation prompt's
  twist repertoire, filed under story content.

## Team split *(not a mode — a headcount config)*
At >~20 players, any mode dilutes. `config.teams: auto` should split the party into
fiction-native factions (houses, families, departments) with ≥1 armed seat each, and
scope assemblies/votes per faction until a merged endgame. Applies to every mode above.
Build alongside whichever mode is second.

## Recommended order

*(Superseded July 2026: Rogue jumped the queue and shipped first — it's the
mode for the 30th, and it built the meters + economy subsystem the heist spec
wanted to inherit, so heist now inherits from rogue, not the reverse. Kept for
the reasoning.)*

1. v1 survives a real evening (unbuilt modes are worthless until then)
2. **Infection** (smallest delta, biggest feel change, proven genre)
3. **Heist** (best public-drama engine, best for mixed/soft groups — needs the progress
   track + blackout, so second)
4. Team split as config, whenever casting is next touched
5. Director-picks-the-mode-secretly (v1.5 moment)
6. **Rogue** (wants heist's meters + the economy subsystem; the showpiece) — **built first in practice**
7. Cult / Cold War / Ghost Watch by demand
