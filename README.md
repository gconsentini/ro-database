# ro-database

Banco de dados de **Ragnarok Online** focado em **LATAM** — uma base
consultável de **dados mestres** (itens, monstros, skills, mapas) com
**consultas de drop e spawn** ("onde dropa o item X?", "o que spawna no mapa
Y?"), com **localização pt-BR / es / en**.

> Stack: **PostgreSQL** (schema + índices) + **API TypeScript** (Fastify + `pg`).

## Por que

As bases de RO existentes (DivinePride, RateMyServer) são ótimas, mas pouco
focadas em LATAM e nem sempre fáceis de consultar via API. Este projeto entrega
um schema limpo e uma API HTTP simples, com nomes traduzidos para pt-BR e
espanhol, pensada para alimentar bots, sites e ferramentas da comunidade.

## O que tem hoje

- **Schema** (`db/migrations/`) — itens, monstros, skills, mapas, drops, spawns
  e tabelas `*_i18n` de localização.
- **Reverse lookups** indexados — item → quem dropa; mapa → quem spawna.
- **API** (`src/`) — endpoints REST com filtro por `?locale=`.
- **Seed** (`db/seed/seed.sql`) — amostra realista (Poring, Lunático, Drops…).
- **Testes** (`test/`) — smoke tests da API.
- **Guia de importação** (`docs/IMPORTING.md`) — como popular a base completa a
  partir do rAthena.

## Começando

Pré-requisitos: Node ≥ 20 e Docker (ou um Postgres já rodando).

```bash
# 1. Subir o Postgres
docker compose up -d

# 2. Configurar ambiente e instalar deps
cp .env.example .env
npm install

# 3. Criar o schema e carregar a amostra
npm run db:reset      # = migrate + seed

# 4. Rodar a API
npm run dev           # http://localhost:3000
```

## Endpoints

| Método e rota              | Descrição                                          |
|----------------------------|----------------------------------------------------|
| `GET /`                    | Metadados da API e lista de rotas                  |
| `GET /health`             | Health check (verifica conexão com o banco)        |
| `GET /items`              | Lista/busca itens (`search`, `type`, `locale`)     |
| `GET /items/:id`          | Item + **`dropped_by`** (onde dropa)               |
| `GET /monsters`           | Lista/busca monstros (`race`, `element`, `mvp`)    |
| `GET /monsters/:id`       | Monstro + **drops** + **spawns**                   |
| `GET /maps`               | Lista/busca mapas                                  |
| `GET /maps/:id`           | Mapa + **o que spawna** nele                       |
| `GET /skills`             | Lista/busca skills                                 |
| `GET /skills/:id`         | Detalhe da skill                                   |

Todas as rotas aceitam `?locale=pt-BR|es|en` (padrão: `pt-BR`). Quando não há
tradução, a resposta cai no nome interno (`aegis_name`).

### Exemplos

```bash
# "Onde dropa Geleia (Jellopy)?"
curl 'http://localhost:3000/items/909?locale=pt-BR'

# "O que tem nos Campos de Prontera 08?"
curl 'http://localhost:3000/maps/prt_fild08?locale=pt-BR'

# Buscar monstros de elemento Água
curl 'http://localhost:3000/monsters?element=Water&locale=es'
```

## Estrutura

```
ro-database/
├── db/
│   ├── migrations/        # 001_schema.sql, 002_indexes.sql
│   └── seed/              # seed.sql (amostra)
├── src/
│   ├── config.ts          # config + resolução de locale
│   ├── db.ts              # pool pg + helpers
│   ├── server.ts          # bootstrap Fastify
│   └── routes/            # items, monsters, maps, skills
├── scripts/               # migrate.ts, seed.ts
├── test/                  # smoke tests
└── docs/IMPORTING.md      # popular a base a partir do rAthena
```

## Scripts npm

| Script             | Ação                                      |
|--------------------|-------------------------------------------|
| `npm run dev`      | API em modo watch                         |
| `npm run migrate`  | Aplica as migrations                      |
| `npm run seed`     | Carrega a amostra                         |
| `npm run db:reset` | migrate + seed                            |
| `npm run typecheck`| Checagem de tipos                         |
| `npm test`         | Smoke tests (requer `db:reset` antes)     |

## Próximos passos

- [ ] Importador real do rAthena (`scripts/import-rathena.ts`) — ver `docs/IMPORTING.md`
- [ ] Carregar traduções pt-BR / es a partir dos clientes bRO / LATAM
- [ ] Busca textual full-text (pg_trgm) para tolerância a erros de digitação
- [ ] Cache HTTP / paginação por cursor
- [ ] Endpoint de cartas e de equipamentos por slot

## Licença

Código sob MIT. Dados de jogo provenientes do rAthena seguem a licença do
projeto de origem. **Assets originais da Gravity não são distribuídos aqui.**
