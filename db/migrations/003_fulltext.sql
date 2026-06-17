-- ============================================================================
-- Busca textual com tolerancia a erros de digitacao (trigram / pg_trgm).
-- Permite "porin" -> "Poring", "geleia" -> "Geleia", etc., com ranking por
-- similaridade. Indices GIN aceleram tanto ILIKE '%termo%' quanto o operador
-- de similaridade ( % ).
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Nomes internos (aegis)
CREATE INDEX IF NOT EXISTS idx_item_aegis_trgm
  ON item USING gin (lower(aegis_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_monster_aegis_trgm
  ON monster USING gin (lower(aegis_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skill_aegis_trgm
  ON skill USING gin (lower(aegis_name) gin_trgm_ops);

-- Nomes localizados (pt-BR / es / en)
CREATE INDEX IF NOT EXISTS idx_item_i18n_name_trgm
  ON item_i18n USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_monster_i18n_name_trgm
  ON monster_i18n USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_map_i18n_name_trgm
  ON map_i18n USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skill_i18n_name_trgm
  ON skill_i18n USING gin (lower(name) gin_trgm_ops);

COMMIT;
