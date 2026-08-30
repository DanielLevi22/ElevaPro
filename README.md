# Eleva Pro

> Plataforma de gestão de saúde e performance assistida por IA para personal trainers, nutricionistas e seus alunos.

---

## O produto

**Eleva Pro** conecta especialistas de saúde aos seus alunos em uma plataforma única — com IA como secretária de performance que monitora, alerta e acompanha 24h. Disponível em web (dashboard do especialista) e mobile (aluno e especialista).

```
Especialista  →  gerencia carteira de alunos com IA
Aluno gerenciado  →  acompanhamento do especialista, grátis
Aluno autônomo  →  IA como coach pessoal, plano próprio
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native + Expo + Expo Router |
| Web | Next.js 16 (App Router) |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| IA | Anthropic Claude (Sonnet 4.6 + Haiku 4.5) |
| Estado global | Zustand + MMKV |
| Estado servidor | TanStack Query |
| Estilização | Tailwind CSS / NativeWind |
| Pagamentos | Stripe + Asaas |
| Linting | Biome |
| Testes | Jest (mobile) + Vitest (web) |

---

## Estrutura do monorepo

```
/app        → React Native (Expo) — mobile
/web        → Next.js — dashboard web
/shared     → serviços e tipos compartilhados (mobile + web)
/supabase   → migrations SQL
/docs       → documentação completa do projeto
/scripts    → automações (new-feature, etc.)
```

---

## Começando

### Pré-requisitos
- Node.js 20+
- pnpm ou npm
- Expo CLI (`npm install -g expo-cli`)
- Conta no Supabase

### Instalação

```bash
# instalar dependências de todos os workspaces
npm install

# mobile
cd app && npx expo start

# web
cd web && npm run dev
```

### Variáveis de ambiente

Preencha um arquivo único na raiz e deixe o script distribuir com os prefixos
de cada plataforma — evita divergência entre `app/` e `web/`:

```bash
cp .env.example .env.development
# preencha .env.development

npm run env:sync              # gera app/.env.development e web/.env.local
npm run env:sync:preview      # a partir de .env.preview
npm run env:sync:production   # a partir de .env.production
```

Os arquivos gerados são sobrescritos a cada sync — edite sempre a fonte na raiz.

Para apontar ao Supabase local (Docker), rode `supabase start` e pegue os
valores com `supabase status -o env`. As portas são `47321`/`47322`, definidas
em [`supabase/config.toml`](supabase/config.toml) — não as default `543xx`.

---

## Documentação

| Documento | O que encontrar |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | Linguagem ubíqua — o que cada termo do domínio significa |
| [GitHub Issues](https://github.com/DanielLevi22/ElevaPro/issues) | Todas as features planejadas e em andamento |
| [`docs/adr/README.md`](docs/adr/README.md) | Por que cada decisão de arquitetura foi tomada |
| [`docs/schema/`](docs/schema/) | Por que o schema de cada módulo é assim |
| [`docs/HOW_WE_WORK.md`](docs/HOW_WE_WORK.md) | Fluxo de desenvolvimento e convenções |
| [`CLAUDE.md`](CLAUDE.md) | Guia para o agente de IA (stack, regras, padrões) |

---

## Fluxo de desenvolvimento

```bash
# sempre criar branch + PRD juntos
node scripts/new-feature.js <nome-da-feature>

# lint de todo o monorepo — app, web, shared e scripts (roda no pre-commit)
npm run lint

# typecheck por projeto (roda no pre-commit)
cd app && npx tsc --noEmit
cd web && npm run typecheck

# testes (roda no pre-push)
cd app && npm test
cd web && npm run test
```

Veja o protocolo completo em [`docs/HOW_WE_WORK.md`](docs/HOW_WE_WORK.md).

### Migrations

Schema é definido em Drizzle e aplicado pelo pipeline — nunca à mão. Detalhes e
motivo em [`ADR-0009`](docs/adr/0009-migration-strategy.md).

```bash
# 1. editar shared/src/database/schema/*.ts
npm run db:generate          # gera o SQL em supabase/migrations/
# 2. adicionar RLS e policies à migration gerada (drizzle não gera isso)
# 3. validar do zero localmente
supabase db reset            # aplica migrations + seed no Docker
```

O merge em `development` aplica no Preview; em `main`, no Production. Nunca use
`drizzle-kit push` — ele altera o banco ignorando o versionamento.

**Secret por environment** (Settings → Environments → `Preview` / `Production`):
`SUPABASE_DB_URL` — connection string do **Session pooler** (a *Direct connection*
é IPv6-only e os runners do GitHub são IPv4).

```bash
gh secret set SUPABASE_DB_URL --env Preview --repo DanielLevi22/ElevaPro
```

### URLs por ambiente

Cada ambiente tem um domínio próprio e permanente. O de preview é criado por um
passo de alias no deploy — sem ele, o CLI do Vercel gera um domínio novo a cada
execução, e nada externo (como o build do mobile) consegue apontar para lá.

| Ambiente | Domínio |
|---|---|
| Produção | `https://elevapro.vercel.app` |
| Preview | `https://elevapro-preview.vercel.app` |

Para trocar o domínio de preview, defina a variável de repositório
`VERCEL_PREVIEW_DOMAIN` — o workflow usa o valor padrão acima quando ela não existe.

---

## Status atual

| Módulo | Status |
|---|---|
| Auth | ✅ Implementado |
| Gestão de Alunos | ✅ Implementado |
| Treinos | ✅ Implementado |
| Nutrição | ✅ Implementado |
| Gamificação | ✅ Implementado |
| Avaliação Física | ✅ Implementado |
| AI Coach Chat | 🔨 Em construção |
| AI Aluno Autônomo | 📋 PRD aprovado |
| Billing | 📋 Planejado |
| Marketplace | 📋 Planejado |

Estado atual e o que está em curso: [GitHub Issues](https://github.com/DanielLevi22/ElevaPro/issues)
