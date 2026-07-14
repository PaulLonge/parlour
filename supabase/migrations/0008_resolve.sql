-- PARLOUR — D64: RESOLVE (GDD review #1). Declining a bribe was "do nothing";
-- now it EARNS. Each refusal banks a Resolve token, spendable on the good side's
-- tools (contribute compute, buy the Sight, raise a ward). Refusal becomes active
-- content, and taking every bribe stops being the dominant strategy.
alter table public.players add column resolve int not null default 0;
-- rides players_select_own — private, like the rest of your hand.
