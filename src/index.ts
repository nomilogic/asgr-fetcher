import axios from "axios";
import * as cheerio from "cheerio";
import slugify from "slugify";
import { createClient } from "@supabase/supabase-js";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET_NAME || "asgr";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_URL = "https://0xc.821.myftpupload.com/top-350-for-class-of-2024-2/";

type Player = {
  rank?: number;
  name: string;
  position?: string;
  height?: string;
  high_school?: string;
  state?: string;
  committed_college?: string;
  player_image_url?: string;
  college_logo_url?: string;
};

type ParsedData = {
  players: Player[];
};

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: "text" });
  return res.data as string;
}

// NOTE: The structure of the target page may change. Adjust selectors accordingly.
function parsePlayers(html: string): ParsedData {
  const $ = cheerio.load(html);
  const players: Player[] = [];

  // Heuristic selectors (update once exact structure is known)
  $("article, .entry-content, .post, .elementor, .wp-block-table").each((_i, section) => {
    const sectionText = $(section).text();
    // Try table rows first
    $(section)
      .find("table tr")
      .each((_r, tr) => {
        const tds = $(tr).find("td");
        if (tds.length >= 2) {
          const rankText = $(tds[0]).text().trim();
          const nameText = $(tds[1]).text().trim();
          const rank = parseInt(rankText.replace(/[^0-9]/g, ""), 10);
          if (!nameText) return;
          const player: Player = { name: nameText };
          if (!Number.isNaN(rank)) player.rank = rank;

          // Best-effort parse for position/height/school/college, if present in later tds
          if (tds.length >= 3) player.position = $(tds[2]).text().trim() || undefined;
          if (tds.length >= 4) player.height = $(tds[3]).text().trim() || undefined;
          if (tds.length >= 5) player.high_school = $(tds[4]).text().trim() || undefined;
          if (tds.length >= 6) player.committed_college = $(tds[5]).text().trim() || undefined;

          // Try to discover images within row
          const imgUrls = $(tr)
            .find("img")
            .map((_j, img) => $(img).attr("src"))
            .get()
            .filter(Boolean) as string[];
          if (imgUrls.length > 0) {
            player.player_image_url = imgUrls[0];
            if (imgUrls.length > 1) player.college_logo_url = imgUrls[1];
          }
          players.push(player);
        }
      });

    // Fallback: try paragraphs that look like "1) Name - Pos - School - College"
    sectionText
      .split(/\n|\r/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((line) => {
        const m = line.match(/^(\d{1,3})\)?\s*[-.)]?\s*(.+)$/);
        if (m) {
          const rank = parseInt(m[1], 10);
          const rest = m[2];
          // naive split by " - "
          const parts = rest.split(/\s+-\s+/);
          const name = parts[0]?.trim();
          if (name) {
            const player: Player = { name, rank };
            player.position = parts[1]?.trim();
            player.high_school = parts[2]?.trim();
            player.committed_college = parts[3]?.trim();
            players.push(player);
          }
        }
      });
  });

  // De-duplicate by name+rank
  const seen = new Set<string>();
  const deduped: Player[] = [];
  for (const p of players) {
    const key = `${p.rank ?? ""}|${p.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  return { players: deduped };
}

async function bufferFromUrl(url: string): Promise<{ data: Buffer; ext: string }> {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const contentType = res.headers["content-type"] || "application/octet-stream";
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("jpeg") || contentType.includes("jpg")
    ? ".jpg"
    : contentType.includes("webp")
    ? ".webp"
    : "";
  return { data: Buffer.from(res.data), ext };
}

async function uploadIfNeeded(bucket: string, filePath: string, data: Buffer, contentType?: string) {
  // Check if exists
  const { data: existing } = await supabase.storage.from(bucket).list(path.dirname(filePath), {
    search: path.basename(filePath),
  });
  if (existing && existing.some((f) => f.name === path.basename(filePath))) {
    return { path: filePath, alreadyExisted: true } as const;
  }

  const { data: uploaded, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, data, { contentType, upsert: false });
  if (error) throw error;
  return { path: uploaded?.path ?? filePath, alreadyExisted: false } as const;
}

async function upsertPlayer(row: any) {
  const { data, error } = await supabase.from("players").upsert(row, { onConflict: "name,rank" }).select();
  if (error) throw error;
  return data?.[0];
}

function toSlug(s: string) {
  return slugify(s, { lower: true, strict: true });
}

async function main() {
  console.log("Fetching source HTML...");
  const html = await fetchHtml(SOURCE_URL);
  const parsed = parsePlayers(html);
  console.log(`Parsed ${parsed.players.length} players (pre-filter).`);

  const results: Array<{ name: string; id?: any; player_img?: string; college_logo?: string }> = [];

  for (const p of parsed.players) {
    const playerSlug = toSlug(p.name);

    let playerImgPath: string | undefined;
    if (p.player_image_url) {
      try {
        const { data, ext } = await bufferFromUrl(p.player_image_url);
        const guessExt = ext || ".jpg";
        const fileName = `${playerSlug}-${crypto.randomUUID()}${guessExt}`;
        const storagePath = path.posix.join("players", fileName);
        const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        const uploaded = await uploadIfNeeded(BUCKET, storagePath, data, contentType);
        playerImgPath = uploaded.path;
      } catch (e) {
        console.warn(`Player image upload failed for ${p.name}:`, (e as Error).message);
      }
    }

    let collegeLogoPath: string | undefined;
    if (p.college_logo_url) {
      try {
        const { data, ext } = await bufferFromUrl(p.college_logo_url);
        const guessExt = ext || ".png";
        const fileName = `${toSlug(p.committed_college || "college")}-${crypto.randomUUID()}${guessExt}`;
        const storagePath = path.posix.join("logos", fileName);
        const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
        const uploaded = await uploadIfNeeded(BUCKET, storagePath, data, contentType);
        collegeLogoPath = uploaded.path;
      } catch (e) {
        console.warn(`College logo upload failed for ${p.name}:`, (e as Error).message);
      }
    }

    const row = {
      rank: p.rank ?? null,
      name: p.name,
      position: p.position ?? null,
      height: p.height ?? null,
      high_school: p.high_school ?? null,
      state: p.state ?? null,
      committed_college: p.committed_college ?? null,
      image_path: playerImgPath ?? null,
      college_logo_path: collegeLogoPath ?? null,
      source_url: SOURCE_URL,
    };

    try {
      const saved = await upsertPlayer(row);
      results.push({ name: p.name, id: saved?.id, player_img: playerImgPath, college_logo: collegeLogoPath });
    } catch (e) {
      console.warn(`DB upsert failed for ${p.name}:`, (e as Error).message);
    }
  }

  console.log("Done. Sample:", results.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
