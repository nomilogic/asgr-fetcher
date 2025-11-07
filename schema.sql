-- Schema for ASGR ingestion

-- Players table (idempotent create)
create table if not exists public.players (
  id bigserial primary key,
  pid bigserial ,
  rank int,
  name text not null,
  grade_year int, -- e.g. 2024/2025/...
  position text,
  height text,
  high_school text,
  circuit_program text,
  state text,
  committed_college text,
  rating int,
  rating_comment text,
  image_path text,
  college_logo_path text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_rating_check check (rating is null or (rating >= 0 and rating <= 100))
);

-- Backfill-safe adds (no-op if already present)
alter table if exists public.players
  add column if not exists grade_year int,
  add column if not exists circuit_program text,
  add column if not exists rating int,
  add column if not exists rating_comment text;

-- Unique key: per player name + rank within a grade_year
drop index if exists players_name_rank_key;
drop index if exists players_name_rank_year_key;
drop index if exists players_class_year_rank_idx;
create unique index if not exists players_name_rank_grade_year_key on public.players (name, rank, grade_year);

-- Helpful read path
create index if not exists players_grade_year_rank_idx on public.players (grade_year, rank);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

-- High school rankings table (stores per-season/title ranks as JSON)
create table if not exists public.high_schools (
  id bigserial primary key,
  school text not null,
  logo_path text,
  ranks jsonb not null default '{}'::jsonb,     -- e.g. {"2023-24": 1, "2024-25": 3}
  records jsonb not null default '{}'::jsonb,   -- e.g. {"2023-24": "32-3"}
  key_wins jsonb not null default '{}'::jsonb,  -- e.g. {"2023-24": "CIF Open State Champion"}
  source_urls text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists high_schools_school_key on public.high_schools (school);

drop trigger if exists set_high_schools_updated_at on public.high_schools;
create trigger set_high_schools_updated_at
before update on public.high_schools
for each row execute function public.set_updated_at();

-- Circuit teams table (stores ranks/records/key_wins/placements as JSON keyed by season/title)
create table if not exists public.circuit_teams (
  id bigserial primary key,
  team text not null,
  circuit text,
  ranks jsonb not null default '{}'::jsonb,
  records jsonb not null default '{}'::jsonb,
  key_wins jsonb not null default '{}'::jsonb,
  placements jsonb not null default '{}'::jsonb, -- e.g. {"2024 Circuit Season": "Champion"}
  source_urls text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists circuit_teams_team_key on public.circuit_teams (team);

drop trigger if exists set_circuit_teams_updated_at on public.circuit_teams;
create trigger set_circuit_teams_updated_at
before update on public.circuit_teams
for each row execute function public.set_updated_at();
