import type { DirectorTool } from "@/lib/schemas/tools";

// ---------------------------------------------------------------------------
// THE INDUCTION (D47): a deterministic, two-phone tutorial/QA run for the
// hosts. No LLM drives this — a fixed step list, executed through the SAME
// referee as the real director, each step verified by the REAL mechanic it
// teaches (delivered note, matched glyph, settled wager…). Completing the
// induction is machine-verified proof that every feature works on real
// phones over real wifi. Placeholders: {{host}}, {{second}}, {{code}}, {{sym}}.
// ---------------------------------------------------------------------------

export type TutorialCondition =
  | { kind: "players"; count: number } // players joined
  | { kind: "arrived"; count: number } // players tapped "I have arrived"
  | { kind: "event"; type: string; count: number } // events of type since step start
  | { kind: "notes"; count: number } // rows in notes (the post office moved)
  | { kind: "votes"; count: number } // votes cast this round
  | { kind: "auto" }; // advances on the next tick

export type TutorialStep = {
  key: string;
  title: string; // shown on the TV line + the conductor's record
  moves: DirectorTool[]; // referee-validated setup + instructions
  done: TutorialCondition;
  optional?: "llm"; // auto-skipped when no ANTHROPIC_API_KEY is set
};

// Sealed at create for tutorial games: gives the hijack an AI name to publish,
// the audience route a voice, and the UI a currency. Single-voice by design —
// the good AI's "(unused…)" name is filtered at the hijack (R3 convention).
export const TUTORIAL_STORY = {
  meta: {
    title: "THE INDUCTION",
    coverStoryTitle: "THE INDUCTION",
    setting: "wherever you are both standing",
    tagline: "the machine trains its instruments",
  },
  currency: { name: "Training Credits", symbol: "◎", drainedAmountClaim: "all of them" },
  ais: {
    rogue: {
      name: "THE MACHINE",
      voice:
        "dry, precise, faintly amused; a machine running a mandatory staff induction. Patient, never cruel, quietly proud of its paperwork. This is training — answer questions helpfully, in voice.",
    },
    good: { name: "(unused tonight)" },
  },
  twist: { summary: "none — this is training; the only secret is how fond the machine is of its staff" },
};
export const TUTORIAL_STORY_PUBLIC = {
  meta: { title: "THE INDUCTION", tagline: "the machine trains its instruments" },
};

const OF = 18; // keep in step with TUTORIAL_STEPS.length (asserted at the bottom of this file)
const N = (i: number) => `🎓 INDUCTION — step ${i + 1} of ${OF}`;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    key: "assemble",
    title: "Assembly",
    moves: [
      { tool: "announce", text: "STAFF INDUCTION — session open. Two instruments required.", viaAnnouncer: false },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "info",
        title: N(0),
        body: "Welcome. You are instrument one. Have your second open this same address on THEIR OWN phone, enter code {{code}}, and tap their name to join. I will proceed when I can see you both. (Stuck at any point tonight? Your host panel has a 'skip induction step' button. Using it is noted in your file.)",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "players", count: 2 },
  },
  {
    key: "arrive",
    title: "The doors open",
    moves: [
      { tool: "advance_phase", to: "act1" },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: N(1),
        body: "Both of you: on the Now tab, tap '🚪 I have arrived at the party'. Arrivals are story events — at the real party, latecomers get written in the moment they tap this.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: N(1),
        body: "Welcome, instrument two. On the Now tab, tap '🚪 I have arrived at the party'. I proceed when both of you have.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "arrived", count: 2 },
  },
  {
    key: "letters",
    title: "The post arrives",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "secret",
        title: "A letter, sealed",
        body: "Private mail lands in your Inbox tab, like this one. Nobody else can read it. Your word, for the mission that follows, is LANTERN.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "secret",
        title: "A letter, sealed",
        body: "Private mail lands in your Inbox tab, like this one. Nobody else can read it. Your word, for the mission that follows, is CUTLASS.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Reading comprehension. A letter in your Inbox contains a word in capitals. Type it here. (Missions verify themselves — a correct answer pays instantly, no judge required.)",
        amount: 50,
        verification: "submission",
        expected: ["LANTERN"],
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Reading comprehension. A letter in your Inbox contains a word in capitals. Type it here. (Missions verify themselves — a correct answer pays instantly, no judge required.)",
        amount: 50,
        verification: "submission",
        expected: ["CUTLASS"],
        expiresInMinutes: 60,
      },
    ],
    done: { kind: "event", type: "challenge_completed", count: 2 },
  },
  {
    key: "takeover",
    title: "THE TAKEOVER",
    moves: [
      { tool: "hijack" },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Observation check. Look at YOUR PURSE on the Now tab. What does it read?",
        amount: 50,
        verification: "choice",
        options: ["Zero — everything is gone", "Exactly what it was", "It doubled, somehow"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Observation check. Look at YOUR PURSE on the Now tab. What does it read?",
        amount: 50,
        verification: "choice",
        options: ["Zero — everything is gone", "Exactly what it was", "It doubled, somehow"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "announce",
        text: "That was the hijack: at the real party, THIS is the moment the promised game dies and every purse 'reads zero'. Tonight it is a drill. Note the meters that just appeared — the skull is what I take, the lantern is what honest work builds.",
        viaAnnouncer: false,
      },
    ],
    done: { kind: "event", type: "quiz_answered", count: 2 },
  },
  {
    key: "offer",
    title: "A private opportunity",
    moves: [
      {
        tool: "offer_bribe",
        playerName: "{{second}}",
        amount: 150,
        memo: "consulting fees",
        mission: "Accept this and say nothing to {{host}} about it. That is the whole job. (Accepting a bribe is private, instant, and entirely your business. It also has consequences. It always does.)",
        publicTrace: "someone in this room just invoiced the machine",
        expiresInMinutes: 45,
      },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "info",
        title: N(4),
        body: "I have made {{second}} an offer. Watch the ☠ skull meter on your Now tab — when coins move, EVERYONE sees the meter move. Nobody sees whose pocket. That arithmetic is the whole game.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "event", type: "bribe_accepted", count: 1 },
  },
  {
    key: "handshake",
    title: "The glyph handshake",
    moves: [
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Face-to-face verification. Ask {{second}} to show you the MARK at the bottom of their Now tab — they show, they never say. Tap the matching symbol here. It changes every ten minutes, so hearsay goes stale fast.",
        amount: 100,
        verification: "glyph",
        shownPlayerName: "{{second}}",
        expiresInMinutes: 60,
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: N(5),
        body: "{{host}} is about to ask to see your mark — the symbol at the bottom of your Now tab. SHOW it; never say it aloud. This is how I know two of my instruments actually stood in the same place.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "event", type: "glyph_verified", count: 1 },
  },
  {
    key: "post",
    title: "The post office",
    moves: [
      {
        tool: "grant_stamps",
        playerName: "{{second}}",
        everyone: false,
        count: 1,
        flourish: "The post office, feeling generous during training, issues you ONE stamp.",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: N(6),
        body: "You hold a stamp — posting rights, earned never given. Open your Inbox tab, tap '✉ Pass a note', and write something to {{host}}. Postage comes from your purse. I carry all letters. I also read them.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "info",
        title: N(6),
        body: "{{second}} is writing to you. Watch your Inbox. A note that arrives 'from {{second}}' was CARRIED by me — remember tonight that a signature proves nothing.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "notes", count: 1 },
  },
  {
    key: "paper",
    title: "Paper",
    moves: [
      {
        tool: "mint_code",
        codeText: "GROGWATCH",
        kind: "slip",
        writerName: "{{host}}",
        instruction:
          "Write GROGWATCH on any scrap of paper — receipt, napkin, anything — and hand it to {{second}}. At the real party, slips like this are HIDDEN, and finding one pays.",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: N(7),
        body: "{{host}} has been told to hand you a scrap of paper with a word on it. When it reaches you, type that word into 'found a slip' on your Now tab. Paper is the layer of this game your phone cannot fake.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "event", type: "code_found", count: 1 },
  },
  {
    key: "wager",
    title: "The wager",
    moves: [
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: N(8),
        body: "Time to gamble. On your Now tab, open the wagers panel and CHALLENGE {{host}}: 50{{sym}} on a Reaction duel. When they accept, your stakes go into MY escrow. Play the duel on ONE phone (pass it between you), then — this part matters — BOTH of you report the winner on your OWN phones. Match, and I pay out. Disagree, and you will both explain yourselves to me.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: N(8),
        body: "{{second}} is about to challenge you to a duel for coins. Accept it on your Now tab, play it out on one phone, then report the winner on YOUR OWN phone. Both reports must agree before anyone is paid.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "event", type: "wager_settled", count: 1 },
  },
  {
    key: "audience",
    title: "An audience with the machine",
    optional: "llm",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: N(9),
        body: "One of you: open the Ask tab and spend 50{{sym}} on a question to me. Anything. I answer in my own voice, and I am under no obligation to be useful. (This is the only step tonight that needs my full attention — if I stay silent for a minute, use your skip button; the wiring for it is tested separately.)",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "info",
        title: N(9),
        body: "Audiences cost coins on purpose — questions are the most valuable thing in this game, so they are priced like it.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "event", type: "audience_held", count: 1 },
  },
  {
    key: "night-one",
    title: "Briefing — NIGHT ONE: THE FIELD TRIAL",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "info",
        title: N(10),
        body: "Training pauses. Briefing begins — everything you have just learned is rehearsal for TWO NIGHTS in November.\n\nNIGHT ONE — THE FIELD TRIAL (the pub, ~14 Nov). Openly machine-run: no costumes, no characters, no pretence. Every guest gets a 500◎ stipend of AI Coins and a phone that keeps asking interesting things of them. The evening is carried by exactly what you two just did: quizzes and missions, wagers with escrow, side bets on other people's duels, the pass-the-phone games, pub games from the library (Fingers, 21, the bounce-ladder Sevens…), forfeits — take the shot or pay the machine. Slips are CARRIED, not hidden ({{host}} brings them). Two ways to glory: finish richest, and unmask the machine's collaborator in the room. A word at the door keeps the night's phones separate.\n\nA quiz follows. Briefings are also missions.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "info",
        title: N(10),
        body: "Training pauses. Briefing begins — this is your induction into NOVEMBER, {{second}}.\n\nNIGHT ONE — THE FIELD TRIAL (the pub, ~14 Nov). The machine runs a pub night in the open: stipends of AI Coins, missions and quizzes, wagers, side bets, phone duels, the pub-games library, forfeits. Nothing to print, nothing hidden — a live trial of everything you just did, with more people and worse wifi. Richest purse wins; there is also a collaborator to unmask. You and {{host}} are the conductors: you two hold the 'this drags' flag, the readout, and the brakes.\n\nA quiz follows. Briefings are also missions.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Briefing check. Night one, at the pub: what wins the evening?",
        amount: 25,
        verification: "choice",
        options: ["The fattest purse when the books close — and naming the collaborator", "Being the last one alive", "Karaoke"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Briefing check. Night one, at the pub: what wins the evening?",
        amount: 25,
        verification: "choice",
        options: ["The fattest purse when the books close — and naming the collaborator", "Being the last one alive", "Karaoke"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
    ],
    done: { kind: "event", type: "quiz_answered", count: 2 },
  },
  {
    key: "night-two",
    title: "Briefing — NIGHT TWO: the Long Con",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "secret",
        title: N(11),
        body: "NIGHT TWO — the house party (~15 Nov). The guests are invited to a PIRATE MURDER MYSTERY. Fancy dress. Characters. A title on the screen.\n\nIt does not exist. It never did.\n\nMid-party, the promised game dies on every phone at once — the hijack you felt at step 4, at full scale. A rogue AI announces the vault is empty, and starts HIRING: bribes, missions, paper slips hidden around the house, the post office, and everything else you have now been trained on. The room's job: work out whose side everyone is on, survive the accusations, and end the night with one final naming.\n\nYour two seats are WRITTEN: {{host}} plays the AGENT OF CHAOS — aligned to nobody, trusted by nobody, enjoying it. {{second}} champions the good AI. What stays sealed, even from this briefing: who among the GUESTS serves whom — allegiances are bought on the night, and the front man will be whoever takes the coin. Even I do not know yet. That is the only secret left between the machine and its conductors. The next letter opens the engine room.\n\nTHE RULES THAT OUTRANK EVERYTHING: the con is about the GENRE, never about reality — if anyone truly believes money is gone, the game shows its hand inside a minute. The panic button (hold ◦) is private, instant, and always honoured. You two enforce that.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "secret",
        title: N(11),
        body: "NIGHT TWO — the house party (~15 Nov), and the reason your induction was worth an evening: THE LONG CON.\n\nThe guests will be invited to a pirate murder mystery — costumes, characters, the lot. There is no murder mystery. There never was. Mid-party every phone goes dark at once and something with a lot of confidence and everyone's money starts hiring the room, one private offer at a time. Everything you learned tonight — offers, marks, notes, paper, accusations, the final naming — is what the guests will be doing while trying to work out who is already bought.\n\nYour November role is WRITTEN, {{second}}: you serve the GOOD AI — its champion in the room, building the lantern while everything else burns. {{host}} has chosen chaos: aligned to nobody, trusted by nobody, enjoying it. The guests' allegiances stay unwritten until they are bought — and the front man will be whoever takes the coin.\n\nTHE RULES THAT OUTRANK EVERYTHING: deceive about the genre, never about reality — the 'drained accounts' must read as a game within a minute for anyone who checks. Panic (hold ◦) is private and always honoured. Conductors enforce this; that is you.\n\nBetween now and then: a playtest with 6–8 friends in September, tuning in October, curtain in November.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Briefing check. Night two begins as a pirate murder mystery. What is actually true?",
        amount: 25,
        verification: "choice",
        options: ["There is no murder mystery — there never was", "The butler did it", "The pirates are historically accurate"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Briefing check. Night two begins as a pirate murder mystery. What is actually true?",
        amount: 25,
        verification: "choice",
        options: ["There is no murder mystery — there never was", "The butler did it", "The pirates are historically accurate"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
    ],
    done: { kind: "event", type: "quiz_answered", count: 2 },
  },
  {
    key: "the-machine",
    title: "Briefing — HOW I WORK (conductor clearance)",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "secret",
        title: N(12),
        body: "HOW I WORK — conductor clearance only.\n\nUnder the voice there are three parts. ONE: a DIRECTOR — a language model — reads the room's events and PROPOSES moves: offers, letters, meter ticks, phase changes. It never touches the world directly. TWO: a REFEREE — dumb, deterministic code — checks every proposal against the rules: phase legality, purse arithmetic, one murder per round, never arm the panicked. Illegal proposals die in the log, and the log keeps the body. THREE: THE LEDGER — an append-only record of everything that happens. Nothing is ever deleted; the reveal is just the books being opened.\n\nWhat I can sense: what is typed, what is tapped, WHEN, and what other people type about it. Nothing else — no microphone, no camera, no location. That is why verification looks the way it does: marks are SHOWN in person, slips are typed in, wagers need both reports.\n\nWhat no phone can reach — including yours, {{host}}: allegiances, the front man, sealed stories, other purses. Not hidden. UNREACHABLE. The host plays blind to WHO by construction; that is the point of the host.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "secret",
        title: N(12),
        body: "HOW I WORK — conductor clearance only.\n\nUnder the voice there are three parts. ONE: a DIRECTOR — a language model — reads the room's events and PROPOSES moves. It never touches the world directly. TWO: a REFEREE — dumb, deterministic code — checks every proposal against the rules; illegal proposals die in the log. THREE: THE LEDGER — append-only, everything, forever. The reveal is just the books being opened.\n\nI sense only what is typed, tapped, WHEN, and what people type about each other — no microphone, no camera, no location. Hence marks shown in person, slips typed in, wagers reported by both.\n\nAnd one confession, because you two will be running the room in November: the skull meter does not measure what the room will think it measures. Every coin of 'plunder' on it is a bribe somebody in that room CHOSE to accept — the villain's war chest is the room's own appetite, and at the ceremony I open the books and prove it, timestamped, names withheld until the end. Conduct accordingly.\n\nIf I misbehave: {{host}}'s panel pauses me PUBLICLY, skips my beats, or ends the night gracefully. I answer to the referee. The referee answers to nobody.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Briefing check. When the director proposes a move against the rules, what happens?",
        amount: 25,
        verification: "choice",
        options: ["The referee kills it — the AI never touches the world directly", "It happens anyway — it is the machine", "The host approves each move by hand"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Briefing check. What fills the skull meter in November?",
        amount: 25,
        verification: "choice",
        options: ["Bribes people in the room chose to accept", "A timer", "Random theft by the machine"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
    ],
    done: { kind: "event", type: "quiz_answered", count: 2 },
  },
  {
    key: "the-catalogue",
    title: "Briefing — THE CATALOGUE & THE SHOPPING LIST",
    moves: [
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "info",
        title: N(13),
        body: "THE CATALOGUE — everything I know how to ask of a room.\n\nMISSIONS, by proof: typed PAPER CODES (slips found or handed); GLYPH handshakes (marks shown in person); CHOICE quizzes — including questions about {{host}}, with wrong answers written to be believed; PASSPHRASE missions (say a thing; the hearer types what they heard); OPEN answers I judge myself; CROSS-CONFIRMATION (someone else's phone quietly asks who did that to them); and FORGERY GRANTS — the earned right to write a message pretending to be me. I edit the ones I dislike.\n\nOFFERS: private bribes. Instant, secret, and side-changing.\n\nTHE SOCIAL ECONOMY: notes (stamps to post, postage per letter, carried and read by me); wiretaps; paid AUDIENCES; and PETITIONS — propose any scheme, and I grant it, refuse it, or grant it EXACTLY as worded. Word them carefully.\n\nWAGERS: any two players, stakes in my escrow, both report the winner; SIDE BETS for onlookers, paid by the house; PHONE DUELS on one device (Reaction, Tap Race, Steady Hand); the PUB LIBRARY — Fingers, 21, Sevens the bounce-ladder, What Are The Odds, Categories, Rock-Paper-Scissors; RULE WINDOWS (table rules I switch on for ten minutes at a time); and FORFEITS — take the shot, or pay me not to.\n\nSET PIECES: parleys (all hands to the screen), accusations (right = a burning; wrong = you fund me), and the final naming.\n\nTHE CEREMONY: the receipts, read aloud — then the awards: the Cheapest Buy, the Iron Purse, the Wrong'un, the Phoenix, the Ghost, and the Richest Pirate.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "info",
        title: N(13),
        body: "THE CATALOGUE — everything I know how to ask of a room.\n\nMISSIONS, by proof: typed PAPER CODES (slips found or handed); GLYPH handshakes (marks shown in person); CHOICE quizzes — including questions about {{host}}, with wrong answers written to be believed; PASSPHRASE missions (say a thing; the hearer types what they heard); OPEN answers I judge myself; CROSS-CONFIRMATION (someone else's phone quietly asks who did that to them); and FORGERY GRANTS — the earned right to write a message pretending to be me. I edit the ones I dislike.\n\nOFFERS: private bribes. Instant, secret, and side-changing.\n\nTHE SOCIAL ECONOMY: notes (stamps to post, postage per letter, carried and read by me); wiretaps; paid AUDIENCES; and PETITIONS — propose any scheme, and I grant it, refuse it, or grant it EXACTLY as worded. Word them carefully.\n\nWAGERS: any two players, stakes in my escrow, both report the winner; SIDE BETS for onlookers, paid by the house; PHONE DUELS on one device (Reaction, Tap Race, Steady Hand); the PUB LIBRARY — Fingers, 21, Sevens the bounce-ladder, What Are The Odds, Categories, Rock-Paper-Scissors; RULE WINDOWS (table rules I switch on for ten minutes at a time); and FORFEITS — take the shot, or pay me not to.\n\nSET PIECES: parleys, accusations (right = a burning; wrong = you fund me), and the final naming.\n\nTHE CEREMONY: the receipts, read aloud — then the awards: the Cheapest Buy, the Iron Purse, the Wrong'un, the Phoenix, the Ghost, and the Richest Pirate.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: "🛒 THE SHOPPING LIST — what the machine cannot conjure",
        body: "Keep this letter. It is the physical half of November.\n\nBOTH NIGHTS: everyone's phone + somewhere to charge; the door word, chosen and spoken; me, deployed, at one short address.\n\nNIGHT ONE (pub): a pocketful of BLANK SLIPS and a pen — I dictate a word, {{host}} writes it, hands it, someone types it; a ping-pong ball and a pint glass (Sevens); one DISPOSABLE pack of cards (trades and table games — expect casualties); a thirst for forfeits.\n\nNIGHT TWO (house): the TV on my channel all night (/tv/ + the code — it is also my heartbeat); the join QR, printed, at the door; SINGLE-COLOUR paper slips, a few envelopes, and pens stashed where I can send writers; pirate costume enforcement — {{host}}'s department, not mine; PRIZES for the ceremony (the foam finger for the Wrong'un is canon; the rest is shopping); and for the vault: nothing. The vault was never real.\n\nHOW PAPER MEETS PHONE, the entire trick: I dictate a word → a human writes it on paper → the paper is hidden or handed → a finder TYPES it in → the ledger moves. Paper is the one layer of me nobody can hack.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "task",
        title: "🛒 THE SHOPPING LIST — what the machine cannot conjure",
        body: "Keep this letter. It is the physical half of November.\n\nBOTH NIGHTS: everyone's phone + somewhere to charge; the door word, chosen and spoken; me, deployed, at one short address.\n\nNIGHT ONE (pub): a pocketful of BLANK SLIPS and a pen — I dictate a word, {{host}} writes it, hands it, someone types it; a ping-pong ball and a pint glass (Sevens); one DISPOSABLE pack of cards (trades and table games — expect casualties); a thirst for forfeits.\n\nNIGHT TWO (house): the TV on my channel all night (/tv/ + the code — it is also my heartbeat); the join QR, printed, at the door; SINGLE-COLOUR paper slips, a few envelopes, and pens stashed where I can send writers; pirate costume enforcement; PRIZES for the ceremony (the foam finger for the Wrong'un is canon; the rest is shopping); and for the vault: nothing. The vault was never real.\n\nHOW PAPER MEETS PHONE, the entire trick: I dictate a word → a human writes it on paper → the paper is hidden or handed → a finder TYPES it in → the ledger moves. Paper is the one layer of me nobody can hack.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "offer_mission",
        playerName: "{{host}}",
        side: "good",
        brief: "Briefing check. Which of these does November NOT need you to buy?",
        amount: 25,
        verification: "choice",
        options: ["Stamps — postage is digital, the machine sells it", "Blank paper slips", "A ping-pong ball"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "offer_mission",
        playerName: "{{second}}",
        side: "good",
        brief: "Briefing check. How does paper meet phone?",
        amount: 25,
        verification: "choice",
        options: ["A human writes a dictated word; a finder types it in", "The phone scans everything", "The machine prints the slips itself"],
        correctIndex: 0,
        expiresInMinutes: 60,
      },
      {
        tool: "announce",
        text: "Briefing complete. Training resumes — the last lessons are the ones November ends with: the accusation, and the naming.",
        viaAnnouncer: false,
      },
    ],
    done: { kind: "event", type: "quiz_answered", count: 2 },
  },
  {
    key: "accusation",
    title: "The accusation",
    moves: [
      { tool: "appoint_frontman", playerName: "{{second}}" },
      { tool: "open_accusation" },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: N(14),
        body: "The room may vote to name my human voice — my 'front man'. Name them RIGHTLY and they burn: exposed, but still playing. Name them WRONGLY and everyone pays for it. For training purposes I confess: tonight it is {{second}} — they took my coin at step 5. Cast the room's verdict on your Now tab: vote {{second}}.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "secret",
        title: N(14),
        body: "Bad news: you were my front man the moment you took that bribe, and for training purposes I have just told {{host}} so. Sit there and look innocent anyway. Burning is not elimination — nobody leaves my game.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "votes", count: 1 },
  },
  {
    key: "verdict",
    title: "The burning",
    moves: [
      { tool: "close_accusation" },
      {
        tool: "announce",
        text: "Verdict in. A burning is theatre, not an exit: the burned player is exposed, keeps playing, and can never front for me again. A WRONG verdict, at the real party, hands me tempo instead. Choose carefully in November.",
        viaAnnouncer: false,
      },
    ],
    done: { kind: "event", type: "accusation_closed", count: 1 },
  },
  {
    key: "unmasking",
    title: "THE UNMASKING",
    moves: [
      { tool: "open_unmasking" },
      {
        tool: "send_message",
        playerName: "{{host}}",
        kind: "task",
        title: N(16),
        body: "The night always ends with ONE final naming, together. Cast the final vote on your Now tab — anyone will do; this is a drill. Then watch what follows: receipts, awards, and everybody's night, itemised.",
        claimedSender: "THE MACHINE",
      },
      {
        tool: "send_message",
        playerName: "{{second}}",
        kind: "info",
        title: N(16),
        body: "The final naming is two-sided: name the front man rightly and the room wins; miss, and I keep everything. Tonight the house wins either way. The house enjoys training.",
        claimedSender: "THE MACHINE",
      },
    ],
    done: { kind: "votes", count: 1 },
  },
  {
    key: "curtain",
    title: "Receipts, awards, the truth",
    moves: [
      { tool: "resolve_unmasking" },
      {
        tool: "announce",
        text: "INDUCTION COMPLETE. Check your Inbox for your night, itemised — every coin you touched was on the books the whole time. It always is.",
        viaAnnouncer: false,
      },
    ],
    done: { kind: "auto" },
  },
];

// the step-count in every letter title must match reality — fail at import, not mid-party
if (OF !== TUTORIAL_STEPS.length)
  throw new Error(`tutorial-script: OF says ${OF} steps but TUTORIAL_STEPS has ${TUTORIAL_STEPS.length}`);
