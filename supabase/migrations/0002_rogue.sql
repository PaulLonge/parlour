-- PARLOUR — ROGUE mode: economy, codes, meters, front man, message theatre
-- (docs/modes.md + docs/interaction-model.md, D21–D31)

-- ---------------------------------------------------------------------------
-- games: mode + rogue state
-- ---------------------------------------------------------------------------
alter table public.games add column mode text not null default 'murder';        -- murder | rogue
alter table public.games add column hijacked_at timestamptz;
alter table public.games add column meters jsonb not null default '{"plunder":0,"compute":0,"confidence":50}';
alter table public.games add column frontman_player_id uuid references public.players(id);

-- frontman identity is as secret as the sealed story: column-level revoke.
revoke select on public.games from anon, authenticated;
grant select (id, code, title, status, round_no, round_phase, paused, config,
              story_public, created_at, mode, hijacked_at, meters)
  on public.games to anon, authenticated;

-- ---------------------------------------------------------------------------
-- players: balance + burned flag (role text already flexible: faithful|minion)
-- ---------------------------------------------------------------------------
alter table public.players add column balance int not null default 0;
alter table public.players add column burned boolean not null default false;
alter table public.players add column eager boolean not null default false; -- D34: the lean-in flag (inverse of panic)

-- ---------------------------------------------------------------------------
-- transactions — append-only money trail. THE RECEIPTS at the reveal (Ledger
-- Three) replay from this table. claimed_source is what the player was told;
-- memos are theatre.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id             bigint generated always as identity primary key,
  game_id        uuid not null references public.games(id) on delete cascade,
  player_id      uuid not null references public.players(id) on delete cascade,
  amount         int not null,                       -- signed
  memo           text not null default '',
  claimed_source text not null default 'system',     -- rogue | good | vault | system
  created_at     timestamptz not null default now()
);
create index transactions_player_idx on public.transactions (player_id, id);
alter table public.transactions enable row level security;
create policy transactions_select_own on public.transactions
  for select using (player_id in (select id from public.players where auth_uid = auth.uid()));

-- ---------------------------------------------------------------------------
-- codes — the paper-slip layer (D21). Clients can NEVER select codes (knowing
-- them is cheating); all interaction via API routes.
-- ---------------------------------------------------------------------------
create table public.codes (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games(id) on delete cascade,
  code          text not null,                       -- BLACKTIDE etc (upper, no spaces)
  kind          text not null default 'slip',        -- slip | envelope | note (host-minted)
  color         text not null default 'parchment',   -- single colour (D-single-colour); field kept for other hosts
  state         text not null default 'printed',     -- printed | assigned | hidden | found | retired
  hider_id      uuid references public.players(id),
  finder_id     uuid references public.players(id),
  location_hint text,                                -- where the hider was told to put it
  hidden_at     timestamptz,
  found_at      timestamptz,
  created_at    timestamptz not null default now(),
  unique (game_id, code)
);
alter table public.codes enable row level security;  -- no client policies: server-only.

-- ---------------------------------------------------------------------------
-- messages: message theatre (D28) — claimed sender ≠ true origin
-- ---------------------------------------------------------------------------
alter table public.messages add column claimed_sender text; -- e.g. 'CALICO' | 'BOSUN' | null=house

-- ---------------------------------------------------------------------------
-- challenges: verification + response (D21). data jsonb carries
-- { verification: 'code'|'cross'|'submission'|'self', codeId?, amount?, side?, ... }
-- ---------------------------------------------------------------------------
alter table public.challenges add column response jsonb;    -- submissions / cross-conf answers

-- hacked-AI drafts (D28): player-composed AI messages awaiting director parse
create table public.forgeries (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  author_id   uuid not null references public.players(id) on delete cascade,
  as_sender   text not null,                          -- which AI they claim to be
  draft       text not null,
  status      text not null default 'pending',        -- pending | forwarded | edited | exposed | rejected
  final_text  text,
  created_at  timestamptz not null default now()
);
alter table public.forgeries enable row level security;
create policy forgeries_select_own on public.forgeries
  for select using (author_id in (select id from public.players where auth_uid = auth.uid()));

-- notes (D38): player-to-player mail, carried by the machine. Delivery is
-- instant UNLESS the sender or recipient is under surveillance (held for the
-- director) — and active wiretaps receive silent copies. The house carries
-- your letters; nothing about that arrangement is in your favour.
create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  sender_id    uuid not null references public.players(id) on delete cascade,
  recipient_id uuid not null references public.players(id) on delete cascade,
  text         text not null,
  postage      int not null default 0,
  status       text not null default 'delivered',   -- delivered | held | edited | dropped | leaked
  final_text   text,                                 -- what was actually delivered, if edited
  created_at   timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy notes_select_own_sent on public.notes
  for select using (sender_id in (select id from public.players where auth_uid = auth.uid()));
-- recipients read their mail via the messages table (delivery copies), so a
-- sender can never see whether/what was actually delivered. By design.

-- wiretaps (D38): tapper_id null = the machine itself holds the target's mail
create table public.wiretaps (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  tapper_id  uuid references public.players(id) on delete cascade,
  target_id  uuid not null references public.players(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.wiretaps enable row level security;  -- no client policies: server-only

-- petitions (D34): players propose their own schemes; the director grants,
-- declines in voice, or twists them. One open petition per player at a time.
create table public.petitions (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  text       text not null,
  status     text not null default 'pending',   -- pending | granted | declined | twisted
  created_at timestamptz not null default now()
);
alter table public.petitions enable row level security;
create policy petitions_select_own on public.petitions
  for select using (player_id in (select id from public.players where auth_uid = auth.uid()));

-- atomic balance updates (service-role only)
create or replace function public.increment_balance(p_player_id uuid, p_amount int)
returns void language sql security definer set search_path = public as
$$ update players set balance = balance + p_amount where id = p_player_id $$;
revoke execute on function public.increment_balance(uuid, int) from anon, authenticated;

alter publication supabase_realtime add table public.transactions;
