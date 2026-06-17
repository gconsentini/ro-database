import type { FastifyInstance } from "fastify";
import { resolveLocale } from "../config.js";
import { getMap, listMaps, mapSpawns } from "../repo.js";

export async function mapRoutes(app: FastifyInstance) {
  // GET /maps?search=&type=&locale=
  app.get("/maps", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const maps = await listMaps({
      locale,
      type: q.type ?? null,
      search: q.search ?? null,
    });
    return { locale, count: maps.length, maps };
  });

  // GET /maps/:id -> mapa + o que spawna nele ("o que tem nesse mapa")
  app.get("/maps/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const map = await getMap(id, locale);
    if (!map) return reply.code(404).send({ error: "mapa nao encontrado" });

    const spawns = await mapSpawns(id, locale);
    return { locale, ...map, spawns };
  });
}
