import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const BUCKET = process.env.SUPABASE_BUCKET_NAME || "asgr";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FORCE = process.argv.includes("--force") || process.env.TRUNCATE_FORCE === "1";

async function deleteAllFrom(table: string) {
  console.log(`[truncate] Deleting all from ${table} ...`);
  const { error } = await supabase.from(table).delete().neq("id", 0);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function listAllPaths(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      if (item.name.endsWith("/")) continue;
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // Just keep path; id not required to remove
      }
      if (item.name && item.metadata?.mimetype) {
        // no-op; just informative
      }
      paths.push(fullPath);
    }
    if (data.length < limit) break;
    offset += data.length;
  }
  return paths;
}

async function removeAllUnder(prefix: string) {
  console.log(`[truncate] Removing storage under '${prefix}/' ...`);
  try {
    const files = await listAllPaths(prefix);
    if (files.length === 0) {
      console.log(`[truncate] No files under ${prefix}/`);
      return;
    }
    // Remove in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < files.length; i += batchSize) {
      const chunk = files.slice(i, i + batchSize);
      const { error } = await supabase.storage.from(BUCKET).remove(chunk);
      if (error) throw error;
    }
    console.log(`[truncate] Removed ${files.length} files from ${prefix}/`);
  } catch (e: any) {
    console.warn(`[truncate] Failed to remove under ${prefix}/:`, e.message);
  }
}

async function main() {
  if (!FORCE) {
    console.error("Refusing to truncate without confirmation. Run with --force or set TRUNCATE_FORCE=1.");
    process.exit(1);
  }

  // 1) Tables: delete players first (FK to others), then colleges, circuit_teams, high_schools
  await deleteAllFrom("players");
  await deleteAllFrom("colleges");
  await deleteAllFrom("circuit_teams");
  await deleteAllFrom("high_schools");

  // 2) Storage: known prefixes
  const prefixes = ["players", "logos", "hs_logos", "college_logos"];
  for (const p of prefixes) {
    await removeAllUnder(p);
  }

  console.log("[truncate] Done.");
}

main().catch((e) => {
  console.error("[truncate] Failed:", e.message);
  process.exit(1);
});
