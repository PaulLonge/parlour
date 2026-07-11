# PARLOUR — Host Run-book

The practical guide: what to do when, what to print, what to say, what to do when it
breaks. Written for Paul's 30th but generic to any PARLOUR evening. The host is a blind
player — this run-book contains **zero spoilers** and never will; it's safe to read.

---

## Timeline

### Now → 8 weeks out
- [ ] Go live (README setup): Supabase project, env keys, Vercel deploy, `npm run simulate` green
- [ ] Pick the visual theme (`/preview`)
- [ ] Vet generation quality: 2–3 batches from `/api/story/samples`, read in good faith
      — are the challenges fun? would YOU do them drunk? Tune prompts if not.

### ~8 weeks out (September): the playtest
- [ ] 6–8 friends, phones, one TV, 90 minutes, golden story (it's the tested one)
- [ ] Deliberately break things: kill a phone mid-game (rejoin by name), have someone
      arrive 30 min "late" (entrance beat), press panic once (quietly check it eased off)
- [ ] Watch `director_log` afterwards — read the AI's reasoning through the evening
- [ ] Tune `config`: round minutes, arming rate, drunk curve — from evidence, not vibes

### 4 weeks out
- [ ] Send invitations (template below) with the join link — intake trickles in
- [ ] Chase intake stragglers at 2 weeks ("no quiz, no character — you'll get the spare
      nobody wanted", affectionately)

### 1 week out
- [ ] Close intake; tap **Write & seal the story** — from here you know the title,
      the setting, and nothing else. So does everyone.
- [ ] Send the setting + costume note to guests (the app's public meta IS the brief)
- [ ] Print the pack (below); buy/place props if the story's mode uses them

### Party day (60–90 min before doors)
- [ ] TV/laptop on the house channel (`/tv/CODE`), tap *Light the candles*, leave it
- [ ] Door QR (the join link) printed at the entrance; second copy by the drinks
- [ ] Wifi password ON the door QR sheet (guests on mobile data are fine too)
- [ ] Prop QRs placed if used; tape them where drunk hands won't relocate them
- [ ] Your phone + co-host's phone: both joined, break-glass sighted (don't open it —
      opening is public)
- [ ] Charge a spare phone/tablet — it's the loaner for whoever's battery dies

### During
You are a **player**. Play. The only host duties: read announcer cards aloud when your
phone hands them to you (big voice, milk it), and break glass only for a real problem —
a crying guest, a broken night. Not for "the pacing feels slow" (the director sees the
clock; trust it or compress once and trust it again).

### After
- [ ] `events` table = the whole night in order; `director_log` = why. Read with coffee.
- [ ] Note what to tune while it's fresh; file issues on the repo.

---

## The print pack
1. **Door sheet** ×2 — big QR of the join link, the room code in huge type, wifi
   password, one line: *"Scan. Tap your name. Trust no one."*
2. **Prop cards** (if used) — QR + a themed label ("the study bookshelf"), laminated or
   in card sleeves; blu-tack + tape.
3. **Paper fallback pack** (when built — see DECISIONS not-built list): sealed
   envelopes per guest. Until then, the fallback is: phones + the golden story are
   robust; a total internet failure means charades, and you were having a party anyway.

## Message templates

**Invitation** (with join link):
> You're invited to [TITLE] — [DATE], [ADDRESS]. It's a party inside a game: everyone
> gets a secret character written for them by an AI that answers to nobody, including
> me. I'm playing blind too. Two minutes of questions at the link gets you a character;
> the costume brief follows once the story is sealed. Phones required, acting optional,
> drama guaranteed.

**Costume note** (after sealing — paste the public setting):
> The story is sealed. Tonight is: *[public setting line from the app]*. Dress code:
> [costume line]. Nobody — not me, not [co-host] — knows what's true inside it.

**Day-before nudge**:
> Charge your phone. Arrive whenever — the story knows you're coming either way.

## Troubleshooting (in-fiction where possible)

| Problem | Fix |
|---|---|
| Guest's phone dead | Any device → join link → tap their name → "take over". The loaner tablet exists for this. |
| Guest has no smartphone | Pair them with a partner as a "duo character" — one phone, two actors. (Duo support is informal v1: they share the screen.) |
| Wifi dies | Mobile data works — the app is a website. TV channel dies with wifi: you become the announcer full-time (the director keeps sending you cards). |
| TV tab closed/crashed | Reopen `/tv/CODE`, tap Light the candles. Heartbeat resumes; pg_cron (if configured) never stopped. |
| Guest hates their character | Pre-party: regenerate flow (when built) / at party: quiet word to you → break-glass is overkill — tell them to press-and-hold ◦ themselves; the game eases off. |
| Guest genuinely upset | Break glass. It pauses publicly, no shame in it — "the house lights flicker" is a feature, not an alarm. Resume when ready or end gracefully; the reveal still works. |
| Someone reads over a shoulder | Culture beats tech: the invitation's "trust no one" does most of it. The buzz-cadence means a glimpsed phone shows flavor as often as secrets. |
| The director does something weird | It self-corrects on rejection; if it's *visibly* weird, break-glass → skip to assembly re-anchors the night. Log it; the `director_log` entry will explain itself later. |
| Nothing works at all | The party was always the product. Candles, drinks, and "so who do we THINK would have been the killer" is a legendary failure mode. |

## Budget line (typical evening)
Supabase free tier · Vercel hobby · story generation ~£2 · director over 5h ~£5–15 ·
printing ~£5 · props: whatever the charity shop had. Under £25 a party after setup.
