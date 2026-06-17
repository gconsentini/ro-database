import type { FastifyInstance } from "fastify";
import { one, query } from "../db.js";
import { resolveLocale } from "../config.js";
import { fuzzyClause } from "../search.js";

export async function skillRoutes(app: FastifyInstance) {
  // GET /skills?search=&locale=
  app.get("/skills", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);

    const params: unknown[] = [locale];
    const conds = ["TRUE"];
    let orderBy = "s.id";

    if (q.search) {
      const f = fuzzyClause(
        ["lower(s.aegis_name)", "lower(COALESCE(t.name, ''))"],
        q.search,
        params.length + 1,
      );
      params.push(f.value);
      conds.push(f.where);
      orderBy = `${f.rank} DESC, s.id`;
    }

    const rows = await query(
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
    return { locale, count: rows.length, skills: rows };
  });

  // GET /skills/:id
  app.get("/skills/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const skill = await one(
      `
      SELECT s.*, COALESCE(t.name, s.aegis_name) AS name, t.description
      FROM skill s
      LEFT JOIN skill_i18n t ON t.skill_id = s.id AND t.locale = $2
      WHERE s.id = $1
      `,
      [id, locale],
    );
    if (!skill) return reply.code(404).send({ error: "skill nao encontrada" });
    return { locale, ...skill };
  });
}
