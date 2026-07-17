"use client";

// D76: THE CONTROL ROOM — a grouped, in-voice editor over content/controls.ts.
// Pure controlled component: `value` is the overrides partial the caller is
// building up to POST as `config`; nothing here fetches or persists. Preset
// values show until a control is touched, at which point the override wins
// (mirrors the server merge order in app/api/game/create/route.ts).

import { useState } from "react";
import { Accordion } from "@/lib/client/ui";
import { CONTROL_GROUPS, controlsByGroup, type Control } from "@/content/controls";
import type { GameConfig } from "@/lib/schemas/config";

// the overrides object mirrors a GameConfig partial (nested for mechanics.*),
// built purely from dotted-path writes below — loose on purpose, validated
// server-side by GameConfig.partial() on submit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ControlOverrides = Record<string, any>;

function getPath(obj: ControlOverrides, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => {
    if (o == null || typeof o !== "object") return undefined;
    return (o as ControlOverrides)[k];
  }, obj);
}

function setPath(obj: ControlOverrides, path: string, val: unknown): ControlOverrides {
  const parts = path.split(".");
  const next: ControlOverrides = { ...obj };
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...(cur[parts[i]] ?? {}) };
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
  return next;
}

// remove an override so the preset value shows again; prunes an emptied
// parent (e.g. resetting the only touched mechanics.* field drops `mechanics`)
function unsetPath(obj: ControlOverrides, path: string): ControlOverrides {
  const parts = path.split(".");
  const next: ControlOverrides = { ...obj };
  if (parts.length === 1) {
    delete next[parts[0]];
    return next;
  }
  const chain: ControlOverrides[] = [next];
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...(cur[parts[i]] ?? {}) };
    cur = cur[parts[i]];
    chain.push(cur);
  }
  delete cur[parts[parts.length - 1]];
  if (Object.keys(cur).length === 0) delete chain[chain.length - 2][parts[parts.length - 2]];
  return next;
}

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ControlRow({
  control,
  presetValue,
  overrideValue,
  onSet,
  onReset,
}: {
  control: Control;
  presetValue: unknown;
  overrideValue: unknown;
  onSet: (v: unknown) => void;
  onReset: () => void;
}) {
  // "touched" means genuinely different from the preset — not merely present
  // in the overrides object (nested writes copy untouched siblings in from
  // the preset too, see ControlRoom's onSet, so presence alone overclaims)
  const touched = overrideValue !== undefined && overrideValue !== presetValue;
  const effective = overrideValue !== undefined ? overrideValue : presetValue;
  const [tiersText, setTiersText] = useState(() => (Array.isArray(effective) ? effective.join(", ") : ""));

  return (
    <div className="flex flex-col gap-1.5 border-t py-3 first:border-t-0 first:pt-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {control.label}
        </span>
        <span
          className="text-[10px] tracking-wide uppercase"
          style={{ color: touched ? "var(--gold)" : "var(--ink-dim)" }}
        >
          {touched ? "your setting" : "house default"}
        </span>
      </div>

      {control.kind === "toggle" && (
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-dim)" }}>
          <input type="checkbox" checked={Boolean(effective)} onChange={(e) => onSet(e.target.checked)} />
          {effective ? "on" : "off"}
        </label>
      )}

      {control.kind === "tiers" && (
        <input
          className="input"
          inputMode="numeric"
          value={tiersText}
          onChange={(e) => {
            setTiersText(e.target.value);
            const nums = e.target.value
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n));
            if (nums.length) onSet(nums);
          }}
          onBlur={() => setTiersText(Array.isArray(effective) ? effective.join(", ") : tiersText)}
          placeholder={Array.isArray(presetValue) ? presetValue.join(", ") : ""}
        />
      )}

      {control.kind === "percent" && (
        <div className="flex items-center gap-2">
          <input
            className="input"
            type="number"
            min={(control.min ?? 0) * 100}
            max={(control.max ?? 1) * 100}
            step={(control.step ?? 0.05) * 100}
            value={Math.round(Number(effective ?? 0) * 100)}
            onChange={(e) => {
              const pct = Number(e.target.value);
              if (Number.isFinite(pct)) onSet(pct / 100);
            }}
          />
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
            {fmtPct(Number(effective ?? 0))}
          </span>
        </div>
      )}

      {(control.kind === "number" || control.kind === "minutes") && (
        <div className="flex items-center gap-2">
          <input
            className="input"
            type="number"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={Number(effective ?? 0)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onSet(n);
            }}
          />
          {control.kind === "minutes" && (
            <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
              min
            </span>
          )}
        </div>
      )}

      <p className="text-xs italic leading-snug" style={{ color: "var(--ink-dim)" }}>
        {control.blurb}
      </p>

      {touched && (
        <button type="button" className="self-start text-xs underline" style={{ color: "var(--ink-dim)" }} onClick={onReset}>
          reset to house default ({control.kind === "percent" ? fmtPct(Number(presetValue ?? 0)) : String(presetValue)})
        </button>
      )}
    </div>
  );
}

export function ControlRoom({
  preset,
  value,
  onChange,
}: {
  preset: GameConfig; // the resolved scenario preset merged over schema defaults
  value: ControlOverrides; // what the host has touched so far
  onChange: (next: ControlOverrides) => void;
}) {
  const grouped = controlsByGroup();

  // the server merge (`app/api/game/create/route.ts`) spreads
  // `{...scenario.preset, ...config}` SHALLOWLY, so a partial `mechanics: {codes:
  // false}` override would silently drop a preset's `notes`/`forgeries`
  // choice back to the schema default instead of the preset's. Once any
  // nested field is touched, write the WHOLE nested object (preset values for
  // untouched siblings + any prior overrides + the new leaf) so overrides
  // never accidentally erase preset intent on sibling fields.
  function setNested(key: string, v: unknown) {
    const parts = key.split(".");
    if (parts.length === 1) return onChange(setPath(value, key, v));
    const parentPath = parts.slice(0, -1).join(".");
    const leaf = parts[parts.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presetParent = (getPath(preset as any, parentPath) as ControlOverrides) ?? {};
    const overrideParent = (getPath(value, parentPath) as ControlOverrides) ?? {};
    const fullParent = { ...presetParent, ...overrideParent, [leaf]: v };
    onChange(setPath(value, parentPath, fullParent));
  }

  return (
    <div className="flex flex-col gap-3">
      {CONTROL_GROUPS.map((group) => {
        const controls = grouped[group] ?? [];
        if (!controls.length) return null;
        return (
          <Accordion key={group} title={group}>
            <div className="flex flex-col">
              {controls.map((control) => (
                <ControlRow
                  key={control.key}
                  control={control}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  presetValue={getPath(preset as any, control.key)}
                  overrideValue={getPath(value, control.key)}
                  onSet={(v) => setNested(control.key, v)}
                  onReset={() => onChange(unsetPath(value, control.key))}
                />
              ))}
            </div>
          </Accordion>
        );
      })}
    </div>
  );
}
