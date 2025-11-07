import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) {
  console.error("Missing DIRECT_URL env var for applying schema.");
  process.exit(1);
}

async function main() {
  const sqlPath = path.resolve(process.cwd(), "schema.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`schema.sql not found at ${sqlPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = new Client({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  try {
    const err = e as any;
    if (err?.message) {
      console.error('Error applying schema:', err.message);
    } else {
      console.error('Error applying schema:', JSON.stringify(err));
    }
  } catch {
    console.error(e);
  }
  process.exit(1);
});
