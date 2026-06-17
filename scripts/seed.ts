import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(__dirname, "..", "db", "seed", "seed.sql");

async function main() {
  const sql = await readFile(SEED_FILE, "utf8");
  process.stdout.write("-> carregando seed ... ");
  await pool.query(sql);
  console.log("ok");
}

main()
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
