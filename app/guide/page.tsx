"use client";

// THE MANUAL, restyled as a CASE FILE dossier (D71 — Gallery room "coldcase" as
// taste anchor, MIT-licensed techniques borrowed: manila paper grain, typewriter
// type, rubber-stamp ink, punched holes, a file tab, evidence-photo tape
// corners, handwritten annotations, a sealed-bag spoiler curtain). Content and
// the two-tier structure are unchanged from THE MANUAL (D70): a guest-safe
// walkthrough of the app itself, then — behind the seal — the machinery of the
// hijack. Nothing in tier 1 may hint at the twist. Zero-config: no DB, no env,
// static content + the same 28 local screenshots only. This page is its own
// artifact — light manila paper, not theme-manor.

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

const FILE_NUMBER = "FILE 2026-P-1114";

type Frame = "phone" | "tv" | "crop";

function frameMaxW(frame: Frame) {
  return frame === "tv" ? "600px" : frame === "phone" ? "280px" : "320px";
}

// deterministic small tilt from a string seed — organic-looking without
// hydration drift (no Math.random on the server vs client).
function tilt(seed: string, spread = 1.6): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return (((h % 200) - 100) / 100) * spread;
}

function Paperclip({ rotate = 4, style }: { rotate?: number; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 30 84" className="paperclip" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
      <path
        d="M9 22 C9 12 21 12 21 22 L21 62 C21 72 7 72 7 62 L7 30 C7 24 15 24 15 30 L15 58"
        fill="none"
        stroke="#83786a"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M9 22 C9 12 21 12 21 22 L21 62" fill="none" stroke="#b0a893" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Stamp({
  text,
  tone = "ink",
  rotate = -5,
  className = "",
}: {
  text: string;
  tone?: "red" | "ink";
  rotate?: number;
  className?: string;
}) {
  return (
    <span className={`stamp stamp-${tone} ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {text}
    </span>
  );
}

function EvidencePhoto({
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
  const rot = tilt(file, 1.8);
  return (
    <figure className="evidence-photo" style={{ maxWidth: frameMaxW(frame), transform: `rotate(${rot}deg)` }}>
      <span className="tape tape-l" aria-hidden />
      <span className="tape tape-r" aria-hidden />
      <img
        src={`/guide/${file}`}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        className="evidence-photo-img"
        style={{ aspectRatio: `${w} / ${h}` }}
      />
      {caption && <figcaption className="hand">{caption}</figcaption>}
    </figure>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="evidence-row">{children}</div>;
}

function Exhibit({
  n,
  title,
  stamp,
  children,
}: {
  n: number;
  title: string;
  stamp?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet" style={{ transform: `rotate(${tilt("x" + title, 0.6)}deg)` }}>
      <Paperclip rotate={tilt(title + "clip", 9) - 3} style={{ top: "-22px", left: "9%" }} />
      <p className="sheet-kicker">
        Exhibit {n} — {title}
      </p>
      <div className="sheet-body">{children}</div>
      {stamp && <Stamp text={stamp} tone="ink" rotate={tilt(title + "stamp", 7)} className="corner-stamp" />}
    </section>
  );
}

function Memo({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="sheet sheet-memo" style={{ transform: `rotate(${tilt("m" + title, 0.6)}deg)` }}>
      <Paperclip rotate={tilt(title + "clip2", 9) - 3} style={{ top: "-22px", left: "8%" }} />
      <div className="sheet-head">
        <p className="sheet-kicker">
          Memo {n} — {title}
        </p>
        <Stamp text="Spoiler" tone="red" rotate={tilt(title + "sp", 9)} className="corner-stamp corner-stamp-lg" />
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  );
}

export default function Guide() {
  const captured = new Date(manifest.capturedAt).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dossier min-h-dvh">
      <style>{`
        .dossier {
          --manila: #d9c48f;
          --manila-deep: #c7ae76;
          --manila-shadow: #b39c62;
          --bond: #f3ead2;
          --bond-aged: #ecdfb9;
          --ink: #2a2317;
          --ink-dim: #5c4e36;
          --red: #9c2b21;
          --red-deep: #7c1f17;
          --pen: #2d3f5c;
          --font-type: ui-monospace, SFMono-Regular, Consolas, "Courier New", Courier, monospace;
          --font-hand: "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive;
          --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' seed='11'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.14 0 0 0 0 0.11 0 0 0 0 0.06 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23g)'/%3E%3C/svg%3E");
          background-color: var(--manila);
          background-image:
            radial-gradient(1100px 650px at 15% -10%, rgba(255,250,224,.4), transparent 60%),
            radial-gradient(1200px 800px at 105% 25%, rgba(110,80,35,.16), transparent 60%),
            var(--grain);
          color: var(--ink);
          font-family: var(--font-type);
          overflow-x: hidden;
        }
        .dossier a { color: var(--red-deep); }
        .dossier b { color: var(--ink); }

        .case-cover {
          position: relative;
          margin-top: 2.75rem;
          padding: 1.6rem 1.25rem 1.9rem;
          background: var(--bond);
          border: 1px solid rgba(0,0,0,.15);
          box-shadow: 0 6px 18px rgba(50,32,10,.3);
          text-align: center;
        }
        .punchholes {
          position: absolute; top: -15px; left: 50%; transform: translateX(-50%);
          display: flex; gap: min(22vw, 170px);
        }
        .punchholes span {
          width: 17px; height: 17px; border-radius: 50%;
          background: var(--manila-shadow);
          box-shadow: inset 0 2px 4px rgba(40,25,5,.5), 0 1px 0 rgba(255,250,230,.4);
        }
        .cover-tab {
          position: absolute; top: -32px; right: 6%;
          background: var(--manila-deep); color: var(--ink);
          padding: 6px 14px 16px; border-radius: 5px 5px 0 0;
          box-shadow: inset 0 -10px 14px -10px rgba(60,40,10,.5);
          font-size: .58rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
          white-space: nowrap;
        }
        .case-number { font-size: .7rem; letter-spacing: .18em; color: var(--ink-dim); text-transform: uppercase; }
        .case-title {
          font-family: var(--font-type); font-weight: 800;
          font-size: clamp(2.1rem, 9vw, 3rem); letter-spacing: .05em; margin-top: .3rem;
        }
        .case-subtitle { font-style: italic; color: var(--ink-dim); margin-top: .3rem; font-size: .9rem; }
        .case-desc { margin-top: 1rem; font-size: .85rem; color: var(--ink-dim); line-height: 1.55; }
        .cover-stamp { position: absolute; bottom: -16px; right: 8%; }

        .paperclip {
          position: absolute; width: 20px; height: 58px;
          filter: drop-shadow(1px 2px 1.5px rgba(60,40,10,.35));
          z-index: 2;
        }

        .stamp {
          display: inline-block; position: relative;
          font-family: var(--font-type); font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          border: 3px solid currentColor; border-radius: 3px;
          padding: .22em .55em .1em; font-size: .66rem;
        }
        .stamp-red { color: var(--red); background: color-mix(in srgb, var(--red) 7%, transparent); }
        .stamp-ink { color: var(--ink-dim); background: color-mix(in srgb, var(--ink-dim) 7%, transparent); }
        .stamp::after {
          content: ""; position: absolute; inset: -2px; border-radius: 3px;
          background-image: var(--grain); opacity: .5; mix-blend-mode: multiply; pointer-events: none;
        }
        .corner-stamp { position: absolute; bottom: -15px; right: 5%; }
        .corner-stamp-lg { font-size: .7rem; }

        .sheet {
          position: relative;
          background: var(--bond);
          border: 1px solid rgba(0,0,0,.14);
          box-shadow: 2px 5px 14px rgba(45,28,10,.26);
          padding: 1.35rem 1.25rem 1.85rem;
        }
        .sheet-memo { background: var(--bond-aged); }
        .sheet-kicker { font-size: .68rem; letter-spacing: .13em; text-transform: uppercase; color: var(--ink-dim); font-weight: 700; }
        .sheet-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1rem; }
        .sheet-body { margin-top: .8rem; display: flex; flex-direction: column; gap: .8rem; font-size: .9rem; line-height: 1.6; color: var(--ink); }

        .evidence-row { margin-top: .4rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.9rem 1.25rem; }
        .evidence-photo {
          position: relative; background: #fbf8ef; padding: 8px 8px 32px;
          box-shadow: 0 3px 10px rgba(40,25,10,.32); border: 1px solid rgba(0,0,0,.12);
          width: 100%;
        }
        .evidence-photo-img { width: 100%; display: block; object-fit: cover; background: rgba(0,0,0,.15); }
        .tape {
          position: absolute; top: -9px; width: 44px; height: 18px;
          background: linear-gradient(rgba(255,255,240,.68), rgba(255,255,240,.5));
          box-shadow: 0 1px 2px rgba(0,0,0,.15);
        }
        .tape-l { left: -6px; transform: rotate(-8deg); }
        .tape-r { right: -6px; transform: rotate(7deg); }
        figcaption.hand {
          position: absolute; left: 4px; right: 4px; bottom: 5px; text-align: center;
          font-family: var(--font-hand); color: var(--pen); font-size: 1.05rem; line-height: 1.1;
        }

        .seal { margin-top: .5rem; }
        .seal-flap {
          cursor: pointer; list-style: none;
          display: flex; flex-direction: column; gap: .65rem;
          background: var(--red); color: var(--bond);
          padding: 1.15rem 1.25rem; border-radius: 2px;
          box-shadow: 0 6px 18px rgba(60,10,5,.4);
          position: relative;
        }
        .seal-flap::-webkit-details-marker { display: none; }
        .seal-flap::marker { content: ""; }
        .seal-stamp {
          font-family: var(--font-type); font-weight: 800; letter-spacing: .12em; font-size: 1.15rem;
          text-transform: uppercase; border: 3px solid var(--bond); display: inline-block;
          padding: .18em .5em; align-self: flex-start; transform: rotate(-2deg);
        }
        .seal-text { font-size: .78rem; line-height: 1.55; }
        .seal-contents { margin-top: 1.35rem; display: flex; flex-direction: column; gap: 1.35rem; }

        .archive-stamp {
          align-self: center; margin: .5rem auto 0;
          width: 150px; height: 150px; border-radius: 50%;
          border: 3px double var(--ink-dim);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; gap: .3rem; padding: 1rem;
          transform: rotate(-5deg); color: var(--ink-dim);
          font-size: .56rem; letter-spacing: .07em; text-transform: uppercase; font-weight: 700;
          position: relative;
        }
        .archive-stamp::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background-image: var(--grain); opacity: .35; mix-blend-mode: multiply;
        }
        .archive-caption { text-align: center; font-family: var(--font-hand); color: var(--pen); font-size: .95rem; margin-top: .5rem; }
      `}</style>

      <main className="mx-auto flex max-w-2xl flex-col gap-9 px-4 pb-24 pt-4 md:px-8">
        {/* ------------------------------- CASE COVER ------------------------------- */}

        <header className="case-cover">
          <div className="punchholes" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="cover-tab">reading room copy — do not remove</div>
          <Paperclip rotate={-9} style={{ top: "-34px", left: "6%" }} />
          <p className="case-number">{FILE_NUMBER}</p>
          <h1 className="case-title">THE MANUAL</h1>
          <p className="case-subtitle">
            in the matter of <b>THE EVENING</b>
          </p>
          <p className="case-desc">
            How the evening works, illustrated. Every photograph on file is authentic — captured by the machine, of
            the machine, during its own staff induction, and entered here as exhibits.
          </p>
          <Stamp text="Admitted" tone="ink" rotate={-4} className="cover-stamp" />
        </header>

        {/* ---------------------------- TIER 1 — guest-safe ---------------------------- */}

        <Exhibit n={1} title="What this is">
          <p>
            A live party game, played on the phone already in your pocket. No installs, no accounts, no downloads —
            the address is the whole file.
          </p>
          <Row>
            <EvidencePhoto file="01-landing.png" alt="The PARLOUR landing screen, inviting a guest to enter a code" />
          </Row>
        </Exhibit>

        <Exhibit n={2} title="Getting in">
          <p>
            You'll be handed four letters — that's the evening's code. Enter it, then tap <b>your own name</b> on the
            guest list. If the host chose a word for tonight, say it back when asked; it just keeps your party
            separate from anyone else's. Phone died, or you're borrowing a friend's? A seat code lets you sit back
            down somewhere else without losing your place.
          </p>
          <Row>
            <EvidencePhoto file="03-join-screen.png" alt="The guest list join screen, tapping a name to claim it" />
          </Row>
        </Exhibit>

        <Exhibit n={3} title="The evening">
          <p>
            Arriving is itself part of the record — tapping "I have arrived" is logged the same as anything else that
            happens tonight. The status line at the top always states what phase the party is in. The party finds
            you; there's no homework to do beforehand.
          </p>
          <Row>
            <EvidencePhoto file="04-now-lobby.png" alt="The Now tab in the lobby, waiting for the evening to begin" />
            <EvidencePhoto file="07-arrive.png" alt="The arrival screen, marking a guest as present" />
          </Row>
        </Exhibit>

        <Exhibit n={4} title="Your tabs">
          <p>
            Your tabs, always filed in the same place along the bottom. <b>Now</b> — what's asked of you, most urgent
            first. <b>Inbox</b> — private, sealed letters; nobody else can read them. <b>More</b> — the rules, your
            private notes, and who's here tonight. Anything else down there will introduce itself when the night
            wants it to.
          </p>
          <Row>
            <EvidencePhoto file="08-inbox-letter.png" alt="An opened sealed letter in the Inbox tab" />
          </Row>
        </Exhibit>

        <Exhibit n={5} title="Votes & the post">
          <p>
            When it's time, votes happen right here in-app, gathered round the table — no show of hands, no ballots
            on paper. And if you've the means to send one, notes go through the post: write, and the house carries it
            to them, sealed and private.
          </p>
          <Row>
            <EvidencePhoto file="21-vote-table.png" alt="A vote table, choosing among the candidates present" frame="crop" />
            <EvidencePhoto file="21-message-envelope.png" alt="A sealed message envelope arriving in the Inbox" frame="crop" />
          </Row>
        </Exhibit>

        <Exhibit n={6} title="The house channel" stamp="Optional">
          <p>
            If the room has a screen to spare — a TV, a propped-up laptop — the house can put a face on it: the join
            code while guests trickle in, announcements for everyone at once, and a stage for the finale. Entirely
            optional. The game never needs it; everything the screen shows reaches your phone regardless.
          </p>
          <Row>
            <EvidencePhoto
              file="05-tv-gate.png"
              alt="The TV screen dark, waiting for its candles to be lit"
              caption="unlit — waiting for the host"
              frame="tv"
            />
            <EvidencePhoto
              file="06-tv-lobby.png"
              alt="The TV screen in the lobby, showing tonight's join code"
              caption="the lobby — join code up for the room"
              frame="tv"
            />
          </Row>
        </Exhibit>

        <Exhibit n={7} title="If you need out">
          <p>
            Hold the small ◦ button wherever you find it. A ring fills while you hold; let go early and nothing
            happens. It's private, it's instant, and it's always okay — no explanation owed to anyone, including the
            house.
          </p>
        </Exhibit>

        {/* -------------------------------- THE SEAL -------------------------------- */}

        <details className="seal">
          <summary className="seal-flap">
            <span className="seal-stamp">Sealed — spoilers</span>
            <span className="seal-text">
              Everything beyond this seal reveals the surprises of the night. If you will ever be a GUEST at this
              party, close the file now. Hosts: safe for you — the machinery is yours to know; only the WHO of the
              night stays sealed.
            </span>
          </summary>

          <div className="seal-contents">
            <Memo n={1} title="The premise">
              <p>
                The murder mystery billed on the invitation never really happens. Mid-way through the night, an AI
                hijacks the party: purses drained, new management installed live, on every phone in the room, at
                once. The interface itself performs the hijack — the same app changes its skin in front of you.
              </p>
              <Row>
                <EvidencePhoto file="20-preview-decoy.png" alt="The sunny Act 1 decoy interface, before the hijack" />
                <EvidencePhoto file="20-preview-hijacked.png" alt="The hijacked interface, after new management takes over" />
              </Row>
            </Memo>

            <Memo n={2} title="The economy">
              <p>
                Everyone gets a purse, and two meters tick for the whole room at once — the rogue's grip on the
                night, and the room's weapon against it. Bribes arm you the instant you accept one; there's no
                cooldown and no taking it back.
              </p>
              <Row>
                <EvidencePhoto file="11-meters-purse.png" alt="A player's purse and the twin room meters" />
                <EvidencePhoto file="21-bribe-card.png" alt="A bribe offer card, ready to accept" frame="crop" />
                <EvidencePhoto file="21-purse-chip.png" alt="The purse balance chip with recent transactions" frame="crop" />
              </Row>
            </Memo>

            <Memo n={3} title="The intrigue">
              <p>
                Secret marks let you check a claim without saying anything aloud — you show your glyph, they show
                theirs. Paper slips carrying codes get hidden around the venue and typed in on discovery. And the{" "}
                <b>Ask</b> tab buys you a paid audience with the machine, takes your schemes, and hears volunteers.
              </p>
              <Row>
                <EvidencePhoto file="21-glyph-badge.png" alt="A player's secret glyph mark, shown to verify identity" frame="crop" />
                <EvidencePhoto file="21-code-entry.png" alt="A code entry box for a found paper slip" frame="crop" />
                <EvidencePhoto file="14-ask-audience.png" alt="The Ask tab, buying an audience with the machine" />
              </Row>
            </Memo>

            <Memo n={4} title="Justice">
              <p>
                Accusations name the machine's human voice in the room — its "front man". Get it right, and they
                burn: exposed, but still playing. Get it wrong, and everyone pays for it. The night closes with one
                final naming made together — THE UNMASKING.
              </p>
              <Row>
                <EvidencePhoto file="10-vote.png" alt="The final unmasking vote, naming the front man together" />
              </Row>
            </Memo>

            <Memo n={5} title="The host's seat">
              <p>
                The host is a player too — just as blind as everyone else invited. Host tools exist for the practical
                side of running the night: breaking glass, skipping a step that's dragging. But who the machine
                picked, and who's really behind anything, stays sealed from the whole room — host included.
              </p>
              <Row>
                <EvidencePhoto file="13-host-tools.png" alt="The host tools panel, with break-glass and skip-step controls" />
                <EvidencePhoto file="12-more-about.png" alt="The full rulebook, shown in the More tab" />
              </Row>
            </Memo>

            <Memo n={6} title="Behind the curtain, further">
              <p>
                Every screenshot on file was taken by <b>THE INDUCTION</b> — a guided two-phone walkthrough that
                plays the whole night against itself, with each step checked by the real mechanic behind it, not
                eyeballed by hand.{" "}
                <Stamp text="Verified by the machine" tone="red" rotate={3} className="" />
              </p>
              <Row>
                <EvidencePhoto
                  file="02-new-evening.png"
                  alt="The new-evening screen, showing the scenario registry and the staff-induction toggle"
                />
              </Row>
              <p>
                There's also a <b>sandbox</b> — a solo run of the entire night, any player possessed, time sped up —
                and two more views under the same roof:{" "}
                <Link href="/preview" className="underline">
                  /preview
                </Link>{" "}
                shows all five faces the app can wear, side by side; and{" "}
                <Link href="/bible" className="underline">
                  /bible
                </Link>{" "}
                is the full story, unredacted, run through the same structural checks the generator itself must pass
                before a story is allowed to ship.
              </p>
              <Row>
                <EvidencePhoto file="20-preview-manor.png" alt="The Candlelit Manor theme preview" frame="crop" />
                <EvidencePhoto file="20-preview-deco.png" alt="The Deco Noir theme preview" frame="crop" />
                <EvidencePhoto file="20-preview-seance.png" alt="The Séance theme preview" frame="crop" />
              </Row>
            </Memo>

            <footer>
              <div className="archive-stamp">
                <span>Captured {captured}</span>
                <span>
                  {manifest.checksPassed}/{manifest.checksTotal} checks passed
                </span>
                <span>{FILE_NUMBER}</span>
              </div>
              <p className="archive-caption">this file is its own QA record.</p>
            </footer>
          </div>
        </details>
      </main>
    </div>
  );
}
