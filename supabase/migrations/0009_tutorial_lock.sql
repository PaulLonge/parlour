-- 0009: THE INDUCTION's concurrency guard (closes the D70 open bug).
--
-- tutorialTick had no lock: two tickers hitting the same game at once (the TV
-- heartbeat racing a join auto-tick, or the capture harness) could both see a
-- step's completion condition met and both run the next step's moves --
-- duplicate letters on real phones, a polluted QA record. The step pointer is
-- the latest tutorial_step event, so the fix is structural: one marker row per
-- game+step. The race loser's insert now fails and the engine treats the
-- unique violation as "lost the race -- stand down" (lib/engine/tutorial.ts).
-- Same guard on tutorial_step_done so the induction's pass/skip record can
-- never double-count a step.

create unique index if not exists events_tutorial_step_once
  on events (game_id, (((payload->>'step'))::int))
  where type = 'tutorial_step';

create unique index if not exists events_tutorial_step_done_once
  on events (game_id, (((payload->>'step'))::int))
  where type = 'tutorial_step_done';
