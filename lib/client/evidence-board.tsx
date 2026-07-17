"use client";

// THE BOARD — private "My notes" reimagined as a corkboard the player pins and
// strings themselves (Paul, D71 follow-up). Interaction model anchored to The
// Gallery's "coldcase" room (guywithtwocats.github.io/TheGallery, MIT):
// drag + red-string + examine + keyboard ("tab to an item, arrows move it,
// enter examines"). Reimplemented from scratch, not ported — the anchor's
// strings are a fixed manifest with verlet-rope physics; ours are PLAYER-DRAWN
// (tap a note, tap another to tie/untie), so a cheap quadratic-curve sag
// stands in for the rope sim (a real physics loop would be wasted here).
//
// Storage stays device-local — same privacy line as the old plain-textarea
// notes ("yours alone — never leaves this phone"), just structured now:
// { v:2, notes:[{id,text,x,y}], links:[[id,id]] }, positions as PERCENTAGES
// of the board so a saved layout survives viewport/orientation changes.
// loadBoard() migrates the old plain-text blob in place on first read (see
// below) — nothing is lost, everything else about the storage contract is
// unchanged (same key, same "never leaves this phone" promise).

import { useEffect, useRef, useState } from "react";

type Note = { id: string; text: string; x: number; y: number }; // x,y: % of board, note CENTER
type LinkPair = [string, string];
type BoardData = { v: 2; notes: Note[]; links: LinkPair[] };

type CSSVars = React.CSSProperties & Record<string, string | number>;

const MAX_NOTE_LEN = 280;
const SAG_MIN = 3;
const SAG_MAX = 9;
const NUDGE = 3; // % per arrow key press
const NUDGE_FAST = 8; // with Shift
const LONG_PRESS_MS = 550;
const DRAG_THRESHOLD_PX = 6;
const WRITE_DEBOUNCE_MS = 300;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `n${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  }
}

// deterministic small tilt per note — same hash-a-seed trick as app/guide/page.tsx's
// tilt(), reimplemented locally (that file isn't a shared module): no Math.random
// at render time, so a pin's angle never drifts between renders or a reload.
function tiltFor(seed: string, spread = 3.2): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return (((h % 200) - 100) / 100) * spread;
}

function linkKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function sortPair(a: string, b: string): LinkPair {
  return a < b ? [a, b] : [b, a];
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// -------- migration -------------------------------------------------------
// Legacy MorePanel "My notes" was one free-text textarea stored raw at this
// same key. v2 is a structured board. On first read: if the stored value
// parses as v2 JSON, sanitize and use it; if it's not JSON (or doesn't match
// the shape), treat it as the legacy blob — split into one note per non-empty
// line (nothing lost) and scatter them on a loose grid + jitter so they don't
// all land in a pile — then write the migrated v2 shape straight back so
// every load after this one takes the fast path.
function loadBoard(key: string): BoardData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (!raw) return { v: 2, notes: [], links: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isObj(parsed) && parsed.v === 2 && Array.isArray(parsed.notes)) {
      const notes: Note[] = parsed.notes.filter(isObj).map((n) => ({
        id: typeof n.id === "string" && n.id ? n.id : newId(),
        text: typeof n.text === "string" ? n.text.slice(0, MAX_NOTE_LEN) : "",
        x: clamp(Number(n.x) || 50, 4, 96),
        y: clamp(Number(n.y) || 50, 6, 94),
      }));
      const ids = new Set(notes.map((n) => n.id));
      const rawLinks = Array.isArray(parsed.links) ? parsed.links : [];
      const seen = new Set<string>();
      const links: LinkPair[] = [];
      for (const p of rawLinks) {
        if (!Array.isArray(p) || p.length !== 2) continue;
        const [a, b] = p as [unknown, unknown];
        if (typeof a !== "string" || typeof b !== "string") continue;
        if (a === b || !ids.has(a) || !ids.has(b)) continue;
        const k = linkKey(a, b);
        if (seen.has(k)) continue;
        seen.add(k);
        links.push(sortPair(a, b));
      }
      return { v: 2, notes, links };
    }
  } catch {
    // not JSON — falls through to the legacy plain-text migration below
  }

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 60); // sanity cap — a free-text blob shouldn't become 200 slips
  if (lines.length === 0) {
    const empty: BoardData = { v: 2, notes: [], links: [] };
    try {
      localStorage.setItem(key, JSON.stringify(empty));
    } catch {}
    return empty;
  }
  const cols = Math.max(1, Math.round(Math.sqrt(lines.length)));
  const rows = Math.ceil(lines.length / cols);
  const notes: Note[] = lines.map((text, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = 12 + (col + 0.5) * (76 / cols);
    const baseY = 14 + (row + 0.5) * (72 / rows);
    return {
      id: newId(),
      text: text.slice(0, MAX_NOTE_LEN),
      x: clamp(baseX + (Math.random() * 14 - 7), 6, 94),
      y: clamp(baseY + (Math.random() * 10 - 5), 8, 92),
    };
  });
  const migrated: BoardData = { v: 2, notes, links: [] };
  try {
    localStorage.setItem(key, JSON.stringify(migrated));
  } catch {}
  return migrated;
}

export function EvidenceBoard({ storageKey }: { storageKey: string }) {
  const [board, setBoard] = useState<BoardData>(() => loadBoard(storageKey));
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean; pointerId: number } | null>(
    null,
  );
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced persistence (~300ms) — a drag fires many state updates a
  // second; storage writes shouldn't follow every one of them.
  useEffect(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(board));
      } catch {}
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [board, storageKey]);

  function addNote() {
    const text = draft.trim().slice(0, MAX_NOTE_LEN);
    if (!text) return;
    const id = newId();
    const x = clamp(30 + Math.random() * 40, 6, 94);
    const y = clamp(18 + Math.random() * 58, 8, 92);
    setBoard((b) => ({ ...b, notes: [...b.notes, { id, text, x, y }] }));
    setDraft("");
  }

  function updateNotePos(id: string, x: number, y: number) {
    setBoard((b) => ({
      ...b,
      notes: b.notes.map((n) => (n.id === id ? { ...n, x: clamp(x, 4, 96), y: clamp(y, 6, 94) } : n)),
    }));
  }

  function saveNoteText(id: string, text: string) {
    const trimmed = text.trim().slice(0, MAX_NOTE_LEN);
    setBoard((b) => ({ ...b, notes: b.notes.map((n) => (n.id === id ? { ...n, text: trimmed } : n)) }));
  }

  function deleteNote(id: string) {
    setBoard((b) => ({ v: 2, notes: b.notes.filter((n) => n.id !== id), links: b.links.filter((l) => l[0] !== id && l[1] !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
    setEditingId((cur) => (cur === id ? null : cur));
  }

  function toggleLink(a: string, b: string) {
    if (a === b) return;
    setBoard((brd) => {
      const key = linkKey(a, b);
      const exists = brd.links.some((l) => linkKey(l[0], l[1]) === key);
      return { ...brd, links: exists ? brd.links.filter((l) => linkKey(l[0], l[1]) !== key) : [...brd.links, sortPair(a, b)] };
    });
  }

  // shared tap/Enter model: first activation selects a note as the tie
  // source; activating a DIFFERENT note ties/unties the string and clears
  // selection; activating the SAME note again cancels the tie.
  // Reads `selectedId` from the closure rather than a setState updater
  // callback deliberately — toggleLink() is a side effect, and React (Strict
  // Mode, dev) double-invokes updater functions to catch exactly that; a
  // toggle called twice cancels itself out, so a string would never stick.
  function activate(id: string) {
    if (selectedId === null) {
      setSelectedId(id);
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    toggleLink(selectedId, id);
    setSelectedId(null);
  }

  function startEdit(id: string) {
    const n = board.notes.find((x) => x.id === id);
    if (!n) return;
    setSelectedId(null);
    setEditingId(id);
    setEditDraft(n.text);
  }
  function commitEdit() {
    if (!editingId) return;
    const text = editDraft.trim();
    if (!text) deleteNote(editingId);
    else saveNoteText(editingId, text);
    setEditingId(null);
  }
  function cancelEdit() {
    setEditingId(null);
  }

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function onNotePointerDown(e: React.PointerEvent, id: string) {
    if (editingId) return;
    const note = board.notes.find((n) => n.id === id);
    if (!note) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, ox: note.x, oy: note.y, moved: false, pointerId: e.pointerId };
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      if (dragRef.current && dragRef.current.id === id && !dragRef.current.moved) startEdit(id);
    }, LONG_PRESS_MS);
  }

  function onNotePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dxPx, dyPx) > DRAG_THRESHOLD_PX) {
      d.moved = true;
      clearLongPress();
    }
    if (!d.moved) return;
    updateNotePos(d.id, d.ox + (dxPx / rect.width) * 100, d.oy + (dyPx / rect.height) * 100);
  }

  function onNotePointerUp(e: React.PointerEvent, id: string) {
    const d = dragRef.current;
    clearLongPress();
    dragRef.current = null;
    if (d && d.id === id && d.pointerId === e.pointerId && !d.moved) activate(id);
  }

  function onNotePointerCancel() {
    clearLongPress();
    dragRef.current = null;
  }

  function onNoteKeyDown(e: React.KeyboardEvent, id: string) {
    if (editingId) return;
    const note = board.notes.find((n) => n.id === id);
    if (!note) return;
    const step = e.shiftKey ? NUDGE_FAST : NUDGE;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        updateNotePos(id, note.x - step, note.y);
        break;
      case "ArrowRight":
        e.preventDefault();
        updateNotePos(id, note.x + step, note.y);
        break;
      case "ArrowUp":
        e.preventDefault();
        updateNotePos(id, note.x, note.y - step);
        break;
      case "ArrowDown":
        e.preventDefault();
        updateNotePos(id, note.x, note.y + step);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        activate(id);
        break;
      case "Escape":
        if (selectedId) {
          e.preventDefault();
          setSelectedId(null);
        }
        break;
    }
  }

  const hint = editingId
    ? "editing a note — save, delete, or cancel"
    : selectedId
      ? "tap another note to tie a string to it — tap it again to cancel"
      : "drag a note to move it · tap to tie a string · ✎ to edit or delete · arrow keys nudge, enter ties";

  return (
    <div className="evidence-board">
      <style>{`
        .evidence-board { display: flex; flex-direction: column; gap: 0.75rem; }
        .board-add { display: flex; gap: 0.5rem; }
        .board-add .input { flex: 1; }
        .board-surface {
          position: relative;
          height: 64dvh;
          min-height: 320px;
          max-height: 560px;
          border-radius: var(--radius);
          border: 1px solid var(--border-strong);
          overflow: hidden;
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in srgb, var(--gold) 7%, transparent), transparent 60%),
            repeating-linear-gradient(0deg, color-mix(in srgb, currentColor 3%, transparent) 0 1px, transparent 1px 3px),
            repeating-linear-gradient(90deg, color-mix(in srgb, currentColor 3%, transparent) 0 1px, transparent 1px 3px),
            var(--panel-solid);
          box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.35);
          touch-action: none;
        }
        .board-strings { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
        .board-string {
          fill: none;
          stroke: color-mix(in srgb, var(--danger) 78%, black 8%);
          stroke-width: 2.4;
          opacity: 0.72;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }
        .board-string-lit {
          stroke: var(--danger);
          opacity: 1;
          filter: drop-shadow(0 0 3px color-mix(in srgb, var(--danger) 60%, transparent));
        }
        .board-empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          color: var(--ink-dim);
          font-style: italic;
          font-size: 0.9rem;
        }
        .board-note { position: absolute; width: min(46%, 168px); transform: translate(-50%, -50%); }
        .board-note-slip {
          position: relative;
          background: color-mix(in srgb, var(--panel-solid) 92%, var(--gold) 3%);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0.7rem 0.6rem 0.5rem;
          box-shadow: 2px 5px 10px rgba(0, 0, 0, 0.4);
          transform: rotate(var(--tilt));
          cursor: grab;
          touch-action: none;
          user-select: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .board-note-slip:active { cursor: grabbing; }
        .board-note-slip:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .board-note-selected {
          border-color: var(--danger);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 55%, transparent), 2px 5px 10px rgba(0, 0, 0, 0.4);
        }
        .board-pin {
          position: absolute;
          top: -7px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--danger) 40%, white 30%), var(--danger) 65%, color-mix(in srgb, var(--danger) 70%, black 25%));
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
        }
        .board-note-text {
          font-family: var(--font-body);
          font-size: 0.8rem;
          line-height: 1.35;
          color: var(--ink);
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 6.5em;
          overflow: hidden;
        }
        .board-note-edit-btn {
          position: absolute;
          top: -9px;
          right: -9px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: var(--panel-solid);
          border: 1px solid var(--border-strong);
          color: var(--ink-dim);
          font-size: 0.7rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .board-note-edit-btn:hover, .board-note-edit-btn:focus-visible { color: var(--gold); border-color: var(--gold); }
        .board-note-edit-panel {
          background: var(--panel-solid);
          border: 1px solid var(--border-strong);
          border-radius: 3px;
          padding: 0.5rem;
          box-shadow: 2px 6px 14px rgba(0, 0, 0, 0.45);
        }
        .board-note-edit-input {
          width: 100%;
          min-height: 4.5em;
          resize: vertical;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border);
          border-radius: 2px;
          color: var(--ink);
          font-family: var(--font-body);
          font-size: 0.8rem;
          padding: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .board-note-edit-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .board-note-edit-actions .btn { padding: 0.35rem 0.6rem; font-size: 0.7rem; }
        .board-hint { font-size: 0.72rem; text-align: center; color: var(--ink-dim); font-style: italic; }
        @media (prefers-reduced-motion: reduce) {
          .board-note-slip { transition: none; }
        }
      `}</style>

      <form
        className="board-add"
        onSubmit={(e) => {
          e.preventDefault();
          addNote();
        }}
      >
        <input
          className="input"
          aria-label="add a note to the board"
          placeholder="Pin a suspicion, an alibi, who toasted whom…"
          value={draft}
          maxLength={MAX_NOTE_LEN}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn btn-ghost" type="submit" disabled={!draft.trim()}>
          Pin it
        </button>
      </form>

      <div className="board-surface" ref={boardRef} role="group" aria-label="your evidence board — private, drag to arrange">
        <svg className="board-strings" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
          {board.links.map(([a, b]) => {
            const na = board.notes.find((n) => n.id === a);
            const nb = board.notes.find((n) => n.id === b);
            if (!na || !nb) return null;
            const mx = (na.x + nb.x) / 2;
            const my = (na.y + nb.y) / 2;
            const dist = Math.hypot(na.x - nb.x, na.y - nb.y);
            const sag = clamp(dist * 0.22, SAG_MIN, SAG_MAX); // cheap catenary stand-in — a real sim is wasted on a few inches of thread
            const lit = selectedId === a || selectedId === b;
            return (
              <path
                key={linkKey(a, b)}
                d={`M ${na.x} ${na.y} Q ${mx} ${my + sag} ${nb.x} ${nb.y}`}
                className={`board-string${lit ? " board-string-lit" : ""}`}
              />
            );
          })}
        </svg>

        {board.notes.length === 0 && <p className="board-empty">Nothing pinned yet. Add your first note above.</p>}

        {board.notes.map((n) => {
          const editing = editingId === n.id;
          return (
            <div key={n.id} className="board-note" style={{ left: `${n.x}%`, top: `${n.y}%`, "--tilt": `${tiltFor(n.id)}deg` } as CSSVars}>
              {editing ? (
                <div className="board-note-edit-panel">
                  <textarea
                    autoFocus
                    className="board-note-edit-input"
                    value={editDraft}
                    maxLength={MAX_NOTE_LEN}
                    aria-label="edit note text"
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                    }}
                  />
                  <div className="board-note-edit-actions">
                    <button type="button" className="btn btn-ghost" onClick={commitEdit}>
                      Save
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => deleteNote(n.id)}>
                      Delete
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`board-note-slip${selectedId === n.id ? " board-note-selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedId === n.id}
                    aria-describedby="board-hint"
                    aria-label={n.text ? `note: ${n.text}` : "empty note"}
                    onPointerDown={(e) => onNotePointerDown(e, n.id)}
                    onPointerMove={onNotePointerMove}
                    onPointerUp={(e) => onNotePointerUp(e, n.id)}
                    onPointerCancel={onNotePointerCancel}
                    onKeyDown={(e) => onNoteKeyDown(e, n.id)}
                  >
                    <span className="board-pin" aria-hidden="true" />
                    <p className="board-note-text">{n.text}</p>
                  </div>
                  <button type="button" className="board-note-edit-btn" aria-label="edit or delete this note" onClick={() => startEdit(n.id)}>
                    ✎
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="board-hint" id="board-hint" role="status">
        {hint}
      </p>
    </div>
  );
}
