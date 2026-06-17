import type { FastifyInstance } from "fastify";
import { resolveLocale } from "../config.js";
import { getSkill, listSkills } from "../repo.js";

export async function skillRoutes(app: FastifyInstance) {
  // GET /skills?search=&locale=
  app.get("/skills", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const locale = resolveLocale(q.locale);
    const skills = await listSkills({ locale, search: q.search ?? null });
    return { locale, count: skills.length, skills };
  });

  // GET /skills/:id
  app.get("/skills/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = resolveLocale((req.query as any).locale);

    const skill = await getSkill(id, locale);
    if (!skill) return reply.code(404).send({ error: "skill nao encontrada" });
    return { locale, ...skill };
  });
}
