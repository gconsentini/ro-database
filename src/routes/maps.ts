import type { FastifyInstance } from "fastify";
import { one, query } from "../db.js";
import { resolveLocale } from "../config.js";
import { fuzzyClause } from "../search.js";

export async function mapRoutes(app: FastifyInstance) {
  // GET /maps?search=&type=&locale=
  app.get("/maps", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);

    const params: unknown[] = [locale, q.type ?? null];
    const conds = ["($2::text IS NULL OR m.type = $2)"];
    let orderBy = "m.id";

    if (q.search) {
      const f = fuzzyClause(
        ["lower(m.id)", "lower(COALESCE(t.name, ''))"],
        q.search,
        params.length + 1,
      );
      params.push(f.value);
      conds.push(f.where);
      orderBy = `${f.rank} DESC, m.id`;
    }

    const rows = await query(
      `
      SELECT m.id, m.type, COALESCE(t.name, m.id) AS name
      FROM map m
      LEFT JOIN map_i18n t ON t.map_id = m.id AND t.locale = $1
      WHERE ${conds.join(" AND ")}
      ORDER BY ${orderBy}
      `,
      params,
    );
    return { locale, count: rows.length, maps: rows };
  });

  // GET /maps/:id -> mapa + o que spawna nele ("o que tem nesse mapa")
  app.get("/maps/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const map = await one(
      `
      SELECT m.id, m.type, COALESCE(t.name, m.id) AS name
      FROM map m
      LEFT JOIN map_i18n t ON t.map_id = m.id AND t.locale = $2
      WHERE m.id = $1
      `,
      [id, locale],
    );
    if (!map) return reply.code(404).send({ error: "mapa nao encontrado" });

    const spawns = await query(
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

    return { locale, ...map, spawns };
  });
}
