import { spawn } from "node:child_process";

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", env });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))));
    p.on("error", reject);
  });
}

async function main() {
  // Optional flags
  const flags = new Set(process.argv.slice(2));
  const skipHS = flags.has("--skip-hs");
  const skipCircuit = flags.has("--skip-circuit");
  const skipPlayers = flags.has("--skip-players");

  // Ensure HS first
  if (!skipHS) {
    console.log("[ingest-all] Ingesting high schools...");
    await run(process.execPath, ["--loader", "ts-node/esm", "src/ingest_hs_rankings.ts"]);
  } else {
    console.log("[ingest-all] Skipping high schools");
  }

  // Then circuit teams
  if (!skipCircuit) {
    console.log("[ingest-all] Ingesting circuit teams...");
    await run(process.execPath, ["--loader", "ts-node/esm", "src/ingest_circuit_rankings.ts"]);
  } else {
    console.log("[ingest-all] Skipping circuit teams");
  }

  // Finally players
  if (!skipPlayers) {
    console.log("[ingest-all] Ingesting players...");
    await run(process.execPath, ["--loader", "ts-node/esm", "src/index.ts"]);
  } else {
    console.log("[ingest-all] Skipping players");
  }

  console.log("[ingest-all] Done.");
}

main().catch((e) => {
  console.error("[ingest-all] Failed:", e.message);
  process.exit(1);
});
