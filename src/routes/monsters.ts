import type { FastifyInstance } from "fastify";
import { resolveLocale } from "../config.js";
import {
  getMonster,
  listMonsters,
  monsterDrops,
  monsterSpawns,
} from "../repo.js";

export async function monsterRoutes(app: FastifyInstance) {
  // GET /monsters?search=&race=&element=&mvp=&locale=
  app.get("/monsters", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const monsters = await listMonsters({
      locale,
      race: q.race ?? null,
      element: q.element ?? null,
      mvp: q.mvp === undefined ? null : q.mvp === "true",
      search: q.search ?? null,
      limit: q.limit,
      offset: q.offset,
    });
    return { locale, count: monsters.length, monsters };
  });

  // GET /monsters/:id -> monstro + drops + spawns
  app.get("/monsters/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const monster = await getMonster(id, locale);
    if (!monster)
      return reply.code(404).send({ error: "monstro nao encontrado" });

    const [drops, spawns] = await Promise.all([
      monsterDrops(id, locale),
      monsterSpawns(id, locale),
    ]);
    return { locale, ...monster, drops, spawns };
  });
}
