import Fastify from "fastify";
import { config, SUPPORTED_LOCALES } from "./config.js";
import { pool } from "./db.js";
import { itemRoutes } from "./routes/items.js";
import { monsterRoutes } from "./routes/monsters.js";
import { mapRoutes } from "./routes/maps.js";
import { skillRoutes } from "./routes/skills.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  // Health / metadados da API
  app.get("/health", async () => {
    await pool.query("SELECT 1");
    return { status: "ok" };
  });

  app.get("/", async () => ({
    name: "ro-database",
    description: "Banco de dados de Ragnarok Online para LATAM",
    locales: SUPPORTED_LOCALES,
    default_locale: config.defaultLocale,
    endpoints: [
      "GET /items?search=&type=&locale=",
      "GET /items/:id   (inclui 'dropped_by' = onde dropa)",
      "GET /monsters?search=&race=&element=&mvp=&locale=",
      "GET /monsters/:id   (inclui drops e spawns)",
      "GET /maps?search=&type=&locale=",
      "GET /maps/:id   (inclui o que spawna no mapa)",
      "GET /skills?search=&locale=",
      "GET /skills/:id",
    ],
  }));

  app.register(itemRoutes);
  app.register(monsterRoutes);
  app.register(mapRoutes);
  app.register(skillRoutes);

  return app;
}
