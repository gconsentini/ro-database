import type { FastifyInstance } from "fastify";
import { one, query } from "../db.js";
import { resolveLocale } from "../config.js";

export async function monsterRoutes(app: FastifyInstance) {
  // GET /monsters?search=&race=&element=&mvp=&locale=
  app.get("/monsters", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Math.max(Number(q.offset ?? 0), 0);
    const mvp = q.mvp === undefined ? null : q.mvp === "true";

    const rows = await query(
      `
      SELECT m.id, m.aegis_name, m.level, m.hp, m.base_exp, m.job_exp,
             m.race, m.element, m.element_level, m.size, m.is_mvp,
             COALESCE(t.name, m.aegis_name) AS name
      FROM monster m
      LEFT JOIN monster_i18n t ON t.monster_id = m.id AND t.locale = $1
      WHERE ($2::text IS NULL OR m.race = $2)
        AND ($3::text IS NULL OR m.element = $3)
        AND ($4::boolean IS NULL OR m.is_mvp = $4)
        AND ($5::text IS NULL OR
             lower(m.aegis_name) LIKE '%' || lower($5) || '%' OR
             lower(COALESCE(t.name, '')) LIKE '%' || lower($5) || '%')
      ORDER BY m.id
      LIMIT $6 OFFSET $7
      `,
      [locale, q.race ?? null, q.element ?? null, mvp, q.search ?? null, limit, offset],
    );
    return { locale, count: rows.length, monsters: rows };
  });

  // GET /monsters/:id -> monstro + drops + spawns
  app.get("/monsters/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const monster = await one(
      `
      SELECT m.*, COALESCE(t.name, m.aegis_name) AS name
      FROM monster m
      LEFT JOIN monster_i18n t ON t.monster_id = m.id AND t.locale = $2
      WHERE m.id = $1
      `,
      [id, locale],
    );
    if (!monster) return reply.code(404).send({ error: "monstro nao encontrado" });

    const drops = await query(
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

    const spawns = await query(
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

    return { locale, ...monster, drops, spawns };
  });
}
