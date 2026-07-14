-- PARLOUR — D63: BOUNTY. A public price on an action, open to the whole room,
-- settled as a RACE — first to satisfy it wins. The public FACE (brief, reward)
-- is broadcast via a bounty_posted event; the ANSWER lives here, server-only, so
-- nobody can read the solution off the wire (same secrecy model as codes).
create table public.bounties (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  brief        text not null,
  reward       int not null check (reward > 0),
  kind         text not null default 'passphrase', -- passphrase | code
  expected     jsonb,                               -- accepted answers (passphrase) or [codeText]
  status       text not null default 'open',        -- open | claimed | expired
  claimed_by   uuid references public.players(id),
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.bounties enable row level security; -- no client policies: server-only (the answer must not leak)
create index bounties_open on public.bounties (game_id, status);
