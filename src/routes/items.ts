import type { FastifyInstance } from "fastify";
import { resolveLocale } from "../config.js";
import { getItem, itemDroppedBy, listItems } from "../repo.js";

export async function itemRoutes(app: FastifyInstance) {
  // GET /items?search=&type=&locale=&limit=&offset=
  app.get("/items", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const items = await listItems({
      locale,
      type: q.type ?? null,
      search: q.search ?? null,
      limit: q.limit,
      offset: q.offset,
    });
    return { locale, count: items.length, items };
  });

  // GET /items/:id  -> item + fontes de drop ("onde dropa")
  app.get("/items/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const item = await getItem(id, locale);
    if (!item) return reply.code(404).send({ error: "item nao encontrado" });

    const dropped_by = await itemDroppedBy(id, locale);
    return { locale, ...item, dropped_by };
  });
}
