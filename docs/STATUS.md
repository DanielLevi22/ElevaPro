# Status dos Módulos — MeuPersonal

> **Atualizado em:** 2026-05-04 (feature/student-web-dashboard)
> **Regra:** atualizar ao fechar cada PR. Nenhuma feature é `done` sem este arquivo atualizado.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Completo e documentado |
| 🔄 | Implementado, spec técnica pendente |
| ⚠️ | Parcial / em andamento |
| ❌ | Não iniciado |
| N/A | Não aplicável nesta plataforma |

---

## Estado atual dos módulos

| Módulo | Web | Mobile | Spec (`docs/features/`) | Testes Web | Testes Mobile |
|--------|-----|--------|--------------------------|------------|---------------|
| **Auth** | ✅ | ✅ | 🔄 pendente | N/A | ⚠️ parcial |
| **Nutrition** | ✅ | ✅ | ✅ | ⚠️ parcial | ⚠️ parcial |
| **Workouts** | ✅ | ✅ | 🔄 pendente | ⚠️ parcial | ⚠️ parcial |
| **Students** | ✅ | ⚠️ parcial | 🔄 pendente | ⚠️ parcial | ⚠️ parcial |
| **Assessment** | N/A | ✅ | 🔄 pendente | N/A | ⚠️ parcial |
| **Gamification** | ⚠️ parcial | ✅ | ✅ | ❌ | ❌ |
| **AI / Agentes** | ⚠️ student coach (web) | ❌ | ⚠️ draft (blueprint) | ⚠️ parcial (service + readiness) | ❌ |
| **Packages / Shared** | ✅ centralizado (students + auth + workouts + nutrition + gamification) | ✅ centralizado (students + auth + workouts + nutrition + gamification) | ✅ | N/A | N/A |
| **Database Schema** | ✅ | ✅ | ✅ | N/A | N/A |
| **Database Types** | ✅ gerado (`database.types.ts`) | ✅ | ✅ | N/A | N/A |

---

## PRDs ativos

| PRD | Feature | Status | Branch |
|-----|---------|--------|--------|
| [student-web-dashboard](PRDs/student-web-dashboard.md) | Dashboard web do aluno (student + member) | ✅ done | `feature/student-web-dashboard` |
| [ci-and-vercel-optimization](PRDs/ci-and-vercel-optimization.md) | CI path filters + Vercel ignoreCommand | ✅ done | `feature/ci-and-vercel-optimization` |
| [vercel-pipeline-deploy](PRDs/vercel-pipeline-deploy.md) | Deploy via GitHub Actions + Vercel CLI | ✅ done | `feature/ci-and-vercel-optimization` |
| [database-audit-and-refactor](PRDs/database-audit-and-refactor.md) | Schema limpo: 21 tabelas, RLS, RPC, seeds | ✅ done | `feature/database-audit-and-refactor` |
| [students-schema-alignment](PRDs/students-schema-alignment.md) | Alinha módulo students ao novo schema | ✅ done | `feature/students-schema-alignment` |
| [shared-students-service](PRDs/shared-students-service.md) | Serviço centralizado students + auth em shared/ | ✅ done | `feature/shared-students-service` |
| [shared-workouts-service](PRDs/shared-workouts-service.md) | Serviço centralizado workouts em shared/ | ✅ done | `feature/shared-workouts-service` |
| [shared-nutrition-service](PRDs/shared-nutrition-service.md) | Serviço centralizado nutrition em shared/ | ✅ done | `feature/shared-nutrition-service` |
| [shared-gamification-service](PRDs/shared-gamification-service.md) | Serviço centralizado gamification em shared/ | ✅ done | `feature/shared-gamification-service` |
| [3d-muscle-map](PRDs/3d-muscle-map.md) | Mapa muscular 3D interativo com volume de treino | ⚠️ in-progress | `feature/3d-muscle-map` |
| [ai-student-personalized-coach](PRDs/ai/ai-student-personalized-coach.md) | Coach IA para aluno: dual-persona, análise visual, motor de explicabilidade | ⚠️ in-progress | `feature/auth-student-registration` |
| [local-dev-environment](PRDs/local-dev-environment.md) | 3 ambientes: Local→Preview→Production | ✅ done | — |
| [social-and-engagement](PRDs/social-and-engagement.md) | Comunidade, ranking, chat, notificações | draft | — |
| [health-background-tracking](PRDs/health-background-tracking.md) | Passos/calorias: correção da leitura + coleta em background (Android; iOS fora de escopo) | ✅ done | `feature/health-background-tracking` |

> Adicionar linha aqui ao criar um novo PRD via `node scripts/new-feature.js`.

---

## Dívidas técnicas ativas

| # | Descrição | Prioridade | ADR relacionado |
|---|-----------|------------|-----------------|
| 1 | `packages/core` e `packages/supabase` duplicados em web e app — já divergiram (students, auth, workouts, nutrition e gamification centralizados) | 🟡 Média | [ADR-002](decisions/002-flat-monorepo.md) |
| 2 | Specs técnicas dos módulos implementados pendentes (auth, workouts, students) | 🟡 Média | — |
| 3 | ~~Separação de ambientes Supabase (dev/preview/prod)~~ — **resolvido** (ambientes separados) | ✅ | — |
| 4 | Testes de cobertura insuficientes em todos os módulos (AI module iniciado) | 🟡 Média | — |
| 5 | ~~Código mobile/web referenciando tabelas antigas~~ — **resolvido** (`student_specialists`, `diet_plans`, `diet_meals`) | ✅ | — |
| 6 | `assessment` module usa `as unknown as AssessmentInsert` — field mapping com nomes legados | 🟡 Média | — |

---

## Próximas features planejadas

> Mover para `docs/PRDs/` ao iniciar. Não começar sem PRD aprovado.

1. ~~Criar projetos Supabase Preview + Production~~ — **feito**
2. ~~Atualizar código para usar novo schema~~ — **feito** (diet_plans, diet_meals, student_specialists)
3. Fechar PR `feature/auth-student-registration` (auth fix + AI student coach + type safety)
4. Migração de packages para `/packages/` na raiz (ADR-002)
5. Spec técnica de Auth (`docs/features/auth.md`)
6. Spec técnica de Workouts (`docs/features/workouts.md`)
7. AI student coach: fase 2 (mobile + spec técnica)
