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
  return (
    <>
      {active && <div className="glitch-overlay" aria-hidden />}
      <MachineDrones />
    </>
  );
}

// D71 wave 2b: THE APIARY FLIP's ambient layer — little gears drifting where
// the apiary room has bees, standing in for the machine's drones once it
// takes over. GlitchOverlay is already mounted inside the themed root in
// every consumer (app/g/[code], app/tv/[code]), so this rides along there
// instead of requiring page-level wiring: it drops an invisible sentinel,
// walks up to the nearest `.themed` ancestor (the element useRogueTheme's
// themeClass is applied to), and watches its class list for `.theme-hijacked`
// via MutationObserver — live for the real-time flip, and correct on first
// paint for a player who joins/refreshes after the hijack already happened.
const DRONE_LAYOUT = [
  { left: "6%", top: "14%", size: 22, duration: 26, delay: -2 },
  { left: "82%", top: "8%", size: 16, duration: 31, delay: -14 },
  { left: "22%", top: "68%", size: 26, duration: 24, delay: -8 },
  { left: "68%", top: "72%", size: 18, duration: 29, delay: -20 },
  { left: "40%", top: "20%", size: 14, duration: 34, delay: -5 },
  { left: "90%", top: "50%", size: 20, duration: 27, delay: -17 },
  { left: "10%", top: "88%", size: 15, duration: 33, delay: -11 },
  { left: "55%", top: "42%", size: 24, duration: 22, delay: -25 },
] as const;

function MachineDrones() {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [hijacked, setHijacked] = useState(false);

  useEffect(() => {
    const host = sentinelRef.current?.closest(".themed") as HTMLElement | null;
    if (!host) return;
    const check = () => setHijacked(host.classList.contains("theme-hijacked"));
    check();
    const mo = new MutationObserver(check);
    mo.observe(host, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return (
    <>
      {/* invisible: exists only so we can walk up to the themed root above */}
      <span ref={sentinelRef} aria-hidden style={{ display: "none" }} />
      {hijacked && (
        <div className="machine-drones" aria-hidden>
          {DRONE_LAYOUT.map((d, i) => (
            <span
              key={i}
              className="machine-drone"
              style={{
                left: d.left,
                top: d.top,
                fontSize: `${d.size}px`,
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
              }}
            >
              ⚙
            </span>
          ))}
        </div>
      )}
    </>
  );
}
