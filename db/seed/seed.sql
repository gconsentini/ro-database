-- ============================================================================
-- Dados de exemplo (seed). Pequeno conjunto realista para validar schema/API.
-- Substitua por uma importacao completa a partir do rAthena (ver scripts/).
-- Idempotente: usa ON CONFLICT DO UPDATE.
-- ============================================================================

BEGIN;

-- Locales -------------------------------------------------------------------
INSERT INTO locale (code, label) VALUES
  ('pt-BR', 'Portugues (Brasil)'),
  ('es',    'Espanol (LATAM)'),
  ('en',    'English')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

-- Mapas ---------------------------------------------------------------------
INSERT INTO map (id, type) VALUES
  ('prt_fild08', 'field'),
  ('prt_fild04', 'field'),
  ('pay_fild04', 'field')
ON CONFLICT (id) DO NOTHING;

INSERT INTO map_i18n (map_id, locale, name) VALUES
  ('prt_fild08', 'pt-BR', 'Campos de Prontera (08)'),
  ('prt_fild08', 'es',    'Campos de Prontera (08)'),
  ('prt_fild08', 'en',    'Prontera Field (08)'),
  ('prt_fild04', 'pt-BR', 'Campos de Prontera (04)'),
  ('prt_fild04', 'es',    'Campos de Prontera (04)'),
  ('prt_fild04', 'en',    'Prontera Field (04)'),
  ('pay_fild04', 'pt-BR', 'Campos de Payon (04)'),
  ('pay_fild04', 'es',    'Campos de Payon (04)'),
  ('pay_fild04', 'en',    'Payon Field (04)')
ON CONFLICT (map_id, locale) DO UPDATE SET name = EXCLUDED.name;

-- Itens ---------------------------------------------------------------------
INSERT INTO item (id, aegis_name, type, subtype, slots, weight, sell_price) VALUES
  (501, 'Red_Potion',   'Healing', NULL, 0, 70,  25),
  (909, 'Jellopy',      'Etc',     NULL, 0, 1,   3),
  (4001,'Poring_Card',  'Card',    NULL, 0, 1,   10),
  (512, 'Apple',        'Healing', NULL, 0, 20,  7),
  (713, 'Empty_Bottle', 'Etc',     NULL, 0, 5,   1)
ON CONFLICT (id) DO UPDATE
  SET aegis_name = EXCLUDED.aegis_name, type = EXCLUDED.type,
      subtype = EXCLUDED.subtype, slots = EXCLUDED.slots,
      weight = EXCLUDED.weight, sell_price = EXCLUDED.sell_price,
      updated_at = now();

INSERT INTO item_i18n (item_id, locale, name, description) VALUES
  (501, 'pt-BR', 'Pocao Vermelha', 'Recupera uma pequena quantidade de HP.'),
  (501, 'es',    'Pocion Roja',    'Recupera una pequena cantidad de HP.'),
  (501, 'en',    'Red Potion',     'Restores a small amount of HP.'),
  (909, 'pt-BR', 'Geleia',         'Material de fabricacao muito comum.'),
  (909, 'es',    'Jalea',          'Material de fabricacion muy comun.'),
  (909, 'en',    'Jellopy',        'A very common crafting material.'),
  (4001,'pt-BR', 'Carta do Poring','Adiciona +2 de SORTE e +1% de chance de drop perfeito.'),
  (4001,'es',    'Carta de Poring','Anade +2 de SUERTE y +1% de drop perfecto.'),
  (4001,'en',    'Poring Card',    '+2 LUK and +1% perfect dodge / drop.'),
  (512, 'pt-BR', 'Maca',           'Recupera HP. Deliciosa.'),
  (512, 'es',    'Manzana',        'Recupera HP. Deliciosa.'),
  (512, 'en',    'Apple',          'Restores HP. Delicious.'),
  (713, 'pt-BR', 'Garrafa Vazia',  'Uma garrafa de vidro vazia.'),
  (713, 'es',    'Botella Vacia',  'Una botella de vidrio vacia.'),
  (713, 'en',    'Empty Bottle',   'An empty glass bottle.')
ON CONFLICT (item_id, locale) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Monstros ------------------------------------------------------------------
INSERT INTO monster
  (id, aegis_name, level, hp, sp, base_exp, job_exp, atk_min, atk_max,
   defense, magic_defense, str, agi, vit, int, dex, luk,
   race, element, element_level, size, is_mvp, is_boss) VALUES
  (1002, 'PORING',   1,  50,  0,  2,   1,  7,  10, 0, 5,  1, 1, 1, 0, 6, 30,
   'Plant', 'Water', 1, 'Medium', FALSE, FALSE),
  (1063, 'LUNATIC',  1,  60,  0,  3,   2,  8,  11, 0, 0,  1, 9, 6, 0, 8, 35,
   'Brute', 'Earth', 1, 'Small', FALSE, FALSE),
  (1113, 'DROPS',    3,  77,  0,  4,   3, 11,  14, 5, 5,  1, 2, 4, 0, 9, 5,
   'Plant', 'Fire', 1, 'Medium', FALSE, FALSE)
ON CONFLICT (id) DO UPDATE
  SET aegis_name = EXCLUDED.aegis_name, level = EXCLUDED.level,
      hp = EXCLUDED.hp, base_exp = EXCLUDED.base_exp,
      job_exp = EXCLUDED.job_exp, race = EXCLUDED.race,
      element = EXCLUDED.element, updated_at = now();

INSERT INTO monster_i18n (monster_id, locale, name) VALUES
  (1002, 'pt-BR', 'Poring'),  (1002, 'es', 'Poring'),  (1002, 'en', 'Poring'),
  (1063, 'pt-BR', 'Lunatico'),(1063, 'es', 'Lunatico'),(1063, 'en', 'Lunatic'),
  (1113, 'pt-BR', 'Drops'),   (1113, 'es', 'Drops'),   (1113, 'en', 'Drops')
ON CONFLICT (monster_id, locale) DO UPDATE SET name = EXCLUDED.name;

-- Skills --------------------------------------------------------------------
INSERT INTO skill (id, aegis_name, max_level, type, target, element) VALUES
  (5, 'NV_BASIC',   9, 'Passive', 'Self',  NULL),
  (1, 'NV_FIRSTAID',1, 'Active',  'Self',  NULL),
  (28,'AL_HEAL',    10,'Active',  'Ally',  'Holy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO skill_i18n (skill_id, locale, name, description) VALUES
  (5,  'pt-BR', 'Conhecimento Basico', 'Habilidades fundamentais de aventureiro.'),
  (5,  'es',    'Conocimiento Basico', 'Habilidades fundamentales de aventurero.'),
  (5,  'en',    'Basic Skill',         'Fundamental adventurer abilities.'),
  (1,  'pt-BR', 'Primeiros Socorros',  'Recupera 5 de HP.'),
  (1,  'es',    'Primeros Auxilios',   'Recupera 5 de HP.'),
  (1,  'en',    'First Aid',           'Restores 5 HP.'),
  (28, 'pt-BR', 'Cura',                'Restaura HP de um aliado.'),
  (28, 'es',    'Curar',               'Restaura HP de un aliado.'),
  (28, 'en',    'Heal',                'Restores an ally''s HP.')
ON CONFLICT (skill_id, locale) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Drops ---------------------------------------------------------------------
-- rate em 1..10000 (10000 = 100%).
INSERT INTO monster_drop (monster_id, item_id, rate, drop_type) VALUES
  (1002, 909,  7000, 'normal'),   -- Poring -> Jellopy 70%
  (1002, 501,  1000, 'normal'),   -- Poring -> Red Potion 10%
  (1002, 512,  1500, 'normal'),   -- Poring -> Apple 15%
  (1002, 713,  1500, 'normal'),   -- Poring -> Empty Bottle 15%
  (1002, 4001, 1,    'card'),     -- Poring -> Poring Card 0.01%
  (1063, 909,  5000, 'normal'),   -- Lunatic -> Jellopy 50%
  (1063, 512,  2000, 'normal'),   -- Lunatic -> Apple 20%
  (1113, 909,  6000, 'normal'),   -- Drops -> Jellopy 60%
  (1113, 501,  2000, 'normal')    -- Drops -> Red Potion 20%
ON CONFLICT (monster_id, item_id, drop_type) DO UPDATE SET rate = EXCLUDED.rate;

-- Spawns --------------------------------------------------------------------
INSERT INTO monster_spawn (monster_id, map_id, amount, respawn_min_s, respawn_max_s) VALUES
  (1002, 'prt_fild08', 60, 5, 10),
  (1002, 'prt_fild04', 40, 5, 10),
  (1063, 'pay_fild04', 50, 5, 10),
  (1113, 'prt_fild04', 30, 5, 10)
ON CONFLICT (monster_id, map_id) DO UPDATE SET amount = EXCLUDED.amount;

COMMIT;
