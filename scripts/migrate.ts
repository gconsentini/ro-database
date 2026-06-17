import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

async function main() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("Nenhuma migration encontrada em", MIGRATIONS_DIR);
    return;
  }

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`-> aplicando ${file} ... `);
    await pool.query(sql);
    console.log("ok");
  }
  console.log(`\n${files.length} migration(s) aplicada(s).`);
}

main()
  .catch((err) => {
    console.error("Falha na migration:", err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
