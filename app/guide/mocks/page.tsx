"use client";

// Two design-direction mockups for THE MANUAL, for Paul to compare on a real
// phone. Same guest-safe content slice, two visual identities. Temporary —
// delete this folder once a direction is chosen.

import Link from "next/link";

export default function Mocks() {
  return (
    <main className="themed theme-manor mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <p className="deco-rule kicker justify-center">design fitting room</p>
        <h1 className="font-display mt-3 text-4xl" style={{ color: "var(--gold)" }}>
          Two cuts of the manual
        </h1>
        <p className="mt-2 text-sm italic" style={{ color: "var(--ink-dim)" }}>
          Same cloth, two tailors. Wear each on your phone before choosing.
        </p>
      </header>
      <Link href="/guide/mocks/almanac" className="panel panel-hero block p-5">
        <p className="kicker">direction one</p>
        <p className="font-display text-2xl" style={{ color: "var(--gold)" }}>
          The Almanac
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          A printed volume from the house library — plates, drop caps, ornaments. Read at your own pace.
        </p>
      </Link>
      <Link href="/guide/mocks/cards" className="panel panel-hero block p-5">
        <p className="kicker">direction two</p>
        <p className="font-display text-2xl" style={{ color: "var(--gold)" }}>
          The Deck
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-dim)" }}>
          One idea per card, dealt to you. Tap through it in a minute flat.
        </p>
      </Link>
    </main>
  );
}
