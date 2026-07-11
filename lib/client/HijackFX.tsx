"use client";

// D35: the UI is the hijack. Wrap any page in this to (a) get the mode-aware
// theme class (decoy → hijacked for rogue games) and (b) play the glitch once,
// live, at the moment hijacked_at flips — every phone in the room at once.

import { useEffect, useRef, useState } from "react";

export function useRogueTheme(mode: string | undefined, hijackedAt: string | null | undefined) {
  const [glitching, setGlitching] = useState(false);
  const prev = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prev.current !== undefined && !prev.current && hijackedAt) {
      // it just happened, live: play the glitch
      setGlitching(true);
      const t = setTimeout(() => setGlitching(false), 2500);
      return () => clearTimeout(t);
    }
    prev.current = hijackedAt;
  }, [hijackedAt]);

  const themeClass =
    mode === "rogue" ? (hijackedAt ? "theme-hijacked themed" : "theme-decoy themed") : "";
  return { themeClass: `${themeClass} ${glitching ? "glitch-shake" : ""}`.trim(), glitching };
}

export function GlitchOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return <div className="glitch-overlay" aria-hidden />;
}
