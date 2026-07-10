-- PARLOUR — core schema
-- Design principles (see DECISIONS.md):
--  * events table is the append-only source of truth for the night
--  * all client WRITES go through Next.js API routes (service role); clients get
--    read-only, RLS-scoped SELECT + realtime. Secrets are unreachable, not hidden.
--  * players can read their OWN row (incl. role/character); everyone else's
--    public silhouette comes from the players_public view.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
create table public.games (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                -- short room code used in QR/URL
  title        text not null default 'The Gathering',
  status       text not null default 'lobby',
    -- lobby | act1 | round | endgame | reveal | ended
  round_no     int  not null default 0,
  round_phase  text not null default 'none',
    -- none | social | murder_window | body_found | assembly | vote | banishment
  paused       boolean not null default false,      -- break-glass pause
  config       jsonb not null default '{}',
    -- { target_end_at, traitor_ratio, arrival_threshold, round_minutes, ... }
  story_public jsonb,                               -- theme/skin safe for all clients
  sealed_story jsonb,                               -- FULL generated story. No client policy => unreachable.
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  auth_uid    uuid,                                  -- supabase anonymous auth uid (soft device binding)
  name        text not null,
  is_host     boolean not null default false,
  intake      jsonb not null default '{}',
    -- { age, occupation, relation_to_host, relations: [{name, how}], expected_arrival }
  status      text not null default 'lobby',
    -- lobby | alive | dead | ghost | banished  (dead/banished respawn into new characters)
  role        text not null default 'faithful',     -- faithful | traitor (visible only to self)
  character   jsonb,                                 -- private character sheet (visible only to self)
  arrived_at  timestamptz,
  panic       boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (game_id, name)
);

-- ---------------------------------------------------------------------------
-- events — append-only log, THE source of truth
-- ---------------------------------------------------------------------------
create table public.events (
  id         bigint generated always as identity primary key,
  game_id    uuid not null references public.games(id) on delete cascade,
  type       text not null,
    -- player_joined | player_arrived | phase_advanced | round_started | message_sent |
    -- challenge_offered | challenge_completed | challenge_expired | murder_committed |
    -- body_found | assembly_called | vote_opened | vote_cast | vote_closed |
    -- player_banished | player_died | player_respawned | announce | panic_pressed |
    -- seal_broken | director_note | game_ended ...
  actor_id   uuid references public.players(id),
  is_public  boolean not null default false,         -- public events power the house channel
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_game_idx on public.events (game_id, id);

-- ---------------------------------------------------------------------------
-- messages — per-player deliveries (secrets, tasks, flavor, info)
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  round_no   int  not null default 0,
  kind       text not null default 'info',
    -- secret | task | flavor | info | system | ghost_knowledge
  title      text not null default '',
  body       text not null default '',
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index messages_player_idx on public.messages (player_id, created_at);

-- ---------------------------------------------------------------------------
-- challenges — offered secret/kill challenges with lifecycle (hybrid arming)
-- ---------------------------------------------------------------------------
create table public.challenges (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  player_id    uuid not null references public.players(id) on delete cascade,
  type         text not null default 'social',       -- kill | social | secret
  brief        text not null,                        -- what the player reads
  data         jsonb not null default '{}',          -- method, target hints, etc.
  status       text not null default 'offered',      -- offered | completed | expired | revoked
  offered_at   timestamptz not null default now(),
  expires_at   timestamptz,
  completed_at timestamptz
);
create index challenges_player_idx on public.challenges (player_id, status);

-- ---------------------------------------------------------------------------
-- murders — killer identity NEVER selectable by clients; public knowledge
--           flows through body_found events (which omit the killer)
-- ---------------------------------------------------------------------------
create table public.murders (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  round_no   int not null,
  killer_id  uuid not null references public.players(id),
  victim_id  uuid not null references public.players(id),
  method     text,
  discovered boolean not null default false,
  created_at timestamptz not null default now()
);
-- THE kill lock (I10): two simultaneous kills in one round race here; the DB
-- picks a single winner and the referee converts the loser into a near-miss.
create unique index murders_one_per_round on public.murders (game_id, round_no);

-- ---------------------------------------------------------------------------
-- votes
-- ---------------------------------------------------------------------------
create table public.votes (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  round_no   int not null,
  voter_id   uuid not null references public.players(id) on delete cascade,
  target_id  uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, round_no, voter_id)
);

-- ---------------------------------------------------------------------------
-- beats — the director's evolving plan (server-only)
-- ---------------------------------------------------------------------------
create table public.beats (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  version    int not null default 1,
  plan       jsonb not null,
  created_at timestamptz not null default now()
);

-- director audit log (server-only): every proposal + referee verdict
create table public.director_log (
  id         bigint generated always as identity primary key,
  game_id    uuid not null references public.games(id) on delete cascade,
  trigger    text not null,                          -- heartbeat | event:<type> | breakglass
  input      jsonb not null default '{}',
  proposals  jsonb not null default '{}',
  verdicts   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players_public — the silhouette everyone may see (no role, no character,
-- no intake). SECURITY INVOKER + underlying grants handled via RLS-free view
-- pattern: we make it security_definer-ish by granting on the view only.
-- ---------------------------------------------------------------------------
create view public.players_public
  with (security_invoker = off) as
  select id, game_id, name, is_host, status, arrived_at, created_at
  from public.players;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.games        enable row level security;
alter table public.players      enable row level security;
alter table public.events       enable row level security;
alter table public.messages     enable row level security;
alter table public.challenges   enable row level security;
alter table public.murders      enable row level security;
alter table public.votes        enable row level security;
alter table public.beats        enable row level security;
alter table public.director_log enable row level security;

-- helper: the games the current auth uid has a player in
create or replace function public.my_game_ids()
returns setof uuid
language sql stable security definer set search_path = public as
$$ select game_id from players where auth_uid = auth.uid() $$;

-- games: members may read the game shell — but NEVER sealed_story.
-- sealed_story is protected by column privileges: revoke select from anon/authenticated.
create policy games_select on public.games
  for select using (id in (select public.my_game_ids()));
revoke select on public.games from anon, authenticated;
grant select (id, code, title, status, round_no, round_phase, paused, config, story_public, created_at)
  on public.games to anon, authenticated;

-- players: read ONLY your own full row
create policy players_select_own on public.players
  for select using (auth_uid = auth.uid());

-- events: members may read PUBLIC events of their games
create policy events_select_public on public.events
  for select using (is_public and game_id in (select public.my_game_ids()));

-- messages / challenges: recipient only
create policy messages_select_own on public.messages
  for select using (player_id in (select id from public.players where auth_uid = auth.uid()));
create policy challenges_select_own on public.challenges
  for select using (player_id in (select id from public.players where auth_uid = auth.uid()));

-- votes: read your own cast vote (tallies arrive as public events)
create policy votes_select_own on public.votes
  for select using (voter_id in (select id from public.players where auth_uid = auth.uid()));

-- murders / beats / director_log: NO client policies => service-role only.

-- players_public view: plain grants (view bypasses base-table RLS via owner)
grant select on public.players_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: per-player delivery = postgres_changes on messages/challenges
-- (RLS-scoped by WALRUS); public feed = events where is_public.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
