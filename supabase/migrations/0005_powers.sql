-- PARLOUR — D61: the secret powers economy (One Night Ultimate Werewolf).
-- Chaos isn't a player ROLE — the AI is the chaos engine, and it hands out
-- scarce one-use powers to anyone as rewards. Hidden powers scattered around the
-- room, nobody sure who holds what. The Sight (D56) was the first of these; here
-- come the ACTION/DEFENCE powers.
--
--   powers   — an inventory: {"rob":1,"swap":0,"copy":0,"shield":2}
--   shielded_until — while in the future, your purse can't be robbed and your
--                    mail can't be tapped (the reframed Shield — D59: no one dies,
--                    so it wards MONEY + PRIVACY, not life). Set by USING a shield
--                    charge, so you choose when to raise it.
alter table public.players add column powers jsonb not null default '{}';
alter table public.players add column shielded_until timestamptz;

-- both ride players_select_own like the rest of a private row — nobody sees
-- anyone else's inventory or ward. Involuntary effects (a rob landing on you)
-- reach you as a message + a balance change, never a live query of the attacker.
