// ---------------------------------------------------------------------------
// The glyph handshake (D32, idea #1): proximity proof with zero paper and zero
// typing. Each player's phone shows a glyph that rotates on a time window,
// derived DETERMINISTICALLY from (gameId, playerId, window) — the server can
// recompute what any phone showed at any moment, so verification is a tap on
// a grid, never a typed word. No candle-vs-flame ambiguity by construction.
// ---------------------------------------------------------------------------

export const GLYPHS = [
  { key: "anchor", emoji: "⚓", word: "ANCHOR" },
  { key: "candle", emoji: "🕯️", word: "CANDLE" },
  { key: "skull", emoji: "☠️", word: "SKULL" },
  { key: "lantern", emoji: "🏮", word: "LANTERN" },
  { key: "compass", emoji: "🧭", word: "COMPASS" },
  { key: "bottle", emoji: "🍾", word: "BOTTLE" },
  { key: "key", emoji: "🗝️", word: "KEY" },
  { key: "wave", emoji: "🌊", word: "WAVE" },
] as const;
export type GlyphKey = (typeof GLYPHS)[number]["key"];

export const GLYPH_WINDOW_MINUTES = 10;

// deterministic string hash (FNV-1a) — stable across server and client
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function glyphWindow(at: Date = new Date()): number {
  return Math.floor(at.getTime() / (GLYPH_WINDOW_MINUTES * 60_000));
}

export function glyphFor(gameId: string, playerId: string, window = glyphWindow()) {
  return GLYPHS[fnv1a(`${gameId}:${playerId}:${window}`) % GLYPHS.length];
}

// verification: verifier taps a glyph key; server recomputes what the shown
// player's phone displayed in this window (and the previous one, for edge-of-
// window handshakes). Deterministic — no AI involved.
export function glyphMatches(
  gameId: string,
  shownPlayerId: string,
  tappedKey: string,
  at: Date = new Date()
): boolean {
  const w = glyphWindow(at);
  return (
    glyphFor(gameId, shownPlayerId, w).key === tappedKey ||
    glyphFor(gameId, shownPlayerId, w - 1).key === tappedKey
  );
}
