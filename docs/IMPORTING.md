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

## Importador pronto (`scripts/import-rathena.ts`)

O parser ja esta implementado. Ele:

- segue `item_db.yml -> Footer.Imports` para ler `item_db_usable/equip/etc.yml`;
- le `mob_db.yml` (monstros + `Drops`/`MvpDrops`, resolvendo o item por
  `AegisName`; detecta MVP por `Modes.Mvp`/`MvpExp`/`MvpDrops` e boss por
  `Class: Boss`);
- le `skill_db.yml` (`Name` = aegis, `Description` = nome de exibicao);
- varre `npc/<re|pre-re>/mobs/**/*.txt` e agrega spawns por monstro+mapa;
- grava com `INSERT ... ON CONFLICT DO UPDATE` (idempotente, em lote).

```bash
# 1. clonar a fonte (db/ e npc/ sao suficientes)
git clone --depth 1 https://github.com/rathena/rathena vendor/rathena

# 2. (opcional) validar o parsing sem tocar no banco
DRYRUN=1 RATHENA_DIR=vendor/rathena npm run import:rathena

# 3. importar de fato (apos npm run migrate)
RATHENA_DIR=vendor/rathena npm run import:rathena
```

Variaveis: `RATHENA_DIR` (raiz do rAthena) e `RATHENA_MODE=re|pre-re`
(padrao `re`).

### Localizacao (en / pt-BR / es)

Os nomes em **ingles** (`Name`/`Description` do rAthena) ja sao gravados em
`*_i18n` no locale `en` pelo importador. As traduções **pt-BR / es** vivem nos
arquivos do cliente (iRO/bRO/LATAM): mapeie `id -> nome` por locale e popule
`item_i18n`, `monster_i18n`, `map_i18n`. Onde faltar tradução, a API cai no `en`
e, na ausencia dele, no `aegis_name`.

## Conversao de taxas de drop

O rAthena guarda drop rate em "por dez mil" (10000 = 100%), mesmo formato
usado na coluna `monster_drop.rate`. A API expoe tambem `rate_percent`
(`rate / 100`) para leitura humana.

## Legalidade

Dados do rAthena sao abertos. **Sprites, artes e textos originais da Gravity
nao sao** — nao inclua assets do cliente neste repositorio.
