import axios from "axios";
import * as cheerio from "cheerio";
import * as path from "node:path";
import * as crypto from "node:crypto";
import slugify from "slugify";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.SUPABASE_BUCKET_NAME || "asgr";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const http = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  },
  timeout: 30000,
});

const PAGES: Array<{ url: string; key: string }>= [
  { url: "https://0xc.821.myftpupload.com/hs-rankings-2/", key: "2023-24" },
  { url: "https://0xc.821.myftpupload.com/2024-25-high-school-rankings/", key: "2024-25" },
];

type TeamRow = {
  school: string;
  rank: number | null;
  record?: string;
  keyWins?: string;
  logoUrl?: string;
};

async function fetchHtml(url: string) {
  const res = await http.get(url, { responseType: "text", validateStatus: () => true });
  if (res.status >= 400) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.data as string;
}

function parseHsTable(html: string): TeamRow[] {
  const $ = cheerio.load(html);
  const table = $(".player__rank-table .divTable");
  const rows = table.find("> .divRow");
  const items: TeamRow[] = [];
  rows.each((_i, el) => {
    const $row = $(el);
    if ($row.hasClass("player-founder")) return;
    const cells = $row.children(".divCell");
    const rankText = $row.find(".rank-count").first().text().trim();
    const rank = rankText ? parseInt(rankText.replace(/[^0-9]/g, ""), 10) : NaN;
    const school =
      $row.find(".player__name .player_name.name").text().trim() ||
      $row.find(".player__name a").text().trim();
    const logo = $row.find(".player__name figure img").attr("src") || undefined;
    const record = cells.eq(2).text().trim() || undefined;
    const keyWins = cells.eq(3).text().trim() || undefined;
    if (!school) return;
    items.push({ school, rank: Number.isNaN(rank) ? null : rank, record, keyWins, logoUrl: logo });
  });
  return items;
}

async function bufferFromUrl(url: string): Promise<{ data: Buffer; contentType: string; ext: string }>{
  const res = await http.get(url, { responseType: "arraybuffer" });
  const contentType = res.headers["content-type"] || "application/octet-stream";
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("jpeg") || contentType.includes("jpg")
    ? ".jpg"
    : contentType.includes("webp")
    ? ".webp"
    : "";
  return { data: Buffer.from(res.data), contentType, ext };
}

async function uploadLogoIfNeeded(school: string, logoUrl?: string) {
  if (!logoUrl) return undefined;
  try {
    const { data, contentType, ext } = await bufferFromUrl(logoUrl);
    const guessExt = ext || ".png";
    const fileName = `${slugify(school, { lower: true, strict: true })}-${crypto.randomUUID()}${guessExt}`;
    const storagePath = path.posix.join("hs_logos", fileName);
    const { data: uploaded, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, data, { contentType, upsert: false });
    if (error) throw error;
    return uploaded?.path ?? storagePath;
  } catch (e) {
    console.warn(`Logo upload failed for ${school}:`, (e as Error).message);
    return undefined;
  }
}

async function upsertHighSchool(row: any) {
  const { data, error } = await supabase
    .from("high_schools")
    .upsert(row, { onConflict: "school" })
    .select();
  if (error) throw error;
  return data?.[0];
}

async function main() {
  // aggregate across pages by school
  const bySchool = new Map<string, { school: string; ranks: any; records: any; key_wins: any; logoUrl?: string; sources: Set<string> }>();

  for (const p of PAGES) {
    console.log(`Fetching HS page: ${p.key} -> ${p.url}`);
    const html = await fetchHtml(p.url);
    if (/Please Log In|Not a Member|You need to be logged in/i.test(html)) {
      console.warn(`Skipping ${p.url}: login required.`);
      continue;
    }
    const rows = parseHsTable(html);
    console.log(`Parsed ${rows.length} rows for ${p.key}.`);
    for (const r of rows) {
      const key = r.school;
      const existing = bySchool.get(key) ?? {
        school: r.school,
        ranks: {},
        records: {},
        key_wins: {},
        logoUrl: undefined,
        sources: new Set<string>(),
      };
      if (r.rank != null) existing.ranks[p.key] = r.rank;
      if (r.record) existing.records[p.key] = r.record;
      if (r.keyWins) existing.key_wins[p.key] = r.keyWins;
      if (r.logoUrl) existing.logoUrl = existing.logoUrl ?? r.logoUrl;
      existing.sources.add(p.url);
      bySchool.set(key, existing);
    }
  }

  // Upsert into DB with logo upload
  for (const entry of bySchool.values()) {
    const logo_path = await uploadLogoIfNeeded(entry.school, entry.logoUrl);
    const row = {
      school: entry.school,
      logo_path: logo_path ?? null,
      ranks: entry.ranks,
      records: entry.records,
      key_wins: entry.key_wins,
      source_urls: Array.from(entry.sources),
    };
    try {
      await upsertHighSchool(row);
    } catch (e) {
      console.warn(`DB upsert failed for ${entry.school}:`, (e as Error).message);
    }
  }

  console.log(`Done. Upserted ${bySchool.size} high schools.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
