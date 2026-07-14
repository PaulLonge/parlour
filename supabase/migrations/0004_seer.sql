-- PARLOUR — D56: THE SIGHT (the Seer, Traitors-style + the GDD review's
-- "authenticated evidence" need, in one). A scarce, earned charge lets a player
-- ask the machine ONE bounded true thing about ONE person. The truth domain is
-- deliberately narrow (allegiance snapshot, ledger yes/no, a count) — the front
-- man is NEVER confirmed; asking for it deflects to a true partial clue.
alter table public.players add column sight int not null default 0;

-- sight rides the players_select_own policy like the rest of a private row —
-- nobody sees anyone else's charges. Answers are delivered as private messages,
-- computed server-side, so the secrecy wall is never a client query.
