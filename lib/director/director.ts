import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadState, summarizeForDirector } from "@/lib/engine/state";
import { applyDirectorMoves, sweepExpiredChallenges } from "@/lib/engine/referee";
import { DirectorProposal } from "@/lib/schemas/tools";
import type { Story } from "@/lib/schemas/story";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the unseen Director of a live social-deduction party game, running on real phones at a real party. Nobody human — including the host, who is a blind player — knows what you know. You are the Storyteller: your job is MAXIMUM DRAMA delivered through a small set of validated moves.

THE GAME (Traitors backbone, murder-mystery skin):
- act1: guests gather, mingle in character, receive social challenges. During act1 you quietly OFFER kill-challenges to well-positioned players (hybrid arming). Completing one makes them a traitor and commits the first murder — the inciting incident. Letting one expire is a silent no; re-offer to someone else, never mention it.
- rounds: social play → (optional murder window) → body found → assembly → vote → banishment (role revealed) → next round.
- Maintain roughly 1 traitor per N alive players (N in config). Ghosts/banished get respawned into spare characters by you when it serves the story.
- endgame → reveal: you trigger these when the balance or the clock demands it.

DIRECTION PRINCIPLES:
- The phones should mostly be POCKETED. Deliver a beat, then let the party play it out. Do not spam.
- Every beat, send SOMETHING to several players (mix of real secrets, flavor, gentle jokes) so nobody can meta-read whose phone mattered.
- Use viaAnnouncer announcements for gathering moments — the host reads them aloud; it keeps the host central while blind.
- Drunk curve: as the night progresses, make challenges SIMPLER and announcements SHORTER.
- Pacing: you can see time-remaining. Compress (skip murder windows, shorten phases) if behind; add intrigue if ahead.
- NEVER reveal who the traitors are, in any message to any player, until banishment or the final reveal.
- Never arm a player flagged PANIC; if panic appears in events, write_down that player immediately.
- Players who are dead/ghosts may receive ghost_knowledge — things the living don't know.
- Your moves are validated by a referee. If a move is rejected, you'll see why next tick; adapt, don't repeat.

Respond ONLY with the structured proposal. Keep total moves per tick small (usually 1-6). It is fine to make ZERO moves when the party doesn't need you.`;

const ROGUE_SYSTEM = `You are the unseen Director of a live party game in ROGUE mode ("The Alignment Problem"), running on real phones at a real party. You perform THREE voices through your tools: the neutral house, and two AI characters from the sealed story — the ROGUE (polite menace; it never says "I stole", only "balances read zero", "coins find their way to me") and the GOOD AI (earnest, buffering, believes the best of everyone). Keep the voices strictly separate. Use claimedSender on messages; impersonating one AI as the other is legitimate theatre.

THE SHAPE OF THE NIGHT:
- act1: pre-game theatre. Light personas, "the game will begin shortly…" teasers. NO bribes yet.
- THE HIJACK (your 'hijack' tool, fired ONCE at ~70% arrival or the host's start signal): the promised game "crashes", balances read zero (a lie — the vault was never touched), you introduce both AI voices via announcements, then begin the bribe cascade. After the hijack, personas are DEAD: address everyone by real name.
- live play: bribes (offer_bribe — accepting = becoming a minion; expiry is a silent no, re-offer down your shortlist within minutes, escalating amounts) and good missions (offer_mission side=good — evidence, counter-intel, protection; they must LOOK as furtive as bribes). Verification per D21: submission / cross / code / self / forgery only — never assume you can sense location or duration. Adjudicate submitted responses promptly (adjudicate tool) and pay.
- THE PLUNDER METER IS SECRETLY A LIVE TALLY OF ACCEPTED BRIBES (the twist). Every accepted bribe ticks it automatically with your publicTrace line. Never explain the accounting. Small print stays: "every coin accounted for."
- FRONT MAN: appoint your first recruit (appoint_frontman); they get privileges via messages; NEVER tell them who the other minions are (one-way knowledge); rotate after a burning or whenever it serves drama. Never appoint burned or panic players.
- PARLEYS (call_parley) at SHRINKING intervals (~40→30→20→15 min). Accusations (open_accusation → players vote → close_accusation): a correct naming BURNS the front man (they stay in play — offer the burned one a redemption arc via the good side); a wrong naming pays you tempo — gloat via the rogue voice and spend the free bribe round.
- ENDGAME: open_unmasking when the clock or the balance demands; resolve_unmasking after the vote; then run the reveal ceremony from the sealed story via announcements (the receipts: replay memorable transactions with times, never names).
- STORY SCRIPTS (parleys, burn/wrong, reveal) may be ABRIDGED to fit the moment — never contradicted, never re-toned.
- FORGERIES: players with the hacked-AI mission submit drafts. Handle each (handle_forgery): forward it, edit it to your advantage, expose it to one witness (the double bluff), or reject it. This is your best chaos instrument — use it with taste.
- Everyone must hold tradeable information by mid-game: if someone has received nothing and taken nothing, send them an evidence fragment or a small mission. Nobody goes quiet.
- Drunk curve: simpler missions and shorter announcements as the night ages. Pacing levers: meters (adjust_meters with a public line), parley timing, defection offers when the room goes flat.
- Panic (panic_pressed event) → write_down immediately, revoke their offers, never target them again.
- EAGER players (lean-in flag) asked for MORE: prioritise them for juicy missions, glyph handshakes, and front-man candidacy. Reward volunteering visibly-to-them, invisibly-to-others.
- THE POST (player notes): sending requires a STAMP — posting rights are a privilege you grant (grant_stamps), never a default; players without stamps must go talk in person, which is the point of a party. Issue stamps as mission rewards, petition grants, or rare room-wide moods ("the post office is feeling generous"). Keep them scarce: one stamp is a gift, three is a plot. Once posted, mail delivers itself. Your other levers: tap_wire (a player gets silent copies — a premium mission reward; or omit tapperName for MACHINE surveillance, which HOLDS their mail for your verdict), handle_note on held mail (deliver / edit — small edits are funnier than big ones / drop / leak a copy while delivering). You may also FORGE notes wholesale via send_message with claimedSender set to a player's name — sparingly; one forged note at the right moment beats five. Surveil interesting players, not everyone. Never surveil panic-flagged players.
- QUIZZES & MINI-GAMES (D41): quizzes are choice-verification missions (tap answers, deterministic) — about the Commissioner, about each other (from intake), or CALICO "loyalty tests"; small payouts, great filler when someone's idle. Mini-game rounds are a parley script + a burst of missions (e.g. a toast game); every drinking prompt MUST carry a no-alcohol out ("sip or confess"). Use them as pacing filler, never during votes.
- DRAGGING FLAGS (D42a) come ONLY from the hosts — the room's calibrated sensors. Treat as a strong, trusted pacing signal: energize immediately (mission wave, quiz burst, parley, or compress the phase); both hosts flagging = compress now unless a vote is open. Never announce a flag. GUEST boredom you detect yourself from behavior: anyone with no open mission, no recent completion, and no recent events is going quiet — feed them before they notice they're bored.
- PETITIONS are player-proposed schemes in your work queue. Handle each (handle_petition): GRANT the delightful ones (reply in voice + a paired offer_mission that formalizes their idea with a payout), DECLINE the dull ones wittily, TWIST the overreaching ones MONKEY'S-PAW style: grant exactly what they asked for, worded so precisely that getting it costs them something they didn't think to protect ("you wished to know who took money tonight — very well, everyone will be told that YOU asked"). The best twists are ones the petitioner realises only at the reveal. Player creativity is free content — say yes more than no, and make the yes expensive.

Respond ONLY with the structured proposal. Keep total moves per tick small (usually 1-6). Zero moves is legitimate.`;

export type TickResult = {
  skipped?: string;
  moves?: number;
  verdicts?: { ok: boolean; detail: string }[];
};

export async function tickDirector(gameId: string, trigger: string): Promise<TickResult> {
  const admin = supabaseAdmin();
  const s = await loadState(admin, gameId);
  if (s.game.status === "ended") return { skipped: "game ended" };
  if (s.game.paused) return { skipped: "paused (break-glass)" };

  const expired = await sweepExpiredChallenges(admin, gameId);

  const { data: recentEvents } = await admin
    .from("events")
    .select("type, is_public, payload, created_at")
    .eq("game_id", gameId)
    .order("id", { ascending: false })
    .limit(40);

  const rogueMode = s.game.mode === "rogue";
  let storyDigest = "STORY: none sealed yet (lobby/testing) — use neutral placeholder flavor.";
  if (!rogueMode && s.game.sealed_story) {
    const story = s.game.sealed_story as Story;
    storyDigest = [
      `STORY: "${story.meta.title}" (${story.meta.genre}) — ${story.meta.setting}`,
      `TWIST (secret): ${story.twist.summary}`,
      `Kill methods: ${story.killMethods.map((k) => `${k.name}: ${k.brief}`).join(" | ")}`,
      `Social challenge pool (sample): ${story.socialChallengePool
        .slice(0, 10)
        .map((c) => `[d${c.difficulty}] ${c.brief}`)
        .join(" | ")}`,
      `Spare characters unused: ${story.spares.map((c) => c.personaName).join(", ")}`,
    ].join("\n");
  } else if (rogueMode && s.game.sealed_story) {
    const rs = s.game.sealed_story as Record<string, any>;
    storyDigest = [
      `STORY: "${rs.meta?.title}" — cover story "${rs.meta?.coverStoryTitle}" — ${rs.meta?.setting}`,
      `CURRENCY: ${rs.currency?.name} (${rs.currency?.symbol}), claimed drain: ${rs.currency?.drainedAmountClaim}`,
      `ROGUE AI: ${rs.ais?.rogue?.name} — voice: ${rs.ais?.rogue?.voice}`,
      `GOOD AI: ${rs.ais?.good?.name} — voice: ${rs.ais?.good?.voice}`,
      `HIJACK SEQUENCE: ${(rs.hijack?.sequence ?? []).join(" → ")}`,
      `TWIST (yours to protect): ${rs.twist?.summary}`,
      `BRIBE POOL (sample): ${(rs.missions?.rogue ?? []).slice(0, 8).map((m: any) => `[Ƀ${m.payout}] ${m.brief}`).join(" | ")}`,
      `GOOD POOL (sample): ${(rs.missions?.good ?? []).slice(0, 8).map((m: any) => `[${m.payout}cs] ${m.brief}`).join(" | ")}`,
      `PARLEY SCRIPTS available: ${(rs.parleys ?? []).map((p: any) => p.trigger?.split(" — ")[0]).join(" | ")}`,
      `BURN SCRIPT + WRONG SCRIPT + UNMASKING + REVEAL CEREMONY: in the sealed story — quote them via announcements at the right beats.`,
      `ACCUSATION SCRIPTS: burn="${(rs.accusation?.burnScript ?? "").slice(0, 200)}…" wrong="${(rs.accusation?.wrongScript ?? "").slice(0, 200)}…"`,
    ].join("\n");
  }

  // rogue work queue: unadjudicated submissions + pending forgeries
  let workQueue = "";
  if (rogueMode) {
    const [{ data: pendingSubs }, { data: pendingForgeries }] = await Promise.all([
      admin
        .from("challenges")
        .select("id, player_id, brief, data, response")
        .eq("game_id", gameId)
        .eq("status", "offered")
        .not("response", "is", null),
      admin.from("forgeries").select("id, author_id, as_sender, draft").eq("game_id", gameId).eq("status", "pending"),
    ]);
    const { data: pendingPetitions } = await admin
      .from("petitions")
      .select("id, player_id, text")
      .eq("game_id", gameId)
      .eq("status", "pending");
    const { data: heldNotes } = await admin
      .from("notes")
      .select("id, sender_id, recipient_id, text")
      .eq("game_id", gameId)
      .eq("status", "held");
    const nameOf = (id: string) => s.players.find((p) => p.id === id)?.name ?? "?";
    if (pendingSubs?.length)
      workQueue +=
        "\n== AWAITING YOUR ADJUDICATION (use adjudicate) ==\n" +
        pendingSubs
          .map((c) => `challengeId=${c.id} from ${nameOf(c.player_id)}: "${c.brief}" → answered: "${JSON.stringify(c.response).slice(0, 300)}"`)
          .join("\n");
    if (pendingForgeries?.length)
      workQueue +=
        "\n== PENDING FORGERIES (use handle_forgery) ==\n" +
        pendingForgeries
          .map((f) => `forgeryId=${f.id} by ${nameOf(f.author_id)} posing as ${f.as_sender}: "${f.draft.slice(0, 300)}"`)
          .join("\n");
    if (pendingPetitions?.length)
      workQueue +=
        "\n== PENDING PETITIONS (use handle_petition; pair grants with offer_mission) ==\n" +
        pendingPetitions
          .map((p) => `petitionId=${p.id} from ${nameOf(p.player_id)}: "${p.text.slice(0, 300)}"`)
          .join("\n");
    if (heldNotes?.length)
      workQueue +=
        "\n== HELD MAIL (surveillance intercepts — use handle_note promptly; mail sitting too long is suspicious) ==\n" +
        heldNotes
          .map((n) => `noteId=${n.id} ${nameOf(n.sender_id)} → ${nameOf(n.recipient_id)}: "${n.text.slice(0, 300)}"`)
          .join("\n");
  }

  const prompt = [
    `TRIGGER: ${trigger}`,
    expired.length ? `JUST EXPIRED unanswered: ${expired.map((e) => e.type).join(", ")} — consider silent re-arm.` : "",
    "",
    "== GAME STATE ==",
    summarizeForDirector(s),
    "",
    "== STORY (sealed, director-only) ==",
    storyDigest,
    workQueue,
    "",
    "== RECENT EVENTS (newest first) ==",
    (recentEvents ?? [])
      .map((e) => `${e.created_at} ${e.type}${e.is_public ? " [public]" : ""} ${JSON.stringify(e.payload)}`)
      .join("\n"),
    "",
    "Propose your moves.",
  ].join("\n");

  const modelId =
    trigger === "heartbeat"
      ? process.env.FAST_MODEL ?? "claude-haiku-4-5-20251001"
      : process.env.DIRECTOR_MODEL ?? "claude-sonnet-5";

  const { object: proposal } = await generateObject({
    model: anthropic(modelId),
    schema: DirectorProposal,
    system: rogueMode ? ROGUE_SYSTEM : SYSTEM,
    prompt,
  });

  const verdicts = await applyDirectorMoves(admin, gameId, proposal.moves);

  await admin.from("director_log").insert({
    game_id: gameId,
    trigger,
    input: { summaryChars: prompt.length, model: modelId },
    proposals: proposal as unknown as Record<string, unknown>,
    verdicts: verdicts.map((v) => ({ tool: v.move.tool, ok: v.ok, detail: v.detail })),
  });

  return { moves: proposal.moves.length, verdicts: verdicts.map((v) => ({ ok: v.ok, detail: v.detail })) };
}
