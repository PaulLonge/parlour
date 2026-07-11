# PARLOUR — The Interaction Model (what the app can actually verify)

Born from Paul's feedback on the NO QUARTER reference story (July 2026): half the
swarm's missions assumed senses the app doesn't have ("stand near the TV for three
minutes"). This document is the corrective: **the app's only senses are what someone
types, what someone taps, when they do it, and what other people type about it.**
Every mission in every story must resolve through one of the verification modes below.
The generator prompt and the RogueStory schema must enforce this.

## Verification modes (strongest → weakest)

| Mode | What it proves | Example |
|---|---|---|
| **CODE ENTRY** | a physical event happened | "Type the code on the slip you found behind the map" |
| **CROSS-CONFIRMATION** | two humans corroborate | You're told to toast someone; their phone later asks "did anyone toast 'new management' at you? Who?" |
| **SUBMISSION** | knowledge/observation, AI-judged | "Quote her answer word for word" / "Name who you think got a mission this round" |
| **SELF-REPORT** | nothing (honor system) | "Done ✓" — allowed for flavor only, never for payouts above trivial |
| **PHOTO** *(future)* | visual evidence, vision-model judged | "Photograph the slip where you hid it" — deferred |

Design rule: **no mission may require the app to sense location, duration, proximity,
or attention.** Convert or cut: "stand near the TV" → "type the code shown in the
corner of the TV during the next parley" (code entry, and it rotates so it can't be
relayed).

## The paper-code system (D21 — codes are TYPED, not scanned)

Physical layer: colored paper slips, each printed with a short memorable code
(BLACKTIDE, GULLSWAKE...). Paul prints them from a host-pack page pre-party; QR
versions optional later, but typing won — faster, dim-light-proof, feels like a
password.

At setup the host tells the AI its physical inventory (via a setup form, readable
because the host is only blind to WHO, not WHAT — see D24):
- how many slips of which colors exist
- rough space map in plain words ("living room, kitchen, hallway, garden; big wall map;
  drinks table; bookshelf")

The AI then orchestrates the physical night as CHAINS:
- **Hide chains**: guest A's mission = "hide slip BLACKTIDE behind the wall map";
  guest B's later mission = "something is hidden near the map — type what you find."
  A is verified when B types the code. B is verified by the code itself.
- **Dead drops**: minion-to-minion handoffs without meeting.
- **Planted evidence**: a slip appearing where a parley says to look ("beneath the
  knitting queen's chair").
- **Rotating screen codes**: the TV shows a short code during specific beats; typing it
  proves presence-at-that-moment (the only legal "location" mechanic).

Engine model: a `codes` table (code, game_id, state: unplaced/hidden/found, hider,
finder, timestamps) + missions referencing code ids. Every code event is an events-log
entry → the evidence drumbeat stays honest.

## In-app voting & the screen question (D22)

- All votes (accusations, the Unmasking) happen IN THE APP against the existing votes
  table; the TV dramatizes (countdown, drum roll, result). No more "everyone points" —
  theatrical mechanics must have digital spines.
- TV layout: two factions, two meters, two colors (blue/red or per-skin).
- PHONE layout stays allegiance-neutral: everyone sees both factions' propaganda;
  your side lives in content (who pays you), never in chrome color — a glanced screen
  must not out anyone. Screen-by-screen storyboard is a prerequisite work item for the
  rogue engine build: phone (home / mission card / code entry / vote / purse) and
  TV (meters / parley / unmasking / reveal).

## Persona weight is a dial (D23)

`config.personaWeight`:
- `full` — the NO QUARTER treatment: backstory, secret, mannerism, costume bit.
- `light` — a name, a costume bit, two hooks. No homework. (Likely right for Paul's crowd; September playtest decides.)
- `names` — guests are themselves, with purses and missions. Zero acting burden.
The generator produces any weight; the reference story's full personas remain valid
playtest content. Guardrail *intensity* in the generator prompt also becomes config —
the genre-vs-reality rule is invariant, the interpersonal padding is not (known
friends ≠ strangers).

## What "blind host" actually protects (D24)

The host's surprise = **WHO** (allegiances, front man, who flipped, who sold out) —
which is emergent and unknowable in advance by anyone, including the AI. The story
itself (setting, twist device, scripts) is readable by the host without meaningful
loss. Consequences: sealed_story relaxes to ordinary server-side state (still not
pushed to clients); the host may fill in the setup form with full knowledge of props
and space; break-glass is reframed as the practical concierge ("X left early, write
them out") rather than a dramatic seal.

## Naming (D25)

The TV is **The Spyglass** (working name; host may re-skin per story). "Ledger" is
CALICO's vocabulary, not furniture — keep it in dialogue, remove it from UI names.
