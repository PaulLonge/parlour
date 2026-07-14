-- PARLOUR — D53: per-seat re-entry code (GDD review #9).
-- Pseudo-accounts stay tap-to-join, but TAKING OVER a name from a different
-- device now needs the seat's 4-digit code — so a drunk friend can't grab your
-- phone-name and read your private mail, alignment, and purse. The legitimate
-- owner sees their code in the More tab; if their phone dies, the host can look
-- it up (physically present) — recovery without magic links, per D14.
alter table public.players add column seat_code text;

-- seat_code is as private as the rest of a player's own row: readable only via
-- the existing players_select_own policy (auth_uid = auth.uid()). It is NOT in
-- players_public, so nobody can read anyone else's. No further grants needed.
