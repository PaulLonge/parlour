"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Landing() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="candle">
        <h1 className="font-display text-5xl tracking-widest" style={{ color: "var(--gold)" }}>
          PARLOUR
        </h1>
        <p className="mt-2 italic" style={{ color: "var(--ink-dim)" }}>
          An evening you were warned about.
        </p>
      </div>

      <form
        className="panel flex w-full flex-col gap-3 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) router.push(`/g/${code.trim().toUpperCase()}`);
        }}
      >
        <label className="text-sm" style={{ color: "var(--ink-dim)" }}>
          You were given a code. Whisper it here.
        </label>
        <input
          className="input text-center text-2xl tracking-[0.5em] uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          placeholder="····"
          autoFocus
        />
        <button className="btn" type="submit" disabled={!code.trim()}>
          Enter
        </button>
      </form>

      <Link href="/new" className="text-sm underline" style={{ color: "var(--ink-dim)" }}>
        I am the host — begin a new evening
      </Link>
    </main>
  );
}
