// ---------------------------------------------------------------------------
// Camada de acesso a dados (repository).
//
// Fonte unica de SQL para as entidades do dominio. As rotas REST e os
// resolvers GraphQL chamam estas funcoes em vez de inlinear SQL, garantindo
// que ambos os transportes devolvam exatamente os mesmos dados.
// ---------------------------------------------------------------------------

import { one, query } from "./db.js";
import { resolveLocale, type Locale } from "./config.js";
import { fuzzyClause } from "./search.js";

const clampLimit = (n: unknown, def = 50) =>
  Math.min(Math.max(Number(n ?? def) || def, 1), 200);
const clampOffset = (n: unknown) => Math.max(Number(n ?? 0) || 0, 0);

// --------------------------------------------------------------------------
// ITENS
// --------------------------------------------------------------------------
export interface ItemFilter {
  locale?: unknown;
  type?: string | null;
  search?: string | null;
  limit?: unknown;
  offset?: unknown;
}

export async function listItems(f: ItemFilter) {
  const locale = resolveLocale(f.locale);
  const params: unknown[] = [locale, f.type ?? null];
  const conds = ["($2::text IS NULL OR i.type = $2)"];
  let orderBy = "i.id";

  if (f.search) {
    const fz = fuzzyClause(
      ["lower(i.aegis_name)", "lower(COALESCE(t.name, ''))"],
      f.search,
      params.length + 1,
    );
    params.push(fz.value);
    conds.push(fz.where);
    orderBy = `${fz.rank} DESC, i.id`;
  }
  params.push(clampLimit(f.limit), clampOffset(f.offset));
  const lim = `$${params.length - 1}`;
  const off = `$${params.length}`;

  return query(
    `
    SELECT i.id, i.aegis_name, i.type, i.subtype, i.slots, i.weight,
           i.sell_price, i.buy_price,
           COALESCE(t.name, i.aegis_name) AS name, t.description
    FROM item i
    LEFT JOIN item_i18n t ON t.item_id = i.id AND t.locale = $1
    WHERE ${conds.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ${lim} OFFSET ${off}
    `,
    params,
  );
}

export function getItem(id: number | string, locale: Locale) {
  return one(
    `
    SELECT i.*, COALESCE(t.name, i.aegis_name) AS name, t.description
    FROM item i
    LEFT JOIN item_i18n t ON t.item_id = i.id AND t.locale = $2
    WHERE i.id = $1
    `,
    [id, locale],
  );
}

/** "Onde dropa o item X?" */
export function itemDroppedBy(id: number | string, locale: Locale) {
  return query(
    `
    SELECT m.id AS monster_id,
           COALESCE(mt.name, m.aegis_name) AS monster_name,
           d.rate, d.drop_type,
           round(d.rate / 100.0, 2) AS rate_percent
    FROM monster_drop d
    JOIN monster m ON m.id = d.monster_id
    LEFT JOIN monster_i18n mt ON mt.monster_id = m.id AND mt.locale = $2
    WHERE d.item_id = $1
    ORDER BY d.rate DESC
    `,
    [id, locale],
  );
}

// --------------------------------------------------------------------------
// MONSTROS
// --------------------------------------------------------------------------
export interface MonsterFilter {
  locale?: unknown;
  race?: string | null;
  element?: string | null;
  mvp?: boolean | null;
  search?: string | null;
  limit?: unknown;
  offset?: unknown;
}

export async function listMonsters(f: MonsterFilter) {
  const locale = resolveLocale(f.locale);
  const params: unknown[] = [
    locale,
    f.race ?? null,
    f.element ?? null,
    f.mvp ?? null,
  ];
  const conds = [
    "($2::text IS NULL OR m.race = $2)",
    "($3::text IS NULL OR m.element = $3)",
    "($4::boolean IS NULL OR m.is_mvp = $4)",
  ];
  let orderBy = "m.id";

  if (f.search) {
    const fz = fuzzyClause(
      ["lower(m.aegis_name)", "lower(COALESCE(t.name, ''))"],
      f.search,
      params.length + 1,
    );
    params.push(fz.value);
    conds.push(fz.where);
    orderBy = `${fz.rank} DESC, m.id`;
  }
  params.push(clampLimit(f.limit), clampOffset(f.offset));
  const lim = `$${params.length - 1}`;
  const off = `$${params.length}`;

  return query(
    `
    SELECT m.id, m.aegis_name, m.level, m.hp, m.base_exp, m.job_exp,
           m.race, m.element, m.element_level, m.size, m.is_mvp,
           COALESCE(t.name, m.aegis_name) AS name
    FROM monster m
    LEFT JOIN monster_i18n t ON t.monster_id = m.id AND t.locale = $1
    WHERE ${conds.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ${lim} OFFSET ${off}
    `,
    params,
  );
}

export function getMonster(id: number | string, locale: Locale) {
  return one(
    `
    SELECT m.*, COALESCE(t.name, m.aegis_name) AS name
    FROM monster m
    LEFT JOIN monster_i18n t ON t.monster_id = m.id AND t.locale = $2
    WHERE m.id = $1
    `,
    [id, locale],
  );
}

export function monsterDrops(id: number | string, locale: Locale) {
  return query(
    `
    SELECT i.id AS item_id,
           COALESCE(it.name, i.aegis_name) AS item_name,
           d.rate, d.drop_type, round(d.rate / 100.0, 2) AS rate_percent
    FROM monster_drop d
    JOIN item i ON i.id = d.item_id
    LEFT JOIN item_i18n it ON it.item_id = i.id AND it.locale = $2
    WHERE d.monster_id = $1
    ORDER BY d.rate DESC
    `,
    [id, locale],
  );
}

export function monsterSpawns(id: number | string, locale: Locale) {
  return query(
    `
    SELECT s.map_id,
           COALESCE(mp.name, s.map_id) AS map_name,
           s.amount, s.respawn_min_s, s.respawn_max_s
    FROM monster_spawn s
    LEFT JOIN map_i18n mp ON mp.map_id = s.map_id AND mp.locale = $2
    WHERE s.monster_id = $1
    ORDER BY s.amount DESC
    `,
    [id, locale],
  );
}

// --------------------------------------------------------------------------
// MAPAS
// --------------------------------------------------------------------------
export interface MapFilter {
  locale?: unknown;
  type?: string | null;
  search?: string | null;
}

export async function listMaps(f: MapFilter) {
  const locale = resolveLocale(f.locale);
  const params: unknown[] = [locale, f.type ?? null];
  const conds = ["($2::text IS NULL OR m.type = $2)"];
  let orderBy = "m.id";

  if (f.search) {
    const fz = fuzzyClause(
      ["lower(m.id)", "lower(COALESCE(t.name, ''))"],
      f.search,
      params.length + 1,
    );
    params.push(fz.value);
    conds.push(fz.where);
    orderBy = `${fz.rank} DESC, m.id`;
  }

  return query(
    `
    SELECT m.id, m.type, COALESCE(t.name, m.id) AS name
    FROM map m
    LEFT JOIN map_i18n t ON t.map_id = m.id AND t.locale = $1
    WHERE ${conds.join(" AND ")}
    ORDER BY ${orderBy}
    `,
    params,
  );
}

export function getMap(id: string, locale: Locale) {
  return one(
    `
    SELECT m.id, m.type, COALESCE(t.name, m.id) AS name
    FROM map m
    LEFT JOIN map_i18n t ON t.map_id = m.id AND t.locale = $2
    WHERE m.id = $1
    `,
    [id, locale],
  );
}

/** "O que spawna no mapa X?" */
export function mapSpawns(id: string, locale: Locale) {
  return query(
    `
    SELECT mo.id AS monster_id,
           COALESCE(mt.name, mo.aegis_name) AS monster_name,
           mo.level, mo.element, mo.race, mo.is_mvp,
           s.amount, s.respawn_min_s, s.respawn_max_s
    FROM monster_spawn s
    JOIN monster mo ON mo.id = s.monster_id
    LEFT JOIN monster_i18n mt ON mt.monster_id = mo.id AND mt.locale = $2
    WHERE s.map_id = $1
    ORDER BY s.amount DESC
    `,
    [id, locale],
  );
}

// --------------------------------------------------------------------------
// SKILLS
// --------------------------------------------------------------------------
export interface SkillFilter {
  locale?: unknown;
  search?: string | null;
}

export async function listSkills(f: SkillFilter) {
  const locale = resolveLocale(f.locale);
  const params: unknown[] = [locale];
  const conds = ["TRUE"];
  let orderBy = "s.id";

  if (f.search) {
    const fz = fuzzyClause(
      ["lower(s.aegis_name)", "lower(COALESCE(t.name, ''))"],
      f.search,
      params.length + 1,
    );
    params.push(fz.value);
    conds.push(fz.where);
    orderBy = `${fz.rank} DESC, s.id`;
  }

  return query(
    `
    SELECT s.id, s.aegis_name, s.max_level, s.type, s.target, s.element,
           COALESCE(t.name, s.aegis_name) AS name, t.description
    FROM skill s
    LEFT JOIN skill_i18n t ON t.skill_id = s.id AND t.locale = $1
    WHERE ${conds.join(" AND ")}
    ORDER BY ${orderBy}
    `,
    params,
  );
}

export function getSkill(id: number | string, locale: Locale) {
  return one(
    `
    SELECT s.*, COALESCE(t.name, s.aegis_name) AS name, t.description
    FROM skill s
    LEFT JOIN skill_i18n t ON t.skill_id = s.id AND t.locale = $2
    WHERE s.id = $1
    `,
    [id, locale],
  );
}
