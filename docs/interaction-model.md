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
| **GLYPH** *(D32/D41 — built)* | two humans met face-to-face, deterministically | "Get Co-Host to SHOW you her mark; tap it here" — per-player symbol rotates every 10 min, verified without any AI call |
| **CHOICE** *(D41 — built)* | knowledge, machine-scored | multiple-choice quiz (incl. the Commissioner's Interview bank); a `correctIndex` scores it instantly, no AI call |
| **CROSS-CONFIRMATION** | two humans corroborate | You're told to toast someone; their phone later asks "did anyone toast 'new management' at you? Who?" |
| **SUBMISSION** | knowledge/observation — expected-answer match first (D41: normalized edit distance), AI-judged only on misses/open answers | "Quote her answer word for word" / "Name who you think got a mission this round" |
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

Engine model: a `codes` table (code, game_id, kind slip/envelope/note, state:
printed/assigned/hidden/found/retired, hider, finder, timestamps — see
`0002_rogue.sql`) + missions referencing code ids. Every code event is an
events-log entry → the evidence drumbeat stays honest. (The host print-sheet
page is still backlog — codes are minted by the director/host tools for now.)

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

`config.personaWeight` *(designed, not yet a real config key — D29 superseded it
for ROGUE: personas die at the hijack regardless, and the pub night has no
personas at all; the dial becomes real if/when a second murder-mode party wants it)*:
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

## The setup loop — PDCA / OODA (D26)

Setup is a DIALOGUE, not a form. Before the party (and re-runnable any time):
1. **Plan** — the AI emits a requirements list from the story: what to print (slips,
   colors, codes), what props to place, what space it assumes.
2. **Do** — the host does what they can.
3. **Check** — the host reports reality in plain words ("only 12 slips, no garden,
   map's in the hallway; I recorded two villain clips").
4. **Act** — the AI re-plans to close the gap (fewer chains, re-routed hiding spots).
The check step continues DURING the night: missions that quietly verify the physical
layer ("type the code of any slip you've seen so far") tell the director which chains
actually exist.

## The public channel is an ABSTRACTION (D27)

There may be no TV. Capability profiles, declared in the setup loop:
- **screen** (TV/laptop): full Spyglass — meters, sigils, parley text, reveal ceremony.
- **audio** (phone → speaker): announcements as TTS/pre-recorded clips; no visuals.
- **announcer** (the host's loud voice): announcer cards, already built (I12).
- **phones-only fallback**: the twin meters ALSO live on every phone's home screen
  regardless — glanceable everywhere, and it makes "your bribe moved that meter"
  personal at the reveal.
Optional host media: the story schema gets slots for HOST-RECORDED CLIPS (e.g. Paul
costumed as the villain, welcoming guests) played at named beats when a screen exists.

## Message theatre (D28)

- Delivery presentation: typewriter reveal / voice-note-style animation (text only).
  Pure presentation layer on the existing messages table.
- Phone chrome stays allegiance-neutral (D22), but messages carry a **claimedSender**
  (CALICO / BOSUN / house) separate from true origin — one AI impersonating the other
  is CONTENT, and the forgery's tell (if any) lives in the text.
- **The hacked-AI mission**: a player earns a compose-as-an-AI box. Their draft parses
  THROUGH the director before delivery — which may forward it, edit it, or deliver it
  while quietly telling one other player it's forged (the double bluff on the author).
  Verification: SUBMISSION mode; the director adjudicates.

## The persona arc — personas die at the hijack (D29)

Act 1 runs LIGHT pirate personas (name, costume bit, two hooks) serving the cover
story. The hijack kills the fictional game and the personas with it — from then on
everyone plays as THEMSELVES (real names, real purses, real suspicion). Diegetic line:
"the script is gone; you're all just yourselves now — which was rather the point."
This supersedes the persona-weight dial for ROGUE (the dial remains for other modes)
and reduces the intake weave to act-1 hooks only.

## Sandbox mode — the host as all twenty guests (D30)

Admin-only test harness so the host can run an entire game solo from one phone:
- **possess-player switcher**: tabs/dropdown to act as any player (admin-issued).
- **time warp**: a config multiplier accelerating timers, expiries, and heartbeats.
- **verdict notes**: a scratch field per session for playtest observations.
First priority after go-live: it converts every remote evening into a playtest.

## November starts now (D31)

Per D24 (surprise = WHO, not WHAT), the November story can be authored and iterated
immediately — reading it costs Paul nothing. Real intake binds names to the cast at
close; with D29 the binding is light (act-1 hooks only). The reference story remains
the schema exemplar; November's content becomes a living document.
