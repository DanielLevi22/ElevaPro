# CLAUDE.md — Eleva Pro

SaaS para Personal Trainers. Trial → assinatura Stripe/Asaas. Target: Abril 2026.

---

## Stack (trancada)

| Camada | Decisão |
|---|---|
| Mobile | React Native + Expo + Expo Router |
| Web | Next.js 16 (App Router) |
| Estado global | Zustand + MMKV |
| Estado servidor | TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| ORM | Drizzle ORM + drizzle-kit |
| Estilização | Tailwind CSS / NativeWind |
| Acesso | CASL (frontend) + RLS (banco) |
| Linting | Biome 2.4.10 (`/biome.json`) |
| Testes | Jest + Maestro (mobile) · Vitest (web) |

---

## Estrutura do projeto

```
/app   → React Native (Expo)
/web   → Next.js dashboard
/docs  → Documentação
```

Cada feature vive em `src/modules/<feature>/`:
```
components/  hooks/  services/  store/  screens/  types.ts  index.ts
```

**Regras de import:**
```
✅ Módulo → shared/ | @elevapro/core | @elevapro/supabase
✅ Screen → Módulo (via index.ts)
❌ Módulo → Módulo direto
❌ shared/ → Módulo
```

**Path aliases — discrepância não-óbvia:**
- Mobile: `@/workout` → `modules/workout` (singular)
- Web:    `@/workout` → `modules/workouts` (plural)

**Naming:** pastas `lowercase` · componentes `PascalCase` · hooks `useXxx` · stores `xxxStore` · services `XxxService` · tipos `PascalCase`

---

## Code Style

- Funções: 4–20 linhas. Arquivos: < 500 linhas. Uma responsabilidade por módulo (SRP).
- Nomes específicos — evitar `data`, `handler`, `Manager` (< 5 grep hits no codebase).
- Tipos explícitos. **Nunca `any`** — use interface ou `unknown`.
- Zero duplicação. Early returns. Máx 2 níveis de indentação.
- Mensagens de exceção incluem o valor ofensor e o formato esperado.
- Comentários: escreva o **porquê**, nunca o quê. Preserve em refatorações.
- Docstrings em funções públicas: intenção + exemplo de uso.
- Logging: JSON estruturado para observabilidade; texto simples para CLI.
- Formatador: Biome. Testes: todo serviço crítico ganha teste; bug fix ganha regressão.

---

## Regras não-óbvias por plataforma

**Mobile:**
- Estilização: só NativeWind com tokens do design system. StyleSheet e inline proibidos.
- Ícones: só `@expo/vector-icons`.
- Rotas: `router.push(ROUTES.X)` — nunca string literal solta.

**Web:**
- Server Component é o padrão. `'use client'` só com `useState`/`useEffect`/event handlers.
- Toda query passa pelo service do módulo — nunca Supabase inline em componente.
- TanStack Query (client) só para mutations, polling ou estado otimista.
- Fetches independentes: `Promise.all()`.

**Acesso:** toda ação protegida precisa de CASL (UI) + RLS (banco). Roles: `admin`, `specialist`, `student`, `member` — enum `account_type`, fonte da verdade em `shared/src/types/auth.types.ts`.

---

## Bloqueadores

- **PRD:** nenhuma feature começa sem `docs/PRDs/<nome>.md` com `Status: approved`. Rodar `node scripts/new-feature.js <nome>` para criar.
- **LGPD:** parar e invocar `/lgpd-check` antes de qualquer novo campo, nova tabela ou acesso a dados de saúde. Tabelas sensíveis: `physical_assessments`, `student_anamnesis`, `workout_sessions`, `diet_logs`.
- **Nova tabela Supabase:** RLS + políticas + tipos TS + CASL + LGPD antes de qualquer dado entrar.
- **Commits:** `--no-verify` proibido. Pre-commit: Biome + tsc. Pre-push: testes.
- **Feature done:** lint + testes limpos · PR mergeado · `docs/features/<nome>.md` criado · `docs/STATUS.md` atualizado.

---

## Documentação de referência

| Documento | Propósito |
|---|---|
| `docs/STATUS.md` | Estado atual dos módulos — ler toda sessão |
| `docs/GLOSSARY.md` | Termos canônicos — consultar ao nomear |
| `docs/PRDs/<feature>.md` | PRD da feature em andamento |
| `docs/features/<feature>.md` | Spec pós-implementação |
| `docs/LGPD_COMPLIANCE.md` | Mapa de dados e base legal |
| `docs/decisions/ADR-XXX.md` | Decisões estruturais |

---

## Agent Skills

| Skill | Quando |
|---|---|
| `vercel-react-best-practices` | Qualquer componente React / página Next.js. **Crítico.** |
| `web-design-guidelines` | Revisão de UI. |
| `lgpd-check` | Novo schema, dados de saúde, onboarding, exclusão/exportação. |
