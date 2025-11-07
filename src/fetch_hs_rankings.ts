import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "node:fs";

const http = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  },
  timeout: 30000,
});

const PAGES: Array<{ url: string; season: string; title: string }> = [
  {
    url: "https://0xc.821.myftpupload.com/hs-rankings-2/",
    season: "2023-24",
    title: "2023-24 High School Rankings",
  },
  {
    url: "https://0xc.821.myftpupload.com/2024-25-high-school-rankings/",
    season: "2024-25",
    title: "2024-25 High School Rankings",
  },
];

async function fetchHtml(url: string): Promise<string> {
  const res = await http.get(url, { responseType: "text", validateStatus: () => true });
  if (res.status >= 400) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.data as string;
}

function parseHsTable(html: string) {
  const $ = cheerio.load(html);
  const table = $(".player__rank-table .divTable");
  const rows = table.find("> .divRow");
  const items: Array<{
    rank: number | null;
    school: string;
    record?: string;
    keyWins?: string;
    logo?: string;
  }> = [];
  rows.each((_i, el) => {
    const $row = $(el);
    if ($row.hasClass("player-founder")) return; // skip popout rows if present

    const cells = $row.children(".divCell");
    const rankText = $row.find(".rank-count").first().text().trim();
    const rank = rankText ? parseInt(rankText.replace(/[^0-9]/g, ""), 10) : NaN;

    const school =
      $row.find(".player__name .player_name.name").text().trim() ||
      $row.find(".player__name a").text().trim();

    const logo = $row.find(".player__name figure img").attr("src") || undefined;
    const record = cells.eq(2).text().trim() || undefined; // W/L column
    const keyWins = cells.eq(3).text().trim() || undefined; // Key Wins column

    if (!school) return;
    items.push({ rank: Number.isNaN(rank) ? null : rank, school, record, keyWins, logo });
  });
  return items;
}

function mergeBySchool(perSeason: Record<string, any[]>) {
  const merged: Record<string, any> = {};
  for (const [season, arr] of Object.entries(perSeason)) {
    for (const row of arr) {
      const key = row.school;
      if (!merged[key]) merged[key] = { school: row.school, seasons: {}, records: {}, keyWins: {}, logos: {} };
      merged[key].seasons[season] = row.rank ?? null;
      if (row.record) merged[key].records[season] = row.record;
      if (row.keyWins) merged[key].keyWins[season] = row.keyWins;
      if (row.logo) merged[key].logos[season] = row.logo;
    }
  }
  return Object.values(merged);
}

async function main() {
  const perSeason: Record<string, any[]> = {};
  for (const p of PAGES) {
    try {
      console.log(`Fetching HS rankings: ${p.url}`);
      const html = await fetchHtml(p.url);
      if (/Please Log In|Not a Member|You need to be logged in/i.test(html)) {
        console.warn(`Skipping ${p.url}: login required.`);
        continue;
      }
      const rows = parseHsTable(html);
      console.log(`Parsed ${rows.length} rows for ${p.season}.`);
      perSeason[p.season] = rows;
      // write per-season file
      fs.mkdirSync("data", { recursive: true });
      fs.writeFileSync(`data/hs_rankings_${p.season}.json`, JSON.stringify(rows, null, 2), "utf-8");
    } catch (e) {
      console.warn(`Failed ${p.url}:`, (e as Error).message);
    }
  }
  const merged = mergeBySchool(perSeason);
  fs.writeFileSync("data/hs_rankings_combined.json", JSON.stringify(merged, null, 2), "utf-8");
  console.log(`Wrote combined ${merged.length} schools to data/hs_rankings_combined.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
