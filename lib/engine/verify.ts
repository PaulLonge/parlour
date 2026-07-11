// ---------------------------------------------------------------------------
// Deterministic verification (D32): match answers without an AI call wherever
// possible. The ladder: exact/normalized match → close-typo match → AI judge
// (only for mismatches and genuinely open answers). "Candle vs flame" is
// solved upstream: expected-answer missions carry their accepted words, and
// glyph verification is TAPPED, never typed.
// ---------------------------------------------------------------------------

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// small, dependency-free edit distance for close-typo tolerance
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[a.length][b.length];
}

export type MatchResult = "match" | "close" | "miss";

// expected: accepted answers (any counts). tolerance scales with length.
export function matchAnswer(expected: string[], got: string): MatchResult {
  const g = normalize(got);
  if (!g) return "miss";
  for (const e of expected.map(normalize)) {
    if (!e) continue;
    if (g === e || g.includes(e) || e.includes(g)) return "match";
    const tol = e.length <= 4 ? 1 : e.length <= 8 ? 2 : 3;
    if (editDistance(g, e) <= tol) return "close";
  }
  return "miss";
}

// player-name matching (passphrase missions answer WHO): tolerant of first
// names, nicknames in quotes, and possessives.
export function matchPlayerName(candidates: string[], got: string): string | null {
  const g = normalize(got);
  for (const name of candidates) {
    const n = normalize(name);
    if (!n) continue;
    if (g === n || g.includes(n) || n.includes(g)) return name;
    const first = n.split(" ")[0];
    if (first.length >= 3 && (g === first || g.split(" ").includes(first))) return name;
  }
  return null;
}
