# PRD: schema-drift-alignment

**Data de criação:** 2026-08-02
**Status:** approved
**Branch:** feature/schema-drift-alignment
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Alinhar mobile e web ao schema real do Supabase, eliminando as referências a 12
tabelas que não existem no banco, e adicionar uma verificação automática que
impeça a divergência de voltar.

### Por quê?
Cada referência a tabela inexistente é uma tela que falha em runtime — algumas
silenciosamente, porque o resultado da query é descartado sem checagem de erro.
São bugs que nenhum teste pega, porque os testes mockam o Supabase, e que nenhum
typecheck pega, porque nome de tabela é string.

### Como saberemos que está pronto?
- [ ] Zero referências a tabelas fora do schema real, em `app/` e `web/`
- [ ] Verificação em CI falha o build se uma referência órfã for introduzida
- [ ] Deletar exercício de um treino remove a linha de fato (hoje não remove)
- [ ] Criar treino com exercícios persiste os exercícios
- [ ] Teste de regressão para cada tela corrigida
- [ ] `npm run lint` e `tsc --noEmit` limpos nos dois projetos

---

## Contexto

O schema foi construído tabela a tabela, e o código de tela não acompanhou os
renomes. O resultado é uma divergência silenciosa: nome de tabela é string, então
nem TypeScript nem os testes acusam. Só o runtime — e às vezes nem ele, porque
parte das chamadas descarta o resultado.

Levantado em 2026-08-02 comparando toda referência `from('...')` contra
`pg_tables` do banco local.

### Inventário — mobile (`app/`)

| Tabela referenciada | Real | Arquivos |
|---|---|---|
| `workout_items` | `workout_exercises` | `app/workouts/[id].tsx`, `hooks/useWorkoutMutations.ts` |
| `workout_assignments` | não existe | `app/workouts/[id]/assignments.tsx`, `modules/workout/screens/WorkoutAssignmentsScreen.tsx` |
| `workout_feedback` | não existe | `modules/workout/components/FeedbackModal.tsx` |
| `workout_executions` | `workout_sessions` | `modules/workout/store/workoutLogStore.ts` |
| `students_personals` | `student_specialists` | `app/workouts/[id]/assignments.tsx`, `WorkoutAssignmentsScreen.tsx` |
| `training_plan_workouts` | `workouts.training_plan_id` | `modules/workout/screens/CreateTrainingPlanScreen.tsx` |
| `diet_logs` | `meal_logs` | `modules/nutrition/services/AnalysisService.ts` |

### Inventário — web (`web/`)

| Tabela referenciada | Real | Arquivos |
|---|---|---|
| `workout_assignments` | não existe | 1 |
| `workout_executions` | `workout_sessions` | 2 |
| `diet_logs` | `meal_logs` | 1 |
| `nutrition_progress` | não existe | 1 |
| `admin_audit_logs` | não existe | 1 |
| `content_reports` | não existe | 1 |
| `feature_flags` | não existe | 1 |
| `system_settings` | não existe | 1 |

### Colunas legadas

| Coluna | Real | Ocorrências |
|---|---|---|
| `personal_id` | `specialist_id` | 9 arquivos no mobile |
| `rest_time` | `rest_seconds` | 2 arquivos |
| `order` | `order_index` | junto com `rest_time` |

### Impacto já confirmado

- **Remover exercício de um treino não faz nada.** `handleDeleteExercise` em
  `app/workouts/[id].tsx` deleta de `workout_items` e **descarta o resultado sem
  checar erro** — falha em silêncio, a UI recarrega e o exercício continua lá.
- **Criar treino com exercícios falha.** `useCreateWorkout` insere em
  `workout_items` com `rest_time`/`order`; o correto é `workout_exercises` com
  `rest_seconds`/`order_index`.
- **As 4 tabelas de admin do web não existem**, então o painel administrativo
  tem telas que não podem funcionar.

---

## Escopo

### Incluído

**Fase 1 — guarda contra recorrência** (primeiro, de propósito)
- Script que extrai toda referência `from('...')` e compara com o schema Drizzle
- Job em CI que falha ao encontrar referência órfã
- Rodar o script agora gera a baseline exata do que corrigir

**Fase 2 — mobile, módulo de treinos**
- `workout_items` → `workout_exercises`, com `rest_seconds`/`order_index`
- `personal_id` → `specialist_id`
- `students_personals` → `student_specialists`
- `workout_executions` → `workout_sessions`
- Decidir o destino de `workout_assignments` e `workout_feedback` (ver Decisões)
- Mover as queries restantes de componente para service, retomando o que o
  PR #78 interrompeu

**Fase 3 — web, painel admin e nutrição**
- `diet_logs` → `meal_logs` (mobile e web)
- Decidir o destino das 4 tabelas de admin e de `nutrition_progress`

### Fora do escopo (explicitamente)
- Sistema de XP/nível. A tela de perfil renderiza uma barra sem fonte de dados;
  criar a feature é decisão de produto, não de alinhamento de schema.
- Escolher entre `workout_session_exercises.sets_data` (JSONB) e
  `workout_session_sets` (normalizada). São duas representações concorrentes que
  coexistem hoje; consolidar é PRD próprio.
- Migração de `packages/` para a raiz (ADR-002, dívida #1).

---

## Fluxo de dados

```
[Script de verificação]
  → varre app/src e web/src por from('<tabela>')
  → compara com shared/src/database/schema/*.ts
  → falha o CI listando cada referência órfã com arquivo:linha
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| `workout_exercises` | SELECT / INSERT / DELETE | destino das chamadas a `workout_items` |
| `workout_sessions` | SELECT / INSERT | destino de `workout_executions` |
| `student_specialists` | SELECT | destino de `students_personals` |
| `meal_logs` | SELECT / INSERT | destino de `diet_logs` |

Nenhuma tabela nova. Se as fases 2 e 3 concluírem que `workout_assignments`,
`workout_feedback`, `nutrition_progress` ou as de admin devem existir, cada uma
vira PRD próprio com `/lgpd-check` — não entram por esta porta.

## Impacto em outros módulos

- `modules/workout` (mobile) — o mais afetado
- `modules/nutrition` (mobile e web) — só `diet_logs`
- `app/admin` (web) — 4 telas dependendo da decisão da fase 3

---

## Decisões técnicas

**Guarda antes da correção.** A fase 1 vem primeiro porque sem ela a fase 2
conserta o que existe hoje e nada impede a divergência de voltar na próxima
tela. O script também produz a lista exata a corrigir, em vez de depender de
inspeção manual.

**Comparar com o schema Drizzle, não com o banco.** O CI não tem credencial de
banco, e `shared/src/database/schema/` é a fonte da verdade versionada —
divergir dela é o defeito, mesmo que o banco concorde.

**Tabela inexistente não vira tabela nova por padrão.** `workout_assignments` e
`workout_feedback` podem ser features que nunca saíram do papel. Criar tabela
para fazer o código compilar seria escrever schema a partir de código morto. Cada
caso precisa da pergunta: essa feature deve existir? Se sim, PRD próprio.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/schema-drift-alignment.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado
