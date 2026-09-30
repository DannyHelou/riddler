-- Riddler schema (design brief §7.6). Server-side access only (service role key).
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Content
create table if not exists riddles (
  id                   text primary key,
  tier                 text not null check (tier in ('warmup','trap','boss')),
  category             text not null,
  answer_type          text not null check (answer_type in ('number','word')),
  prompt_md            text not null,
  prompt_short         text,               -- addition: short form for the debrief (§7.7 promptShort)
  hint_md              text not null,
  explain_intuition_md text not null,
  explain_math_md      text not null,
  time_limit_s         int  not null,
  -- number fields
  number_format        text check (number_format in ('percent','quantity')),
  answer_value         double precision,
  trap_value           double precision,
  closeness_cap        double precision,   -- 50 (pp) or 2 (decades) by default
  unit_label           text,               -- 'windows', 'flips'
  answer_display       text not null,      -- 'about 9%', 'piano'
  -- word fields
  accepted_answers     text[],
  trap_answers         text[],
  verified             boolean not null default false,
  credit               text
);

create table if not exists answer_embeddings (
  riddle_id  text not null references riddles(id),
  kind       text not null check (kind in ('accepted','trap')),
  text       text not null,
  embedding  vector(512) not null,          -- voyage-3-lite is 512-d
  primary key (riddle_id, kind, text)
);

create table if not exists daily_sets (
  puzzle_date   date primary key,
  puzzle_number int  not null unique,
  warmup_id     text not null references riddles(id),
  trap_id       text not null references riddles(id),
  boss_id       text not null references riddles(id)
);

-- Play data
create table if not exists plays (
  id               uuid primary key default gen_random_uuid(),
  device_id        uuid not null,
  puzzle_date      date not null references daily_sets(puzzle_date),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  total_score      int,
  final_percentile int,
  final_rq         int,
  unique (device_id, puzzle_date)
);

create table if not exists answers (
  play_id          uuid not null references plays(id) on delete cascade,
  riddle_id        text not null references riddles(id),
  slot             int  not null check (slot between 1 and 3),
  served_at        timestamptz not null,
  hint_used        boolean not null default false,
  raw_input        text,                     -- null on timeout
  parsed_value     double precision,         -- number riddles
  normalized_input text,                     -- word riddles
  closeness        double precision,         -- c in [0,1]
  ladder_level     text,                     -- number riddles
  verdict          text check (verdict in ('correct','trapped','wrong','timeout')),
  trapped          boolean not null default false,
  judge_source     text,                     -- exact | typo | embedding | llm | cache
  answered_at      timestamptz,
  points           int,
  primary key (play_id, slot)
);

create table if not exists word_verdicts (
  riddle_id        text not null references riddles(id),
  normalized_input text not null,
  verdict          text not null check (verdict in ('correct','trapped','wrong')),
  source           text not null,
  sim_accepted     double precision,
  sim_trap         double precision,
  created_at       timestamptz not null default now(),
  primary key (riddle_id, normalized_input)
);

create table if not exists verdict_reports (
  id               uuid primary key default gen_random_uuid(),
  riddle_id        text not null,
  normalized_input text not null,
  device_id        uuid not null,
  created_at       timestamptz not null default now()
);

create index if not exists plays_finished_by_date on plays (puzzle_date, total_score) where finished_at is not null;
create index if not exists answers_riddle_trapped on answers (riddle_id, trapped);
create index if not exists plays_device on plays (device_id);

-- Keep everything server-side: RLS on, no policies, so only the service role can read or write.
alter table riddles enable row level security;
alter table answer_embeddings enable row level security;
alter table daily_sets enable row level security;
alter table plays enable row level security;
alter table answers enable row level security;
alter table word_verdicts enable row level security;
alter table verdict_reports enable row level security;
