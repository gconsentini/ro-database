import type { FastifyInstance } from "fastify";
import { one, query } from "../db.js";
import { resolveLocale } from "../config.js";

export async function itemRoutes(app: FastifyInstance) {
  // GET /items?search=&type=&locale=&limit=&offset=
  app.get("/items", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Math.max(Number(q.offset ?? 0), 0);

    const rows = await query(
      `
      SELECT i.id, i.aegis_name, i.type, i.subtype, i.slots, i.weight,
             i.sell_price, i.buy_price,
             COALESCE(t.name, i.aegis_name) AS name,
             t.description
      FROM item i
      LEFT JOIN item_i18n t ON t.item_id = i.id AND t.locale = $1
      WHERE ($2::text IS NULL OR i.type = $2)
        AND ($3::text IS NULL OR
             lower(i.aegis_name) LIKE '%' || lower($3) || '%' OR
             lower(COALESCE(t.name, '')) LIKE '%' || lower($3) || '%')
      ORDER BY i.id
      LIMIT $4 OFFSET $5
      `,
      [locale, q.type ?? null, q.search ?? null, limit, offset],
    );
    return { locale, count: rows.length, items: rows };
  });

  // GET /items/:id  -> item + fontes de drop ("onde dropa")
  app.get("/items/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const item = await one(
      `
      SELECT i.*, COALESCE(t.name, i.aegis_name) AS name, t.description
      FROM item i
      LEFT JOIN item_i18n t ON t.item_id = i.id AND t.locale = $2
      WHERE i.id = $1
      `,
      [id, locale],
    );
    if (!item) return reply.code(404).send({ error: "item nao encontrado" });

    const sources = await query(
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

    return { locale, ...item, dropped_by: sources };
  });
}
