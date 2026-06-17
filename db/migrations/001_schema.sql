-- ============================================================================
-- ro-database :: schema inicial
-- Dados mestres de Ragnarok Online (itens, monstros, skills, mapas) +
-- consultas de drop/spawn. Localizacao pt-BR / es / en via tabelas *_i18n.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Locales suportados
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locale (
  code        TEXT PRIMARY KEY,            -- 'pt-BR', 'es', 'en'
  label       TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- ITENS
-- ---------------------------------------------------------------------------
-- type/subtype seguem a convencao do rAthena (Healing, Weapon, Armor, Card,
-- Etc, Usable, etc). Mantemos como TEXT para legibilidade.
CREATE TABLE IF NOT EXISTS item (
  id              INTEGER PRIMARY KEY,        -- aegis item id
  aegis_name      TEXT NOT NULL,              -- nome interno (ex: 'Red_Potion')
  type            TEXT NOT NULL DEFAULT 'Etc',
  subtype         TEXT,                       -- ex: 'Dagger', 'Sword' p/ armas
  slots           SMALLINT NOT NULL DEFAULT 0,
  weight          INTEGER NOT NULL DEFAULT 0, -- em decimos (rAthena guarda *10)
  attack          INTEGER NOT NULL DEFAULT 0,
  magic_attack    INTEGER NOT NULL DEFAULT 0,
  defense         INTEGER NOT NULL DEFAULT 0,
  weapon_level    SMALLINT,
  armor_level     SMALLINT,
  equip_level_min SMALLINT,
  equip_level_max SMALLINT,
  refineable      BOOLEAN NOT NULL DEFAULT FALSE,
  buy_price       INTEGER,                    -- preco NPC de compra (zeny)
  sell_price      INTEGER,                    -- preco NPC de venda (zeny)
  jobs            TEXT[] NOT NULL DEFAULT '{}', -- classes que podem usar
  locations       TEXT[] NOT NULL DEFAULT '{}', -- slots de equipamento
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_i18n (
  item_id      INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  locale       TEXT    NOT NULL REFERENCES locale(code),
  name         TEXT    NOT NULL,
  description  TEXT,
  PRIMARY KEY (item_id, locale)
);

-- ---------------------------------------------------------------------------
-- MAPAS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS map (
  id           TEXT PRIMARY KEY,              -- nome do .gat (ex: 'prt_fild08')
  type         TEXT NOT NULL DEFAULT 'field', -- field | dungeon | town | indoor
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_i18n (
  map_id   TEXT NOT NULL REFERENCES map(id) ON DELETE CASCADE,
  locale   TEXT NOT NULL REFERENCES locale(code),
  name     TEXT NOT NULL,                     -- ex: 'Campos de Prontera'
  PRIMARY KEY (map_id, locale)
);

-- ---------------------------------------------------------------------------
-- MONSTROS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monster (
  id            INTEGER PRIMARY KEY,          -- aegis mob id
  aegis_name    TEXT NOT NULL,
  level         INTEGER NOT NULL DEFAULT 1,
  hp            INTEGER NOT NULL DEFAULT 1,
  sp            INTEGER NOT NULL DEFAULT 0,
  base_exp      INTEGER NOT NULL DEFAULT 0,
  job_exp       INTEGER NOT NULL DEFAULT 0,
  atk_min       INTEGER NOT NULL DEFAULT 0,
  atk_max       INTEGER NOT NULL DEFAULT 0,
  defense       INTEGER NOT NULL DEFAULT 0,
  magic_defense INTEGER NOT NULL DEFAULT 0,
  str           SMALLINT NOT NULL DEFAULT 1,
  agi           SMALLINT NOT NULL DEFAULT 1,
  vit           SMALLINT NOT NULL DEFAULT 1,
  int           SMALLINT NOT NULL DEFAULT 1,
  dex           SMALLINT NOT NULL DEFAULT 1,
  luk           SMALLINT NOT NULL DEFAULT 1,
  race          TEXT NOT NULL DEFAULT 'Formless',
  element       TEXT NOT NULL DEFAULT 'Neutral',
  element_level SMALLINT NOT NULL DEFAULT 1,
  size          TEXT NOT NULL DEFAULT 'Medium',
  is_mvp        BOOLEAN NOT NULL DEFAULT FALSE,
  is_boss       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monster_i18n (
  monster_id  INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
  locale      TEXT    NOT NULL REFERENCES locale(code),
  name        TEXT    NOT NULL,
  PRIMARY KEY (monster_id, locale)
);

-- ---------------------------------------------------------------------------
-- SKILLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill (
  id          INTEGER PRIMARY KEY,
  aegis_name  TEXT NOT NULL,
  max_level   SMALLINT NOT NULL DEFAULT 1,
  type        TEXT,                           -- Passive | Attack | Support ...
  target      TEXT,                           -- Self | Enemy | Ally | Ground
  element     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_i18n (
  skill_id    INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  locale      TEXT    NOT NULL REFERENCES locale(code),
  name        TEXT    NOT NULL,
  description TEXT,
  PRIMARY KEY (skill_id, locale)
);

-- ---------------------------------------------------------------------------
-- DROPS  (relacao monstro -> item)
-- ---------------------------------------------------------------------------
-- rate em "por dez mil" (basis points * ... ): 10000 = 100%, 1 = 0.01%.
-- drop_type: 'normal' | 'card' | 'mvp' | 'steal_protected'
CREATE TABLE IF NOT EXISTS monster_drop (
  id          BIGSERIAL PRIMARY KEY,
  monster_id  INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  rate        INTEGER NOT NULL,               -- 1..10000
  drop_type   TEXT NOT NULL DEFAULT 'normal',
  UNIQUE (monster_id, item_id, drop_type)
);

-- ---------------------------------------------------------------------------
-- SPAWNS  (relacao monstro -> mapa)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monster_spawn (
  id            BIGSERIAL PRIMARY KEY,
  monster_id    INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
  map_id        TEXT    NOT NULL REFERENCES map(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL DEFAULT 1,
  respawn_min_s INTEGER,                       -- segundos
  respawn_max_s INTEGER,
  UNIQUE (monster_id, map_id)
);

COMMIT;
