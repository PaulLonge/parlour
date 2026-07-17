"use client";

// MOCK — direction one: THE ALMANAC. A printed volume from the house library:
// frontispiece, drop caps, engraved plates, fleuron dividers, marginalia.
// Reference energy: Blood on the Clocktower's almanac, Victorian instruction
// manuals. Guest-safe content only.

export default function AlmanacMock() {
  return (
    <div className="themed theme-manor almanac min-h-dvh">
      <style>{`
        .almanac { background:
          radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--gold) 7%, transparent), transparent 60%),
          var(--bg); }
        .almanac .lede::first-letter {
          font-family: var(--font-display); font-size: 3.4em; line-height: 0.82;
          float: left; padding: 0.04em 0.1em 0 0; color: var(--gold);
        }
        .almanac .plate {
          padding: 12px; border: 1px solid var(--border); border-radius: 2px;
          background: color-mix(in srgb, var(--panel) 70%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 22%, transparent),
                      0 12px 30px -18px rgba(0,0,0,0.8);
        }
        .almanac .plate img { display: block; width: 100%; border: 1px solid var(--border); }
        .almanac .plate-caption {
          margin-top: 10px; text-align: center; font-size: 0.7rem;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold);
        }
        .almanac .plate-caption em {
          display: block; margin-top: 2px; letter-spacing: 0.02em; text-transform: none;
          font-size: 0.75rem; color: var(--ink-dim);
        }
        .almanac .fleuron {
          display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0;
          color: color-mix(in srgb, var(--gold) 60%, transparent);
        }
        .almanac .fleuron::before, .almanac .fleuron::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(to var(--dir, right), transparent, color-mix(in srgb, var(--gold) 40%, transparent));
        }
        .almanac .fleuron::before { --dir: right; }
        .almanac .fleuron::after { --dir: left; }
        .almanac .margin-note {
          border-left: 2px solid color-mix(in srgb, var(--gold) 45%, transparent);
          padding-left: 0.9rem; font-style: italic; font-size: 0.8rem; color: var(--ink-dim);
        }
        .almanac .chapter-num {
          font-family: var(--font-display); font-size: 5.5rem; line-height: 1;
          color: color-mix(in srgb, var(--gold) 22%, transparent);
        }
      `}</style>

      <main className="mx-auto flex max-w-xl flex-col gap-8 p-6 pb-24 md:p-10">
        {/* frontispiece */}
        <header className="pt-6 text-center">
          <p className="kicker justify-center">from the house library</p>
          <h1 className="font-display mt-4 text-5xl tracking-wide" style={{ color: "var(--gold)" }}>
            The Parlour
            <br />
            Almanac
          </h1>
          <p className="mt-3 text-sm italic" style={{ color: "var(--ink-dim)" }}>
            being a guest's complete instruction
            <br />
            in the machinery of the evening
          </p>
          <div className="fleuron mt-6 justify-center">
            <span className="px-2 text-lg">❦</span>
          </div>
        </header>

        {/* chapter opening */}
        <section className="flex items-baseline gap-4">
          <span className="chapter-num">II</span>
          <div>
            <p className="kicker">chapter the second</p>
            <h2 className="font-display text-3xl" style={{ color: "var(--gold)" }}>
              Getting In
            </h2>
          </div>
        </section>

        <p className="lede text-[0.95rem] leading-7" style={{ color: "var(--ink-dim)" }}>
          You will be handed four letters — that is the evening's code, and the whole of your homework. Enter it,
          then tap your own name on the guest list; the house has been expecting you. Should the host have chosen a
          word for tonight, say it back when asked. It keeps your party separate from anyone else's, and the house
          enjoys the formality.
        </p>

        <figure className="plate mx-auto w-full max-w-[300px]">
          <img src="/guide/03-join-screen.png" alt="The guest list join screen" width={390} height={844} loading="lazy" />
          <figcaption className="plate-caption">
            Plate II
            <em>the guest list — tap your name to step inside</em>
          </figcaption>
        </figure>

        <div className="margin-note">
          A note for the forgetful: a phone that dies mid-evening loses nothing. A seat code — four digits, kept on
          your More tab — sits you back down on any other phone, exactly where you left off.
        </div>

        <div className="fleuron">
          <span className="px-2">❦</span>
        </div>

        {/* second spread */}
        <section className="flex items-baseline gap-4">
          <span className="chapter-num">III</span>
          <div>
            <p className="kicker">chapter the third</p>
            <h2 className="font-display text-3xl" style={{ color: "var(--gold)" }}>
              The Post
            </h2>
          </div>
        </section>

        <p className="text-[0.95rem] leading-7" style={{ color: "var(--ink-dim)" }}>
          Private mail lands in your Inbox, sealed. Nobody else can read it — not the person beside you, not the
          host. The house carries your letters. The house also reads your letters. Nothing about that arrangement
          is in your favour.
        </p>

        <div className="mx-auto flex w-full max-w-[300px] flex-col gap-6">
          <figure className="plate">
            <img src="/guide/08-inbox-letter.png" alt="A sealed letter, opened in the Inbox" width={390} height={844} loading="lazy" />
            <figcaption className="plate-caption">
              Plate III
              <em>a letter, sealed — yours alone</em>
            </figcaption>
          </figure>
        </div>

        <footer className="pt-4 text-center text-xs italic" style={{ color: "var(--ink-dim)" }}>
          — mockup ends. This is one chapter's worth of a direction, not the finished manual. —
        </footer>
      </main>
    </div>
  );
}
