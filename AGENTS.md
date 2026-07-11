<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PARLOUR — project brief for future sessions

Live social-deduction party engine for Paul's 30th (~14–15 Nov 2026, hard deadline;
playtest with 6–8 friends first). Paul describes intent, Claude implements; sessions
may run on different models — keep `DECISIONS.md` current, it is the source of truth
for every design/build decision and the "not built yet" queue.

Load-bearing invariants (do not silently break):
- The host is a BLIND player. Nothing may leak story/roles to any client: RLS +
  column grants on `games.sealed_story`; `murders`/`beats`/`director_log` have no
  client policies. All LLM calls server-side.
- Director proposes (zod `DirectorTool`), referee disposes (`lib/engine/referee.ts`
  legality map + DB kill-lock). The LLM never mutates state directly.
- Events table is append-only source of truth. Clients are read-only (writes via API routes).
- Browser-first: no install gates, no push dependency, no magic links. Pseudo-accounts
  (tap your name). Party specifics live in content/config, never code.
- Generation must never be a single point of failure: schema + structural validator +
  golden-story fallback (`content/golden-story.json` — deliberately spoiler-safe for Paul).

Verify with: `npm run build` and `npm run simulate` + `npm run simulate:rogue` (full
scripted games vs a real Supabase; needs `.env.local`).

Documentation rule (D40): any change to game mechanics, app behaviour, or the tech
stack updates `docs/OVERVIEW.md` (and its Last-updated date) in the same commit —
it is the shareable front door and Paul co-edits it; never overwrite his marginalia.
