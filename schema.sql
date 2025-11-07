-- Schema for ASGR ingestion

-- Players table
create table if not exists public.players (
  id bigserial primary key,
  rank int,
  name text not null,
  position text,
  height text,
  high_school text,
  state text,
  committed_college text,
  image_path text,
  college_logo_path text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: unique key on (name, rank) used by upsert
create unique index if not exists players_name_rank_key on public.players (name, rank);

-- Trigger to maintain updated_at
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
