-- 0010: THE HEARTBEAT, venue-independent (D71 follow-through).
--
-- Today the only metronome is app/tv/[code]/page.tsx: an open TV tab polls
-- /api/director/tick every heartbeatSeconds while it's up. If nobody has the
-- TV open (it dies, nobody bothered, a laptop sleeps), the game stalls
-- between player actions until someone touches something. This migration
-- adds a Supabase-native backup metronome: pg_cron fires once a minute,
-- pg_net makes the HTTP call, and the app-side /api/director/cron route
-- (app/api/director/cron/route.ts) ticks EVERY active game itself — no game
-- code baked into the schedule, so it survives however many games run
-- across the party and needs no reconfiguration per game.
--
-- DRAFT — do NOT apply this by hand. The orchestrator applies it via the
-- Supabase MCP (apply_migration) after review, same as every other migration
-- in this repo.
--
-- *** MANUAL STEP AFTER APPLYING THIS FILE ***
-- The cron job reads its target URL + shared secret from the heartbeat_config
-- table below, deliberately kept OUT of this file (never commit the real
-- DIRECTOR_TICK_SECRET or deploy URL to git). Once this migration has been
-- applied AND the app is deployed, insert the one config row — via the
-- Supabase SQL editor or MCP execute_sql, NOT a migration:
--
--   insert into public.heartbeat_config (id, url, secret)
--   values (true, 'https://YOUR-APP.vercel.app', 'YOUR_DIRECTOR_TICK_SECRET')
--   on conflict (id) do update set url = excluded.url, secret = excluded.secret;
--
-- Until that row exists, parlour_heartbeat_tick() below is a harmless no-op
-- (it checks for the row and returns early) — cron will fire every minute
-- but make no HTTP call and touch no game.

-- no schema clause: pg_cron/pg_net are not relocatable (they own their cron/net
-- schemas) and a WITH SCHEMA clause makes CREATE EXTENSION fail on Supabase
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- heartbeat_config — singleton row holding the cron job's target. Same
-- shape as murders/beats/director_log (0001_init.sql): RLS enabled, NO
-- client policies, so it is reachable only by service-role / security
-- definer functions — never by anon/authenticated over PostgREST.
-- ---------------------------------------------------------------------------
create table if not exists public.heartbeat_config (
  id     boolean primary key default true,
  url    text not null,                -- deploy base URL, no trailing slash, e.g. https://parlour.vercel.app
  secret text not null,                 -- must equal DIRECTOR_TICK_SECRET in the deployed app's env
  constraint heartbeat_config_singleton check (id)  -- only one row, ever
);
alter table public.heartbeat_config enable row level security;
-- heartbeat_config: NO client policies => service-role / security-definer only.

-- ---------------------------------------------------------------------------
-- parlour_heartbeat_tick — what the cron job actually runs. A function
-- (rather than inlining the http_post call in cron.schedule's command
-- string) so the config lookup + no-op guard live in one place and the
-- schedule below stays a one-liner.
-- ---------------------------------------------------------------------------
create or replace function public.parlour_heartbeat_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg_url    text;
  cfg_secret text;
begin
  select url, secret into cfg_url, cfg_secret from public.heartbeat_config limit 1;
  if cfg_url is null or cfg_secret is null then
    return; -- config row not inserted yet -- see header comment; harmless no-op
  end if;

  perform net.http_post(
    url     := cfg_url || '/api/director/cron',
    headers := jsonb_build_object('content-type', 'application/json', 'x-tick-secret', cfg_secret),
    body    := '{}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The schedule itself. Idempotent: unschedule any prior job of this name
-- first (re-running this migration, or a future edit to the cron expression,
-- must never leave duplicate jobs double-ticking every game).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'parlour-heartbeat') then
    perform cron.unschedule('parlour-heartbeat');
  end if;
end;
$$;

select cron.schedule(
  'parlour-heartbeat',
  '* * * * *', -- every minute; /api/director/cron itself is cheap to call idly (see route header comment)
  $$ select public.parlour_heartbeat_tick(); $$
);

-- when the party's over:  select cron.unschedule('parlour-heartbeat');
