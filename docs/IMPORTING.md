# Importando dados completos (rAthena / Aegis)

O `seed.sql` traz apenas um conjunto minimo para validar o schema e a API.
Para popular o banco com a base completa do jogo, a fonte mais pratica e o
**rAthena**, que mantem os dados em YAML/CSV sob licenca aberta.

## Fontes recomendadas

| Dado            | Arquivo rAthena                                  |
|-----------------|--------------------------------------------------|
| Itens           | `db/re/item_db_*.yml`                             |
| Monstros        | `db/re/mob_db.yml`                                |
| Drops           | dentro de `mob_db.yml` (campo `Drops`)           |
| Spawns          | `npc/re/mobs/**/*.txt` (linhas `monster`)        |
| Skills          | `db/re/skill_db.yml`                              |
| Nomes (display) | `db/<lang>/...` e clientes traduzidos (pt/es)    |

> `re` = renewal. Use `pre-re` se o servidor-alvo for pre-renewal.

## Estrategia de importacao

1. **Clonar a fonte** (apenas a pasta `db/`):
   ```bash
   git clone --depth 1 https://github.com/rathena/rathena vendor/rathena
   ```
2. **Escrever um parser** em `scripts/import-rathena.ts` que:
   - le os YAML com um parser (ex: `yaml`),
   - mapeia campos -> colunas das tabelas `item`, `monster`, `skill`,
   - insere drops/spawns nas tabelas de relacao,
   - usa `INSERT ... ON CONFLICT DO UPDATE` para ser idempotente.
3. **Localizacao (pt-BR / es):** os nomes de exibicao vivem nos arquivos de
   tradução do cliente (iRO/bRO/LATAM). Mapeie `item_id -> nome` por locale e
   popule `item_i18n`, `monster_i18n`, `map_i18n`. Onde faltar tradução, a API
   ja cai no `aegis_name` automaticamente.

## Conversao de taxas de drop

O rAthena guarda drop rate em "por dez mil" (10000 = 100%), mesmo formato
usado na coluna `monster_drop.rate`. A API expoe tambem `rate_percent`
(`rate / 100`) para leitura humana.

## Legalidade

Dados do rAthena sao abertos. **Sprites, artes e textos originais da Gravity
nao sao** — nao inclua assets do cliente neste repositorio.
