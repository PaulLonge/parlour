-- PARLOUR — pressure tools.
-- DEAD-DROP (D62): a message the machine holds and delivers later — on a timer,
-- or when a trigger fires (a burning, the unmasking). Gives the director tempo
-- and contingency ("if I'm ever burned, tell the room this"). Server-only;
-- delivery creates an ordinary message / public event, so no client policy.
create table public.scheduled_messages (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games(id) on delete cascade,
  recipient_id  uuid references public.players(id) on delete cascade, -- null = the room (public)
  body          text not null,
  claimed_sender text,
  trigger_kind  text not null default 'delay',   -- delay | on_burn | on_unmasking
  fire_at       timestamptz,                      -- for delay
  status        text not null default 'pending',  -- pending | fired | cancelled
  created_at    timestamptz not null default now()
);
alter table public.scheduled_messages enable row level security; -- no client policies: server-only
create index scheduled_messages_pending on public.scheduled_messages (game_id, status);

-- BLACKMAIL (D62) needs no table — it's a challenge (type 'mission') carrying
-- data.blackmail=true and data.leverage (what leaks on refusal). The expiry
-- sweep leaks the leverage publicly. Real teeth, enforced by the referee.
