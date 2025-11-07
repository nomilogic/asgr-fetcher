# ASGR ingestion to Supabase

This project scrapes the Top 350 for Class of 2024 page and loads the data into your Supabase DB and images into the `asgr` storage bucket.

## Setup

1) Copy `.env.example` to `.env` and fill in your values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME` (default `asgr`)
- Optionally: `DIRECT_URL` for running SQL migrations locally (not used by the app code)

2) Install deps (already handled):

```
npm install
```

3) Apply database schema (via Supabase SQL editor or psql):
- Open Supabase Dashboard > SQL > run contents of `schema.sql`
- Or use `psql` with your `DIRECT_URL` (do not paste secrets into commands in shared contexts)

## Run

- Development run (TypeScript directly):
```
npm run dev
```

- Build and run compiled JS:
```
npm run build
npm start
```

The script will:
- Fetch the source page HTML
- Parse player rows (best-effort; adjust selectors in `src/index.ts` if the page layout differs)
- Download player images and college logos if URLs are present
- Upload images to Supabase Storage under `players/` and `logos/`
- Upsert rows into `public.players` with a unique constraint on `(name, rank)`

## Notes
- The parser uses heuristics; if the target page’s structure changes, update selectors in `parsePlayers()`.
- Ensure your storage bucket (`asgr`) exists and your service role key has access.
- For production, add RLS policies as needed; this script uses the service role key on the server side only.
