# PARLOUR — The Mode Library

Design specs for mechanical modes beyond v1. Nothing here is built; each spec is
written so a future session (Opus or otherwise) can build it without archaeology.
Prereq reading: `SPEC.md` §the-three-seams.

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
1. v1 survives a real evening (unbuilt modes are worthless until then)
2. **Infection** (smallest delta, biggest feel change, proven genre)
3. **Heist** (best public-drama engine, best for mixed/soft groups — needs the progress
   track + blackout, so second)
4. Team split as config, whenever casting is next touched
5. Director-picks-the-mode-secretly (v1.5 moment)
6. Cult / Cold War / Ghost Watch by demand
