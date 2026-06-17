/**
 * Smoke tests da API. Requer Postgres com migrations + seed aplicados:
 *   npm run db:reset
 * Depois:
 *   npm test
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../src/server.js";
import { closePool } from "../src/db.js";

const app = buildServer();

after(async () => {
  await app.close();
  await closePool();
});

test("GET /health responde ok", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "ok");
});

test("GET /items retorna Poring Card localizado em pt-BR", async () => {
  const res = await app.inject({ method: "GET", url: "/items?search=carta&locale=pt-BR" });
  assert.equal(res.statusCode, 200);
  const names = res.json().items.map((i: any) => i.name);
  assert.ok(names.includes("Carta do Poring"));
});

test("GET /items/:id traz as fontes de drop (onde dropa)", async () => {
  // Jellopy (909) dropa de Poring/Lunatic/Drops
  const res = await app.inject({ method: "GET", url: "/items/909?locale=pt-BR" });
  assert.equal(res.statusCode, 200);
  const monsters = res.json().dropped_by.map((d: any) => d.monster_name);
  assert.ok(monsters.includes("Poring"));
});

test("GET /monsters/:id traz drops e spawns", async () => {
  const res = await app.inject({ method: "GET", url: "/monsters/1002?locale=es" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.drops.length > 0);
  assert.ok(body.spawns.some((s: any) => s.map_id === "prt_fild08"));
});

test("GET /maps/:id mostra o que spawna no mapa", async () => {
  const res = await app.inject({ method: "GET", url: "/maps/prt_fild08?locale=pt-BR" });
  assert.equal(res.statusCode, 200);
  const mobs = res.json().spawns.map((s: any) => s.monster_name);
  assert.ok(mobs.includes("Poring"));
});
