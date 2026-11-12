-- First-party analytics (docs/superpowers/specs/2026-11-07-analytics-design.md).
-- One row per client event. Server only (RLS on, no policies), like every other table.
create table if not exists events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),   -- when it happened, on the server's clock (client time + batch clock offset; else arrival)
  client_ts   timestamptz,                           -- client-reported time; skew check only
  device_id   uuid,                                  -- from the burner_device cookie
  session_id  text not null,                         -- per-tab sessionStorage id
  play_id     uuid references plays(id) on delete set null,
  name        text not null,
  props       jsonb not null default '{}',
  path        text,
  country     text,                                  -- edge geo header; the IP is never stored
  device_kind text                                   -- 'phone' | 'desktop'
);
create index if not exists events_ts_brin on events using brin (ts);
create index if not exists events_name_ts on events (name, ts);
create index if not exists events_play on events (play_id) where play_id is not null;
create index if not exists events_device_ts on events (device_id, ts);
create index if not exists plays_date on plays (puzzle_date);
alter table events enable row level security;
