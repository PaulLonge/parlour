"use client";

// Small UI primitives (D36): accordions, mobile-friendly tooltips, tab bar.
// Rules: never truncate text (wrap it); tooltips must work on touch (tap to
// toggle — hover `title` is desktop garnish only).

import { useState } from "react";

export function Accordion({
  title,
  kicker,
  defaultOpen = false,
  children,
}: {
  title: string;
  kicker?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel">
      <button
        className="flex w-full items-baseline justify-between gap-3 p-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          {kicker && <span className="kicker block">{kicker}</span>}
          <span className="font-display text-lg" style={{ color: "var(--gold)" }}>
            {title}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// tap-to-toggle hint — the mobile answer to a tooltip
export function InfoDot({ hint }: { hint: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        aria-label="what is this?"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] align-middle"
        style={{ borderColor: "var(--ink-dim)", color: "var(--ink-dim)" }}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
      >
        ?
      </button>
      {show && (
        <span
          className="panel absolute bottom-6 left-1/2 z-40 w-52 -translate-x-1/2 p-2 text-xs leading-snug normal-case"
          style={{ color: "var(--ink)", letterSpacing: "normal" }}
          onClick={() => setShow(false)}
        >
          {hint}
        </span>
      )}
    </span>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  badges = {},
}: {
  tabs: { key: T; label: string; icon: string }[];
  active: T;
  onChange: (t: T) => void;
  badges?: Partial<Record<T, number>>;
}) {
  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-40 mx-auto flex max-w-md border-t backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
          aria-current={active === t.key ? "page" : undefined}
          onClick={() => onChange(t.key)}
        >
          <span className={`text-lg ${active === t.key ? "" : "opacity-50"}`}>{t.icon}</span>
          <span
            className="text-[10px] tracking-wide uppercase"
            style={{ color: active === t.key ? "var(--gold)" : "var(--ink-dim)" }}
          >
            {t.label}
          </span>
          {(badges[t.key] ?? 0) > 0 && (
            <span
              className="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{ background: "var(--danger)", color: "var(--accent-ink)" }}
            >
              {badges[t.key]}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
