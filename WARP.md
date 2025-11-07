# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.
``

Project overview
- Ingests the ASGR “Top 350 (Class of 2024)” page, parses player data, uploads images to Supabase Storage, and upserts rows into public.players.

Commands
- Install deps: npm install
- Development run (TypeScript via ts-node): npm run dev
- One-off sync (alias of dev): npm run sync
- Build TypeScript: npm run build
- Run compiled output: npm start
- Lint: not configured
- Tests: not configured

Environment
- Copy .env.example to .env and set:
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET_NAME
  - Optional: DIRECT_URL (only for local SQL execution), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

Database schema
- Apply schema.sql in Supabase SQL Editor, or run locally using an already-configured DIRECT_URL:
  - psql "$env:DIRECT_URL" -f schema.sql (PowerShell)
- public.players columns: id (bigserial PK), rank, name (text, required), position, height, high_school, state, committed_college, image_path, college_logo_path, source_url, created_at, updated_at
- Unique index on (name, rank) to support upserts
- Trigger set_players_updated_at keeps updated_at fresh on UPDATE

High-level architecture
- Entry point: src/index.ts
  1) Fetch HTML for the source rankings page (axios)
  2) Parse rows with cheerio into a normalized Player object: { rank, name, position, height, high_school, state, committed_college, imageUrl?, collegeLogoUrl?, source_url }
  3) Asset handling: download images/logos when present, generate stable filenames (slugify), upload to Supabase Storage under players/ and logos/ in the bucket SUPABASE_BUCKET_NAME; store resulting storage paths in image_path and college_logo_path
  4) Persistence: upsert into public.players using the (name, rank) unique key; service role key is required for Storage and DB writes
- TypeScript config: ES2020 target, ESNext modules, Node resolution, outDir dist, strict, esModuleInterop enabled (see tsconfig.json)

Operational notes
- Idempotency: upsert on (name, rank) prevents duplicate rows; updated_at is maintained by trigger
- Parser fragility: if the source page layout changes, update the cheerio selectors in parsePlayers() inside src/index.ts
- Storage: ensure the bucket named by SUPABASE_BUCKET_NAME exists (default in docs is asgr)
