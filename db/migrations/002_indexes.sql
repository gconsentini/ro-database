-- ============================================================================
-- Indices para busca e para os "reverse lookups" de drop/spawn.
-- ============================================================================

BEGIN;

-- Busca textual por nome interno
CREATE INDEX IF NOT EXISTS idx_item_aegis_name    ON item (lower(aegis_name));
CREATE INDEX IF NOT EXISTS idx_monster_aegis_name ON monster (lower(aegis_name));
CREATE INDEX IF NOT EXISTS idx_skill_aegis_name   ON skill (lower(aegis_name));

-- Busca por nome localizado (ILIKE '%termo%')
CREATE INDEX IF NOT EXISTS idx_item_i18n_name    ON item_i18n (locale, lower(name));
CREATE INDEX IF NOT EXISTS idx_monster_i18n_name ON monster_i18n (locale, lower(name));
CREATE INDEX IF NOT EXISTS idx_map_i18n_name     ON map_i18n (locale, lower(name));

-- Filtros comuns em monstros
CREATE INDEX IF NOT EXISTS idx_monster_race    ON monster (race);
CREATE INDEX IF NOT EXISTS idx_monster_element ON monster (element);
CREATE INDEX IF NOT EXISTS idx_monster_mvp     ON monster (is_mvp) WHERE is_mvp;

-- Reverse lookup: "onde dropa o item X?"  ->  monster_drop por item
CREATE INDEX IF NOT EXISTS idx_drop_item    ON monster_drop (item_id);
CREATE INDEX IF NOT EXISTS idx_drop_monster ON monster_drop (monster_id);

-- Reverse lookup: "o que spawna no mapa X?"  ->  monster_spawn por mapa
CREATE INDEX IF NOT EXISTS idx_spawn_map     ON monster_spawn (map_id);
CREATE INDEX IF NOT EXISTS idx_spawn_monster ON monster_spawn (monster_id);

COMMIT;
