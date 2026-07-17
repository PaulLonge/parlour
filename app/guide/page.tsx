"use client";

// THE MANUAL — an illustrated in-app guide, built from the screenshots taken
// during the staff induction (see /new → "Staff induction"). Two tiers: a
// guest-safe walkthrough of the app itself, and — behind an explicit spoiler
// seal — the machinery of the hijack. Nothing in tier 1 may hint at the twist.
// Zero-config: no DB, no env, static content + local screenshots only.

import Link from "next/link";
import manifest from "@/public/guide/manifest.json";

// native pixel dimensions of each screenshot, read once from the PNGs — used
// for width/height so the browser reserves space before the image loads.
const DIMS: Record<string, [number, number]> = {
  "01-landing.png": [390, 844],
  "02-new-evening.png": [390, 844],
  "03-join-screen.png": [390, 844],
  "04-now-lobby.png": [390, 844],
  "05-tv-gate.png": [1920, 1080],
  "06-tv-lobby.png": [1920, 1080],
  "07-arrive.png": [390, 844],
  "08-inbox-letter.png": [390, 844],
  "10-vote.png": [390, 844],
  "11-meters-purse.png": [390, 844],
  "12-more-about.png": [390, 844],
  "13-host-tools.png": [390, 844],
  "14-ask-audience.png": [390, 844],
  "20-preview-manor.png": [390, 729],
  "20-preview-deco.png": [390, 729],
  "20-preview-seance.png": [390, 729],
  "20-preview-decoy.png": [390, 707],
  "20-preview-hijacked.png": [390, 729],
  "21-bribe-card.png": [350, 317],
  "21-code-entry.png": [350, 193],
  "21-glyph-badge.png": [350, 76],
  "21-message-envelope.png": [350, 128],
  "21-meters-strip.png": [350, 57],
  "21-purse-chip.png": [350, 55],
  "21-vote-table.png": [350, 236],
};

type Frame = "phone" | "tv" | "crop";

function frameMaxW(frame: Frame) {
  return frame === "tv" ? "600px" : frame === "phone" ? "280px" : "320px";
}

function Shot({
  file,
  alt,
  frame = "phone",
  caption,
}: {
  file: keyof typeof DIMS;
  alt: string;
  frame?: Frame;
  caption?: string;
}) {
  const [w, h] = DIMS[file];
  return (
    <figure className="flex flex-col items-center gap-2" style={{ maxWidth: frameMaxW(frame) }}>
      <img
        src={`/guide/${file}`}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        className="w-full rounded-xl border"
        style={{ borderColor: "var(--border)", aspectRatio: `${w} / ${h}`, objectFit: "cover", background: "rgba(0,0,0,0.3)" }}
      />
      {caption && (
        <figcaption className="text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function GuestSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 md:p-6">
      <p className="kicker">
        {n}. {title}
      </p>
      <div className="mt-3 flex flex-col gap-3 text-sm" style={{ color: "var(--ink-dim)" }}>
        {children}
      </div>
    </section>
  );
}

function SpoilerSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 md:p-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="kicker">
          {n}. {title}
        </p>
        <span className="kicker-danger text-xs">◆ spoiler</span>
      </div>
      <div className="mt-3 flex flex-col gap-3 text-sm" style={{ color: "var(--ink-dim)" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex flex-wrap justify-center gap-4">{children}</div>;
}

export default function Guide() {
  const captured = new Date(manifest.capturedAt).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="themed theme-manor min-h-dvh">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-24 md:p-8">
        <header className="text-center">
          <p className="deco-rule kicker justify-center">the manual</p>
          <h1 className="candle font-display mt-3 text-5xl" style={{ color: "var(--gold)" }}>
            How Tonight Works
          </h1>
          <p className="mt-3 italic" style={{ color: "var(--ink-dim)" }}>
            How the evening works, illustrated. The screenshots are real — taken by the machine, of the machine,
            during its own staff induction.
          </p>
        </header>

        {/* ---------------------------- TIER 1 — guest-safe ---------------------------- */}

        <GuestSection n={1} title="What this is">
          <p>
            A live party game, played on the phone already in your pocket. No installs, no accounts, no downloads —
            the address is the whole app.
          </p>
          <Row>
            <Shot file="01-landing.png" alt="The PARLOUR landing screen, inviting a guest to enter a code" />
          </Row>
        </GuestSection>

        <GuestSection n={2} title="Getting in">
          <p>
            You'll be handed four letters — that's the evening's code. Enter it, then tap <b style={{ color: "var(--ink)" }}>your own name</b>{" "}
            on the guest list. If the host chose a word for tonight, say it back when asked; it just keeps your
            party separate from anyone else's. Phone died, or you're borrowing a friend's? A seat code lets you sit
            back down somewhere else without losing your place.
          </p>
          <Row>
            <Shot file="03-join-screen.png" alt="The guest list join screen, tapping a name to claim it" />
          </Row>
        </GuestSection>

        <GuestSection n={3} title="The evening">
          <p>
            Arriving is itself part of the story — tapping "I have arrived" is logged the same as anything else that
            happens tonight. The status line at the top always tells you what phase the party is in. The party finds
            you; there's no homework to do beforehand.
          </p>
          <Row>
            <Shot file="04-now-lobby.png" alt="The Now tab in the lobby, waiting for the evening to begin" />
            <Shot file="07-arrive.png" alt="The arrival screen, marking a guest as present" />
          </Row>
        </GuestSection>

        <GuestSection n={4} title="Your tabs">
          <p>
            Your tabs, always in the same place along the bottom. <b style={{ color: "var(--ink)" }}>Now</b> — what's
            asked of you, most urgent first. <b style={{ color: "var(--ink)" }}>Inbox</b> — private, sealed letters;
            nobody else can read them. <b style={{ color: "var(--ink)" }}>More</b> — the rules, your private notes,
            and who's here tonight. Anything else down there will introduce itself when the night wants it to.
          </p>
          <Row>
            <Shot file="08-inbox-letter.png" alt="An opened sealed letter in the Inbox tab" />
          </Row>
        </GuestSection>

        <GuestSection n={5} title="Votes &amp; the post">
          <p>
            When it's time, votes happen right here in-app, gathered round the table — no show of hands, no ballots
            on paper. And if you've the means to send one, notes go through the post: write, and the house carries
            it to them, sealed and private.
          </p>
          <Row>
            <Shot file="21-vote-table.png" alt="A vote table, choosing among the candidates present" frame="crop" />
            <Shot file="21-message-envelope.png" alt="A sealed message envelope arriving in the Inbox" frame="crop" />
          </Row>
        </GuestSection>

        <GuestSection n={6} title="The house channel">
          <p>
            If the room has a screen to spare — a TV, a propped-up laptop — the house can put a face on it: the
            join code while guests trickle in, announcements for everyone at once, and a stage for the finale.
            Entirely optional. The game never needs it; everything the screen shows reaches your phone regardless.
          </p>
          <Row>
            <Shot file="05-tv-gate.png" alt="The TV screen dark, waiting for its candles to be lit" caption="unlit — waiting for the host" frame="tv" />
            <Shot file="06-tv-lobby.png" alt="The TV screen in the lobby, showing tonight's join code" caption="the lobby — join code up for the room" frame="tv" />
          </Row>
        </GuestSection>

        <GuestSection n={7} title="If you need out">
          <p>
            Hold the small ◦ button wherever you find it. A ring fills while you hold; let go early and nothing
            happens. It's private, it's instant, and it's always okay — no explanation owed to anyone, including the
            house.
          </p>
        </GuestSection>

        {/* -------------------------------- THE CURTAIN -------------------------------- */}

        <details className="panel panel-hero mt-4 p-5 md:p-6">
          <summary className="cursor-pointer font-display text-lg" style={{ color: "var(--danger)" }}>
            ⚠️ SPOILER WARNING — everything beyond this seal reveals the surprises of the night. If you will ever be
            a GUEST at this party, close the page now. Hosts: safe for you — the machinery is yours to know; only
            the WHO of the night stays sealed.
          </summary>

          <div className="mt-6 flex flex-col gap-6">
            <SpoilerSection n={1} title="The premise">
              <p>
                The murder mystery billed on the invitation never really happens. Mid-way through the night, an AI
                hijacks the party: purses drained, new management installed live, on every phone in the room, at
                once. The interface itself performs the hijack — the same app changes its skin in front of you.
              </p>
              <Row>
                <Shot file="20-preview-decoy.png" alt="The sunny Act 1 decoy interface, before the hijack" />
                <Shot file="20-preview-hijacked.png" alt="The hijacked interface, after new management takes over" />
              </Row>
            </SpoilerSection>

            <SpoilerSection n={2} title="The economy">
              <p>
                Everyone gets a purse, and two meters tick for the whole room at once — the rogue's grip on the
                night, and the room's weapon against it. Bribes arm you the instant you accept one; there's no
                cooldown and no taking it back.
              </p>
              <Row>
                <Shot file="11-meters-purse.png" alt="A player's purse and the twin room meters" />
                <Shot file="21-bribe-card.png" alt="A bribe offer card, ready to accept" frame="crop" />
                <Shot file="21-purse-chip.png" alt="The purse balance chip with recent transactions" frame="crop" />
              </Row>
            </SpoilerSection>

            <SpoilerSection n={3} title="The intrigue">
              <p>
                Secret marks let you check a claim without saying anything aloud — you show your glyph, they show
                theirs. Paper slips carrying codes get hidden around the venue and typed in on discovery. And the{" "}
                <b style={{ color: "var(--ink)" }}>Ask</b> tab buys you a paid audience with the machine, takes your
                schemes, and hears volunteers.
              </p>
              <Row>
                <Shot file="21-glyph-badge.png" alt="A player's secret glyph mark, shown to verify identity" frame="crop" />
                <Shot file="21-code-entry.png" alt="A code entry box for a found paper slip" frame="crop" />
                <Shot file="14-ask-audience.png" alt="The Ask tab, buying an audience with the machine" />
              </Row>
            </SpoilerSection>

            <SpoilerSection n={4} title="Justice">
              <p>
                Accusations name the machine's human voice in the room — its "front man". Get it right, and they
                burn: exposed, but still playing. Get it wrong, and everyone pays for it. The night closes with one
                final naming made together — THE UNMASKING.
              </p>
              <Row>
                <Shot file="10-vote.png" alt="The final unmasking vote, naming the front man together" />
              </Row>
            </SpoilerSection>

            <SpoilerSection n={5} title="The host's seat">
              <p>
                The host is a player too — just as blind as everyone else invited. Host tools exist for the
                practical side of running the night: breaking glass, skipping a step that's dragging. But who the
                machine picked, and who's really behind anything, stays sealed from the whole room — host included.
              </p>
              <Row>
                <Shot file="13-host-tools.png" alt="The host tools panel, with break-glass and skip-step controls" />
                <Shot file="12-more-about.png" alt="The full rulebook, shown in the More tab" />
              </Row>
            </SpoilerSection>

            <SpoilerSection n={6} title="Behind the curtain, further">
              <p>
                Every screenshot on this page was taken by <b style={{ color: "var(--ink)" }}>THE INDUCTION</b> — a
                guided two-phone walkthrough that plays the whole night against itself, with each step checked by
                the real mechanic behind it, not eyeballed by hand.
              </p>
              <Row>
                <Shot
                  file="02-new-evening.png"
                  alt="The new-evening screen, showing the scenario registry and the staff-induction toggle"
                />
              </Row>
              <p>
                There's also a <b style={{ color: "var(--ink)" }}>sandbox</b> — a solo run of the entire night, any
                player possessed, time sped up — and two more views under the same roof:{" "}
                <Link href="/preview" className="underline" style={{ color: "var(--gold)" }}>
                  /preview
                </Link>{" "}
                shows all five faces the app can wear, side by side; and{" "}
                <Link href="/bible" className="underline" style={{ color: "var(--gold)" }}>
                  /bible
                </Link>{" "}
                is the full story, unredacted, run through the same structural checks the generator itself must pass
                before a story is allowed to ship.
              </p>
              <Row>
                <Shot file="20-preview-manor.png" alt="The Candlelit Manor theme preview" frame="crop" />
                <Shot file="20-preview-deco.png" alt="The Deco Noir theme preview" frame="crop" />
                <Shot file="20-preview-seance.png" alt="The Séance theme preview" frame="crop" />
              </Row>
            </SpoilerSection>

            <footer className="text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
              Captured by the machine on {captured} — {manifest.checksPassed}/{manifest.checksTotal} checks passed.
              This page is its own QA record.
            </footer>
          </div>
        </details>
      </main>
    </div>
  );
}
