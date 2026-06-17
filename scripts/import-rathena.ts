/**
 * Importador da base completa a partir do rAthena.
 *
 *   RATHENA_DIR=/caminho/para/rathena npm run import:rathena
 *
 * Se RATHENA_DIR nao for definido, tenta ../rathena ao lado deste repo.
 * Le os YAML de itens/monstros/skills e os scripts de spawn (.txt), e popula
 * o banco de forma idempotente (INSERT ... ON CONFLICT DO UPDATE).
 *
 * Nomes de exibicao em ingles (campo `Name` / `Description` do rAthena) vao
 * para as tabelas `*_i18n` no locale `en`. Traducoes pt-BR / es vivem nos
 * clientes e podem ser carregadas depois (ver docs/IMPORTING.md); ate la a API
 * cai no nome `en` e, na falta dele, no `aegis_name`.
 *
 * Drop rate segue o formato do rAthena: "por dez mil" (10000 = 100%).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import pg from "pg";
import { config } from "../src/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const RATHENA_DIR =
  process.env.RATHENA_DIR ?? resolve(REPO, "..", "rathena");
const RE = process.env.RATHENA_MODE === "pre-re" ? "pre-re" : "re";
const DB_DIR = join(RATHENA_DIR, "db", RE);
const SPAWN_DIR = join(RATHENA_DIR, "npc", RE, "mobs");

// ---------------------------------------------------------------------------
// Leitura de YAML do rAthena (Header / Body / Footer.Imports)
// ---------------------------------------------------------------------------
type AnyRec = Record<string, any>;

/** Le um YAML do rAthena e devolve o array `Body`, seguindo `Footer.Imports`. */
async function loadBody(path: string, seen = new Set<string>()): Promise<AnyRec[]> {
  if (seen.has(path)) return [];
  seen.add(path);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    console.warn(`  ! arquivo ausente: ${path}`);
    return [];
  }
  // rAthena as vezes repete chaves no mesmo bloco; uniqueKeys:false evita erro
  // (a ultima ocorrencia vence), logLevel silencia os avisos correspondentes.
  const doc = parseYaml(raw, { uniqueKeys: false, logLevel: "silent" }) as
    | AnyRec
    | null;
  const body: AnyRec[] = Array.isArray(doc?.Body) ? doc!.Body : [];
  const imports: AnyRec[] = doc?.Footer?.Imports ?? [];
  for (const imp of imports) {
    if (imp?.Path) body.push(...(await loadBody(join(RATHENA_DIR, imp.Path), seen)));
  }
  return body;
}

// ---------------------------------------------------------------------------
// Helpers de conversao
// ---------------------------------------------------------------------------
const truthyKeys = (m: AnyRec | undefined): string[] =>
  m ? Object.entries(m).filter(([, v]) => v === true).map(([k]) => k) : [];

/** Heuristica de tipo de mapa a partir do nome do .gat. */
function mapType(id: string): string {
  if (/_(in|inside)\b|^in_|_room|_cas|^job_/.test(id)) return "indoor";
  if (/fild|field/.test(id)) return "field";
  if (/dun|dunr|_d\d|cave|labyrinth|tomb|nyd|gef_dun|prt_sew/.test(id))
    return "dungeon";
  if (/prontera|morocc|geffen|payon|alberta|izlude|aldebaran|comodo|amatsu|gonryun|umbala|niflheim|louyang|ayothaya|einbroch|lighthalzen|hugel|rachel|veins|moscovia|brasilis|dewata|malangdo|mora|eclage|prt_fild00$/.test(
      id,
    )
  )
    return "town";
  return "field";
}

// ---------------------------------------------------------------------------
// Upsert em lote
// ---------------------------------------------------------------------------
async function upsert(
  client: pg.PoolClient,
  table: string,
  cols: string[],
  rows: AnyRec[],
  conflict: string[],
  update: string[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const CHUNK = 400;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = slice.map((r, ri) => {
      const ph = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`);
      for (const c of cols) values.push(r[c] ?? null);
      return `(${ph.join(", ")})`;
    });
    const action = update.length
      ? `UPDATE SET ${update.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`
      : "NOTHING";
    await client.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES ${tuples.join(", ")} ` +
        `ON CONFLICT (${conflict.join(", ")}) DO ${action}`,
      values,
    );
    total += slice.length;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Parsers de dominio
// ---------------------------------------------------------------------------
interface Parsed {
  items: AnyRec[];
  itemI18n: AnyRec[];
  itemIdByAegis: Map<string, number>;
  itemTypeById: Map<number, string>;
  monsters: AnyRec[];
  monsterI18n: AnyRec[];
  drops: AnyRec[];
  skills: AnyRec[];
  skillI18n: AnyRec[];
}

function parseItems(body: AnyRec[], out: Parsed) {
  for (const it of body) {
    const id = Number(it.Id);
    if (!id || !it.AegisName) continue;
    const type = String(it.Type ?? "Etc");
    out.itemIdByAegis.set(it.AegisName, id);
    out.itemTypeById.set(id, type);
    out.items.push({
      id,
      aegis_name: it.AegisName,
      type,
      subtype: it.SubType ?? null,
      slots: Number(it.Slots ?? 0),
      weight: Number(it.Weight ?? 0),
      attack: Number(it.Attack ?? 0),
      magic_attack: Number(it.MagicAttack ?? 0),
      defense: Number(it.Defense ?? 0),
      weapon_level: it.WeaponLevel != null ? Number(it.WeaponLevel) : null,
      armor_level: it.ArmorLevel != null ? Number(it.ArmorLevel) : null,
      equip_level_min: it.EquipLevelMin != null ? Number(it.EquipLevelMin) : null,
      equip_level_max: it.EquipLevelMax != null ? Number(it.EquipLevelMax) : null,
      refineable: it.Refineable === true,
      buy_price: it.Buy != null ? Number(it.Buy) : null,
      sell_price: it.Sell != null ? Number(it.Sell) : null,
      jobs: truthyKeys(it.Jobs),
      locations: truthyKeys(it.Locations),
    });
    if (it.Name) {
      out.itemI18n.push({ item_id: id, locale: "en", name: it.Name, description: null });
    }
  }
}

function parseMonsters(body: AnyRec[], out: Parsed) {
  for (const mob of body) {
    const id = Number(mob.Id);
    if (!id || !mob.AegisName) continue;
    const isMvp =
      mob.Modes?.Mvp === true || Number(mob.MvpExp ?? 0) > 0 || !!mob.MvpDrops;
    out.monsters.push({
      id,
      aegis_name: mob.AegisName,
      level: Number(mob.Level ?? 1),
      hp: Number(mob.Hp ?? 1),
      sp: Number(mob.Sp ?? 0),
      base_exp: Number(mob.BaseExp ?? 0),
      job_exp: Number(mob.JobExp ?? 0),
      atk_min: Number(mob.Attack ?? 0),
      atk_max: Number(mob.Attack2 ?? 0),
      defense: Number(mob.Defense ?? 0),
      magic_defense: Number(mob.MagicDefense ?? 0),
      str: Number(mob.Str ?? 1),
      agi: Number(mob.Agi ?? 1),
      vit: Number(mob.Vit ?? 1),
      int: Number(mob.Int ?? 1),
      dex: Number(mob.Dex ?? 1),
      luk: Number(mob.Luk ?? 1),
      race: String(mob.Race ?? "Formless"),
      element: String(mob.Element ?? "Neutral"),
      element_level: Number(mob.ElementLevel ?? 1),
      size: String(mob.Size ?? "Small"),
      is_mvp: isMvp,
      is_boss: mob.Class === "Boss",
    });
    if (mob.Name) {
      out.monsterI18n.push({ monster_id: id, locale: "en", name: mob.Name });
    }

    // Drops (normais + MVP), deduplicando por (item, drop_type) com maior taxa.
    const best = new Map<string, AnyRec>();
    const addDrop = (d: AnyRec, mvp: boolean) => {
      const itemId = out.itemIdByAegis.get(d.Item);
      if (!itemId) return; // item nao importado -> ignora
      const itemType = out.itemTypeById.get(itemId);
      const dropType = mvp
        ? "mvp"
        : itemType === "Card"
          ? "card"
          : d.StealProtected === true
            ? "steal_protected"
            : "normal";
      const key = `${itemId}|${dropType}`;
      const rate = Number(d.Rate ?? 0);
      const prev = best.get(key);
      if (!prev || rate > prev.rate) {
        best.set(key, { monster_id: id, item_id: itemId, rate, drop_type: dropType });
      }
    };
    for (const d of mob.Drops ?? []) addDrop(d, false);
    for (const d of mob.MvpDrops ?? []) addDrop(d, true);
    out.drops.push(...best.values());
  }
}

function parseSkills(body: AnyRec[], out: Parsed) {
  for (const sk of body) {
    const id = Number(sk.Id);
    if (!id || !sk.Name) continue;
    out.skills.push({
      id,
      aegis_name: sk.Name,
      max_level: Number(sk.MaxLevel ?? 1),
      type: sk.Type ?? null,
      target: sk.TargetType ?? null,
      element: sk.Element ?? null,
    });
    if (sk.Description) {
      out.skillI18n.push({
        skill_id: id,
        locale: "en",
        name: sk.Description,
        description: null,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Spawns: scripts .txt (mapa,x,y[,xs,ys]<TAB>monster<TAB>nome<TAB>mobId,qtd,delay[,delay2])
// ---------------------------------------------------------------------------
async function walkTxt(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walkTxt(p)));
    else if (e.endsWith(".txt")) out.push(p);
  }
  return out;
}

interface SpawnAgg {
  monster_id: number;
  map_id: string;
  amount: number;
  respawn_min_s: number | null;
  respawn_max_s: number | null;
}

async function parseSpawns(
  validMonsters: Set<number>,
): Promise<{ spawns: SpawnAgg[]; maps: Set<string> }> {
  const files = await walkTxt(SPAWN_DIR);
  const agg = new Map<string, SpawnAgg>();
  const maps = new Set<string>();

  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("//")) continue;
      const cols = line.split("\t").filter((c) => c !== "");
      if (cols.length < 4) continue;
      const kind = (cols[1] ?? "").trim();
      if (kind !== "monster" && kind !== "boss_monster") continue;

      const mapId = (cols[0] ?? "").split(",")[0]?.trim();
      const spec = (cols[cols.length - 1] ?? "").split(","); // "1002,20,5000,5000"
      const mobId = Number(spec[0]);
      if (!mapId) continue;
      if (!Number.isFinite(mobId) || !validMonsters.has(mobId)) continue;

      const amount = Number(spec[1] ?? 1) || 1;
      const d1 = spec[2] != null ? Math.round(Number(spec[2]) / 1000) : null;
      const d2 = spec[3] != null ? Math.round(Number(spec[3]) / 1000) : null;

      maps.add(mapId);
      const key = `${mobId}|${mapId}`;
      const prev = agg.get(key);
      if (!prev) {
        agg.set(key, {
          monster_id: mobId,
          map_id: mapId,
          amount,
          respawn_min_s: d1,
          respawn_max_s: d2 ?? d1,
        });
      } else {
        prev.amount += amount;
        if (d1 != null) prev.respawn_min_s = Math.min(prev.respawn_min_s ?? d1, d1);
        const hi = d2 ?? d1;
        if (hi != null) prev.respawn_max_s = Math.max(prev.respawn_max_s ?? hi, hi);
      }
    }
  }
  return { spawns: [...agg.values()], maps };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`rAthena: ${RATHENA_DIR} (modo ${RE})`);

  console.log("Lendo YAML...");
  const out: Parsed = {
    items: [],
    itemI18n: [],
    itemIdByAegis: new Map(),
    itemTypeById: new Map(),
    monsters: [],
    monsterI18n: [],
    drops: [],
    skills: [],
    skillI18n: [],
  };

  parseItems(await loadBody(join(DB_DIR, "item_db.yml")), out);
  parseMonsters(await loadBody(join(DB_DIR, "mob_db.yml")), out);
  parseSkills(await loadBody(join(DB_DIR, "skill_db.yml")), out);

  const validMonsters = new Set(out.monsters.map((m) => m.id));
  console.log("Lendo spawns...");
  const { spawns, maps } = await parseSpawns(validMonsters);

  console.log(
    `Parsed: ${out.items.length} itens, ${out.monsters.length} monstros, ` +
      `${out.skills.length} skills, ${out.drops.length} drops, ` +
      `${spawns.length} spawns, ${maps.size} mapas`,
  );

  if (process.env.DRYRUN) {
    console.log("DRYRUN: parsing validado, banco nao foi tocado.");
    return;
  }

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    console.log("Gravando no banco (transacao)...");
    await client.query("BEGIN");

    await upsert(
      client,
      "locale",
      ["code", "label"],
      [
        { code: "pt-BR", label: "Português (Brasil)" },
        { code: "es", label: "Español (LATAM)" },
        { code: "en", label: "English" },
      ],
      ["code"],
      ["label"],
    );

    await upsert(
      client,
      "map",
      ["id", "type"],
      [...maps].map((id) => ({ id, type: mapType(id) })),
      ["id"],
      ["type"],
    );

    const itemCols = [
      "id", "aegis_name", "type", "subtype", "slots", "weight", "attack",
      "magic_attack", "defense", "weapon_level", "armor_level",
      "equip_level_min", "equip_level_max", "refineable", "buy_price",
      "sell_price", "jobs", "locations",
    ];
    await upsert(client, "item", itemCols, out.items, ["id"],
      itemCols.filter((c) => c !== "id"));

    const monCols = [
      "id", "aegis_name", "level", "hp", "sp", "base_exp", "job_exp",
      "atk_min", "atk_max", "defense", "magic_defense", "str", "agi", "vit",
      "int", "dex", "luk", "race", "element", "element_level", "size",
      "is_mvp", "is_boss",
    ];
    await upsert(client, "monster", monCols, out.monsters, ["id"],
      monCols.filter((c) => c !== "id"));

    await upsert(client, "skill",
      ["id", "aegis_name", "max_level", "type", "target", "element"],
      out.skills, ["id"], ["aegis_name", "max_level", "type", "target", "element"]);

    // i18n (en)
    await upsert(client, "item_i18n", ["item_id", "locale", "name", "description"],
      out.itemI18n, ["item_id", "locale"], ["name", "description"]);
    await upsert(client, "monster_i18n", ["monster_id", "locale", "name"],
      out.monsterI18n, ["monster_id", "locale"], ["name"]);
    await upsert(client, "skill_i18n", ["skill_id", "locale", "name", "description"],
      out.skillI18n, ["skill_id", "locale"], ["name", "description"]);

    // relacoes
    await upsert(client, "monster_drop",
      ["monster_id", "item_id", "rate", "drop_type"], out.drops,
      ["monster_id", "item_id", "drop_type"], ["rate"]);
    await upsert(client, "monster_spawn",
      ["monster_id", "map_id", "amount", "respawn_min_s", "respawn_max_s"],
      spawns, ["monster_id", "map_id"],
      ["amount", "respawn_min_s", "respawn_max_s"]);

    await client.query("COMMIT");
    console.log("Importacao concluida.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Falha na importacao:", err);
  process.exitCode = 1;
});
