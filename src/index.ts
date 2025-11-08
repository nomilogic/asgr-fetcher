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

const SOURCE_URLS = [
 "https://0xc.821.myftpupload.com/top-350-for-class-of-2024-2/",
  "https://0xc.821.myftpupload.com/top-350-for-class-of-2025/",
  "https://0xc.821.myftpupload.com/top-350-for-class-of-2026/",
  "https://0xc.821.myftpupload.com/top-350-for-class-of-2027/",
  "https://0xc.821.myftpupload.com/top-350-for-class-of-2028/",
];

type Player = {
  rank?: number;
  name: string;
  position?: string;
  height?: string;
  high_school?: string;
  state?: string;
  circuit_program?: string;
  committed_college?: string;
  rating?: number;
  rating_comment?: string;
  player_image_url?: string;
  college_logo_url?: string;
};

type ParsedData = { players: Player[] };

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: "text" });
  return res.data as string;
}

// NOTE: The structure of the target page may change. Adjust selectors accordingly.
function parsePlayers(html: string): ParsedData {
  const $ = cheerio.load(html);
  const players: Player[] = [];

  const rows = $(".player__rank-table .divTable .divRow").filter((_i, el) => {
    const $row = $(el);
    if ($row.hasClass("player-founder")) return false;
    return $row.find(".rank-count").length > 0;
  });

  rows.each((_i, row) => {
    const $row = $(row);
    const cells = $row.children(".divCell");

    const rankText = $row.find(".rank-count").first().text().trim();
    const rank = parseInt(rankText.replace(/[^0-9]/g, ""), 10);

    const nameText =
      $row.find(".player__name .name").text().trim() ||
      $row.find(".player__name a").text().trim();

    const heightText = cells.eq(2).text().trim(); // HT
    const posText = cells.eq(3).text().trim(); // POS
    // cells.eq(4) is Grad Year on page but we infer from URL
    const hsText = cells.eq(5).text().trim(); // High School (often "City, ST")
    const circuitProgram = cells.eq(6).text().trim(); // Circuit Program

    const collegeLogo = $row.find(".college__cell img").attr("src") || undefined;
    const collegeAlt = $row.find(".college__cell img").attr("alt") || undefined;

    const playerImg = $row.find(".player__name figure img").attr("src") || undefined;

    // Details row contains Rating and a quoted scouting blurb
    let rating: number | undefined;
    let rating_comment: string | undefined;
    const dataId = $row.find(".player__name a").attr("data_id");
    if (dataId) {
      const $detail = $(`.player__rank-table .divTable #document_${dataId}`).closest(".divRow");
      const detailText = $detail.find("p").first().text().trim();
      // Rating patterns: "Rating: 98", "Rating 98", "RATING-98"
      const mRating = detailText.match(/rating\s*[:\-]?\s*(\d{1,3})/i);
      if (mRating) {
        const r = parseInt(mRating[1], 10);
        if (!Number.isNaN(r) && r >= 0 && r <= 100) rating = r;
      }
      // Comment patterns: handle double quotes, smart quotes, single quotes
      const quoteMatchers = [
        /“([^”]+)”/,
        /"([^"]+)"/,
        /‘([^’]+)’/,
        /'([^']+)'/,
      ];
      for (const rx of quoteMatchers) {
        const m = detailText.match(rx);
        if (m && m[1]) { rating_comment = m[1].trim(); break; }
      }
      // If there is a single opening quote but no closing pair, take from first quote to end
      if (!rating_comment) {
        const firstQuoteIdx = detailText.search(/[“"‘']/);
        if (firstQuoteIdx !== -1) {
          const tail = detailText.slice(firstQuoteIdx + 1).trim();
          rating_comment = tail
            .replace(/^[“"‘']+/, "")
            .replace(/[”"’']+$/, "")
            .trim();
        }
      }
      // Fallback: text after the rating number if no quotes found
      if (!rating_comment && typeof rating === "number") {
        const after = detailText.replace(/.*?rating\s*[:\-]?\s*\d{1,3}\s*/i, "").trim();
        if (after) {
          rating_comment = after
            .replace(/^[-–—:\s]+/, "")
            .replace(/^[“"‘']+/, "")
            .replace(/[”"’']+$/, "")
            .trim();
        }
      }
    }

    if (!nameText) return;

    const p: Player = {
      name: nameText,
      rank: Number.isNaN(rank) ? undefined : rank,
      height: heightText || undefined,
      position: posText || undefined,
      high_school: hsText || undefined,
      circuit_program: circuitProgram || undefined,
      committed_college: collegeAlt || undefined,
      rating,
      rating_comment,
      player_image_url: playerImg,
      college_logo_url: collegeLogo,
    };

    players.push(p);
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
  const { data: existing } = await supabase.storage.from(bucket).list(path.dirname(filePath), {
    search: path.basename(filePath),
  });
  if (existing && existing.some((f) => f.name === path.basename(filePath))) {
    return { path: path.posix.join(path.dirname(filePath), path.basename(filePath)), alreadyExisted: true } as const;
  }

  const { data: uploaded, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, data, { contentType, upsert: false });
  if (error) throw error;
  return { path: uploaded?.path ?? filePath, alreadyExisted: false } as const;
}

async function ensureHighSchoolId(school?: string): Promise<number | undefined> {
  if (!school) return undefined;
  const { data: existing } = await supabase
    .from("high_schools")
    .select("id")
    .eq("school", school)
    .maybeSingle();
  if (existing?.id) return existing.id as number;
  const { data: inserted, error } = await supabase
    .from("high_schools")
    .upsert({ school, ranks: {}, records: {}, key_wins: {} }, { onConflict: "school" })
    .select("id")
    .single();
  if (error) throw error;
  return inserted!.id as number;
}

async function ensureCircuitTeamId(team?: string): Promise<number | undefined> {
  if (!team) return undefined;
  const { data: existing } = await supabase
    .from("circuit_teams")
    .select("id")
    .eq("team", team)
    .maybeSingle();
  if (existing?.id) return existing.id as number;
  const { data: inserted, error } = await supabase
    .from("circuit_teams")
    .upsert({ team, ranks: {}, records: {}, key_wins: {}, placements: {} }, { onConflict: "team" })
    .select("id")
    .single();
  if (error) throw error;
  return inserted!.id as number;
}

async function ensureCollegeId(name?: string, logoUrl?: string): Promise<{ id?: number; logo_path?: string }> {
  if (!name) return {};
  // Try existing
  const { data: existing } = await supabase
    .from("colleges")
    .select("id,logo_path")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return { id: existing.id as number, logo_path: existing.logo_path ?? undefined };

  let logo_path: string | undefined;
  if (logoUrl) {
    try {
      const res = await axios.get(logoUrl, { responseType: "arraybuffer" });
      const ct = res.headers["content-type"] || "image/png";
      const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ".jpg";
      const fileName = `${slugify(name, { lower: true, strict: true })}-${crypto.randomUUID()}${ext}`;
      const storagePath = path.posix.join("college_logos", fileName);
      const uploaded = await uploadIfNeeded(BUCKET, storagePath, Buffer.from(res.data), ct);
      logo_path = uploaded.path;
    } catch {
      // ignore logo upload failures
    }
  }
  const { data: inserted, error } = await supabase
    .from("colleges")
    .upsert({ name, logo_path, logo_url: logoUrl ?? null }, { onConflict: "name" })
    .select("id,logo_path")
    .single();
  if (error) throw error;
  return { id: inserted!.id as number, logo_path: inserted!.logo_path ?? logo_path };
}

async function upsertPlayer(row: any) {
  const { data, error } = await supabase
    .from("players")
    .upsert(row, { onConflict: "name" })
    .select();
  if (error) throw error;
  return data?.[0];
}

function toSlug(s: string) {
  return slugify(s, { lower: true, strict: true });
}

function extractClassYearFromUrl(url: string): number | undefined {
  const m = url.match(/(20\d{2})/);
  if (!m) return undefined;
  const yr = parseInt(m[1], 10);
  if (yr >= 2000 && yr <= 2100) return yr;
  return undefined;
}

function seasonKeyFromUrl(url: string): string {
  const yr = extractClassYearFromUrl(url);
  if (yr) return String(yr);
  try {
    const u = new URL(url);
    const seg = u.pathname.replace(/\/$/, "").split("/").pop() || "ranking";
    return seg;
  } catch {
    return "ranking";
  }
}

async function main() {
  const results: Array<{ name: string; id?: any; player_img?: string; college_logo?: string; url: string }> = [];

  for (const url of SOURCE_URLS) {
    console.log(`Fetching source HTML: ${url}`);
    const html = await fetchHtml(url);
    const parsed = parsePlayers(html);
    console.log(`Parsed ${parsed.players.length} players (pre-filter) from ${url}.`);

    const gradeYear = extractClassYearFromUrl(url);
    const seasonKey = seasonKeyFromUrl(url);

    for (const p of parsed.players) {
      const playerSlug = toSlug(p.name);

      let playerImgPath: string | undefined;
      if (p.player_image_url) {
        try {
          const { data, ext } = await bufferFromUrl(p.player_image_url);
          const guessExt = ext || ".jpg";
          const fileName = `${playerSlug}-${crypto.randomUUID()}${guessExt}`;
          const storagePath = path.posix.join("players", fileName);
          const contentType =
            ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
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
          const contentType =
            ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
          const uploaded = await uploadIfNeeded(BUCKET, storagePath, data, contentType);
          collegeLogoPath = uploaded.path;
        } catch (e) {
          console.warn(`College logo upload failed for ${p.name}:`, (e as Error).message);
        }
      }

      // Merge ranks JSON per player (by name)
      let existingRanks: Record<string, any> = {};
      try {
        const { data: existingRow } = await supabase
          .from("players")
          .select("id,ranks,image_path,college_logo_path")
          .eq("name", p.name)
          .maybeSingle();
        if (existingRow?.ranks) existingRanks = existingRow.ranks as Record<string, any>;
        // If no new image uploaded, keep existing paths to avoid nulling
        if (!playerImgPath && existingRow?.image_path) playerImgPath = existingRow.image_path;
        if (!collegeLogoPath && existingRow?.college_logo_path) collegeLogoPath = existingRow.college_logo_path;
      } catch {}

      const mergedRanks = { ...existingRanks };
      if (typeof p.rank === "number") mergedRanks[seasonKey] = p.rank;

      // Load/merge other per-season maps
      let existingRatings: Record<string, any> = {};
      let existingNotes: Record<string, any> = {};
      let existingPositions: Record<string, any> = {};
      let existingHeights: Record<string, any> = {};
      let existingHighSchools: Record<string, any> = {};
      let existingCircuits: Record<string, any> = {};
      let existingColleges: Record<string, any> = {};
      try {
        const { data: existingRow2 } = await supabase
          .from("players")
          .select("ratings,notes,positions,heights,high_schools,circuit_programs,committed_colleges,source_urls")
          .eq("name", p.name)
          .maybeSingle();
        if (existingRow2?.ratings) existingRatings = existingRow2.ratings;
        if (existingRow2?.notes) existingNotes = existingRow2.notes;
        if (existingRow2?.positions) existingPositions = existingRow2.positions;
        if (existingRow2?.heights) existingHeights = existingRow2.heights;
        if (existingRow2?.high_schools) existingHighSchools = existingRow2.high_schools;
        if (existingRow2?.circuit_programs) existingCircuits = existingRow2.circuit_programs;
        if (existingRow2?.committed_colleges) existingColleges = existingRow2.committed_colleges;
      } catch {}

      const ratings = { ...existingRatings };
      if (typeof p.rating === "number") ratings[seasonKey] = p.rating;

      const notes = { ...existingNotes };
      if (p.rating_comment) notes[seasonKey] = p.rating_comment;

      const positions = { ...existingPositions };
      if (p.position) positions[seasonKey] = p.position;

      const heights = { ...existingHeights };
      if (p.height) heights[seasonKey] = p.height;

      const high_schools = { ...existingHighSchools };
      if (p.high_school) high_schools[seasonKey] = p.high_school;

      const circuit_programs = { ...existingCircuits };
      if (p.circuit_program) circuit_programs[seasonKey] = p.circuit_program;

      const committed_colleges = { ...existingColleges };
      if (p.committed_college) committed_colleges[seasonKey] = p.committed_college;

      // Merge sources
      const source_urls = new Set<string>();
      try {
        const { data: srcRow } = await supabase
          .from("players")
          .select("source_urls")
          .eq("name", p.name)
          .maybeSingle();
        for (const s of srcRow?.source_urls || []) source_urls.add(s);
      } catch {}
      source_urls.add(url);

    // Ensure related IDs
      const high_school_id = await ensureHighSchoolId(p.high_school || undefined);
      const circuit_team_id = await ensureCircuitTeamId(p.circuit_program || undefined);
      const collegeInfo = await ensureCollegeId(p.committed_college || undefined, p.college_logo_url || undefined);
      const committed_college_id = collegeInfo.id;
      if (!collegeLogoPath && collegeInfo.logo_path) collegeLogoPath = collegeInfo.logo_path;

      const row = {
        name: p.name,
        grade_year: gradeYear ?? null,
        position: p.position ?? null,
        height: p.height ?? null,
        high_school: p.high_school ?? null,
        high_school_id: high_school_id ?? null,
        circuit_program: p.circuit_program ?? null,
        circuit_team_id: circuit_team_id ?? null,
        state: p.state ?? null,
        committed_college: p.committed_college ?? null,
        committed_college_id: committed_college_id ?? null,
        rating: p.rating ?? null,
        rating_comment: p.rating_comment ?? null,
        image_path: playerImgPath ?? null,
        college_logo_path: null, // prefer reference via committed_college_id
        source_url: url,
        source_urls: Array.from(source_urls),
        ranks: mergedRanks,
        ratings,
        notes,
        positions,
        heights,
        high_schools,
        circuit_programs,
        committed_colleges,
      } as any;

      try {
        const saved = await upsertPlayer(row);
        results.push({
          name: p.name,
          id: saved?.id,
          player_img: playerImgPath,
          college_logo: collegeLogoPath,
          url,
        });
      } catch (e) {
        console.warn(
          `DB upsert failed for ${p.name} (grade_year=${row.grade_year ?? "null"}, rating=${row.rating ?? "null"}):`,
          (e as Error).message
        );
      }
    }
  }

  console.log("Done. Sample:", results.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});