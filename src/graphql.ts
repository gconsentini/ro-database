// ---------------------------------------------------------------------------
// Camada GraphQL (mercurius) sobre o mesmo repository das rotas REST.
//
// Exemplo de consulta:
//   {
//     monster(id: 1002) {            # Poring
//       name
//       drops { item_name rate_percent }
//       spawns { map_name amount }
//     }
//   }
// GraphiQL fica em /graphiql quando a API esta rodando.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import mercurius, { type IResolvers } from "mercurius";
import { resolveLocale, type Locale } from "./config.js";
import {
  getItem,
  getMap,
  getMonster,
  getSkill,
  itemDroppedBy,
  listItems,
  listMaps,
  listMonsters,
  listSkills,
  mapSpawns,
  monsterDrops,
  monsterSpawns,
} from "./repo.js";

const schema = /* GraphQL */ `
  type DropSource {
    monster_id: Int!
    monster_name: String!
    rate: Int!
    drop_type: String!
    rate_percent: Float!
  }

  type Drop {
    item_id: Int!
    item_name: String!
    rate: Int!
    drop_type: String!
    rate_percent: Float!
  }

  type Spawn {
    map_id: String!
    map_name: String!
    amount: Int!
    respawn_min_s: Int
    respawn_max_s: Int
  }

  type MapSpawn {
    monster_id: Int!
    monster_name: String!
    level: Int
    element: String
    race: String
    is_mvp: Boolean
    amount: Int!
    respawn_min_s: Int
    respawn_max_s: Int
  }

  type Item {
    id: Int!
    aegis_name: String!
    name: String!
    description: String
    type: String
    subtype: String
    slots: Int
    weight: Int
    attack: Int
    magic_attack: Int
    defense: Int
    weapon_level: Int
    armor_level: Int
    equip_level_min: Int
    equip_level_max: Int
    refineable: Boolean
    buy_price: Int
    sell_price: Int
    jobs: [String!]
    locations: [String!]
    "Monstros que dropam este item (reverse lookup)."
    dropped_by: [DropSource!]!
  }

  type Monster {
    id: Int!
    aegis_name: String!
    name: String!
    level: Int
    hp: Int
    sp: Int
    base_exp: Int
    job_exp: Int
    atk_min: Int
    atk_max: Int
    defense: Int
    magic_defense: Int
    str: Int
    agi: Int
    vit: Int
    int: Int
    dex: Int
    luk: Int
    race: String
    element: String
    element_level: Int
    size: String
    is_mvp: Boolean
    is_boss: Boolean
    drops: [Drop!]!
    spawns: [Spawn!]!
  }

  type Map {
    id: String!
    type: String
    name: String!
    "Monstros que spawnam neste mapa."
    spawns: [MapSpawn!]!
  }

  type Skill {
    id: Int!
    aegis_name: String!
    name: String!
    description: String
    max_level: Int
    type: String
    target: String
    element: String
  }

  type Query {
    item(id: Int!, locale: String): Item
    items(
      search: String
      type: String
      locale: String
      limit: Int
      offset: Int
    ): [Item!]!

    monster(id: Int!, locale: String): Monster
    monsters(
      search: String
      race: String
      element: String
      mvp: Boolean
      locale: String
      limit: Int
      offset: Int
    ): [Monster!]!

    map(id: String!, locale: String): Map
    maps(search: String, type: String, locale: String): [Map!]!

    skill(id: Int!, locale: String): Skill
    skills(search: String, locale: String): [Skill!]!
  }
`;

// Carrega o locale resolvido no proprio objeto para que os resolvers
// aninhados (drops, spawns, etc.) usem o mesmo idioma da consulta raiz.
type Localized = { _locale: Locale } & Record<string, unknown>;
const tag = <T>(row: T | null, locale: Locale): (T & Localized) | null =>
  row ? Object.assign(row as object, { _locale: locale }) as T & Localized : null;
const tagAll = <T>(rows: T[], locale: Locale) =>
  rows.map((r) => Object.assign(r as object, { _locale: locale })) as (T &
    Localized)[];

const localeOf = (p: unknown) => (p as Localized)._locale;

const resolvers: IResolvers = {
  Query: {
    item: (_p, a: { id: number; locale?: string }) => {
      const locale = resolveLocale(a.locale);
      return getItem(a.id, locale).then((r) => tag(r, locale));
    },
    items: (_p, a: Record<string, unknown>) => {
      const locale = resolveLocale(a.locale);
      return listItems(a).then((rows) => tagAll(rows, locale));
    },
    monster: (_p, a: { id: number; locale?: string }) => {
      const locale = resolveLocale(a.locale);
      return getMonster(a.id, locale).then((r) => tag(r, locale));
    },
    monsters: (_p, a: Record<string, unknown>) => {
      const locale = resolveLocale(a.locale);
      return listMonsters(a).then((rows) => tagAll(rows, locale));
    },
    map: (_p, a: { id: string; locale?: string }) => {
      const locale = resolveLocale(a.locale);
      return getMap(a.id, locale).then((r) => tag(r, locale));
    },
    maps: (_p, a: Record<string, unknown>) => {
      const locale = resolveLocale(a.locale);
      return listMaps(a).then((rows) => tagAll(rows, locale));
    },
    skill: (_p, a: { id: number; locale?: string }) => {
      const locale = resolveLocale(a.locale);
      return getSkill(a.id, locale).then((r) => tag(r, locale));
    },
    skills: (_p, a: Record<string, unknown>) => {
      const locale = resolveLocale(a.locale);
      return listSkills(a).then((rows) => tagAll(rows, locale));
    },
  },
  Item: {
    dropped_by: (p: { id: number }) => itemDroppedBy(p.id, localeOf(p)),
  },
  Monster: {
    drops: (p: { id: number }) => monsterDrops(p.id, localeOf(p)),
    spawns: (p: { id: number }) => monsterSpawns(p.id, localeOf(p)),
  },
  Map: {
    spawns: (p: { id: string }) => mapSpawns(p.id, localeOf(p)),
  },
};

export async function registerGraphQL(app: FastifyInstance) {
  await app.register(mercurius, {
    schema,
    resolvers,
    graphiql: true,
  });
}
