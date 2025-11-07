import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

const PAGES: Array<{ url: string; key: string }> = [
  { url: "https://0xc.821.myftpupload.com/circuit-rankings/", key: "2024 Circuit Season" },
];

type CircuitRow = {
  team: string;
  circuit?: string;
  rank: number | null;
  record?: string;
  keyWins?: string;
  placement?: string; // Champion/Runner Up/Final 4/etc
};

async function fetchHtml(url: string) {
  const res = await http.get(url, { responseType: "text", validateStatus: () => true });
  if (res.status >= 400) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.data as string;
}

function parseCircuitTable(html: string): CircuitRow[] {
  const $ = cheerio.load(html);
  const table = $(".player__rank-table .divTable");
  const rows = table.find("> .divRow");
  const items: CircuitRow[] = [];
  rows.each((_i, el) => {
    const $row = $(el);
    if ($row.hasClass("player-founder")) return;

    const cells = $row.children(".divCell");
    const rankText = $row.find(".rank-count").first().text().trim();
    const rank = rankText ? parseInt(rankText.replace(/[^0-9]/g, ""), 10) : NaN;

    const circuitCell = cells.eq(1); // second column labeled "Circuit"
    const circuitText = circuitCell.text().trim();
    // team name often includes (EYBL/GUAA/3SSB/P24) and placement tokens
    // attempt to split: e.g., "CyFair Elite (EYBL) Champion"
    let team = circuitText;
    let circuit: string | undefined;
    let placement: string | undefined;

    const paren = circuitText.match(/^(.*)\s*\(([^)]+)\)\s*(.*)$/);
    if (paren) {
      team = paren[1].trim();
      circuit = paren[2].trim();
      const tail = paren[3].trim();
      if (/(Champion|Runner Up|Final 4|Elite 8|Sweet 16)/i.test(tail)) {
        placement = tail;
      }
    } else {
      // fallback: team text before double spaces; try to pick keyword placement
      const m = circuitText.match(/^(.*?)(Champion|Runner Up|Final 4|Elite 8|Sweet 16)?$/i);
      if (m) {
        team = (m[1] || circuitText).trim();
        placement = m[2]?.trim();
      }
    }

    const record = cells.eq(2).text().trim() || undefined; // W/L
    const keyWins = cells.eq(3).text().trim() || undefined; // Key Wins

    if (!team) return;
    items.push({ team, circuit, rank: Number.isNaN(rank) ? null : rank, record, keyWins, placement });
  });
  return items;
}

async function upsertCircuitTeam(row: any) {
  const { data, error } = await supabase
    .from("circuit_teams")
    .upsert(row, { onConflict: "team" })
    .select();
  if (error) throw error;
  return data?.[0];
}

async function main() {
  const byTeam = new Map<string, { team: string; circuit?: string; ranks: any; records: any; key_wins: any; placements: any; sources: Set<string> }>();

  for (const p of PAGES) {
    console.log(`Fetching Circuit page: ${p.key} -> ${p.url}`);
    const html = await fetchHtml(p.url);
    if (/Please Log In|Not a Member|You need to be logged in/i.test(html)) {
      console.warn(`Skipping ${p.url}: login required.`);
      continue;
    }
    const rows = parseCircuitTable(html);
    console.log(`Parsed ${rows.length} rows for ${p.key}.`);
    for (const r of rows) {
      const key = r.team;
      const existing = byTeam.get(key) ?? {
        team: r.team,
        circuit: r.circuit,
        ranks: {},
        records: {},
        key_wins: {},
        placements: {},
        sources: new Set<string>(),
      };
      if (!existing.circuit && r.circuit) existing.circuit = r.circuit;
      if (r.rank != null) existing.ranks[p.key] = r.rank;
      if (r.record) existing.records[p.key] = r.record;
      if (r.keyWins) existing.key_wins[p.key] = r.keyWins;
      if (r.placement) existing.placements[p.key] = r.placement;
      existing.sources.add(p.url);
      byTeam.set(key, existing);
    }
  }

  for (const entry of byTeam.values()) {
    const row = {
      team: entry.team,
      circuit: entry.circuit ?? null,
      ranks: entry.ranks,
      records: entry.records,
      key_wins: entry.key_wins,
      placements: entry.placements,
      source_urls: Array.from(entry.sources),
    };
    try {
      await upsertCircuitTeam(row);
    } catch (e) {
      console.warn(`DB upsert failed for ${entry.team}:`, (e as Error).message);
    }
  }

  console.log(`Done. Upserted ${byTeam.size} circuit teams.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
