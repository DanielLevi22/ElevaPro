# Feature: workout-execution-consolidation

**Status:** active
**PRD:** [workout-execution-consolidation](../PRDs/workout-execution-consolidation.md)
**Plataformas:** mobile (as telas), com efeito nas métricas do web
**Última atualização:** 2026-08-12

---

## O que é

Uma única representação de treino executado: `workout_session_sets`, uma linha
por série, com prescrito e executado em colunas separadas.

## Por que existe

Havia duas. `sets_data jsonb` nasceu na `0000`; a `0007` criou a normalizada
porque *"o JSONB inviabiliza queries analíticas relacionais"* — e deixou a antiga
"deprecada, remove em migration futura". A migration nunca veio, e duas das três
telas de execução continuaram gravando no caminho antigo.

O efeito não era estético: **dependendo de por qual tela o aluno treinou, a
análise de evolução enxergava ou não a sessão.** Sem erro, sem aviso — a métrica
voltava vazia.

---

## Fluxo de dados

```
Tela de execução
  → workoutsService.saveSessionExercises(sessionId, items)
      → workout_session_exercises   (1 por exercício)
      → workout_session_sets        (1 por série)   ← única verdade
```

Os dois passos moram no serviço, não na tela. Era a tela que os reimplementava,
e foi assim que duas delas ficaram para trás.

## Tabelas do banco

| Tabela | Operação | RLS |
|---|---|---|
| `workout_session_exercises` | INSERT — só a ligação sessão ↔ exercício | ✅ |
| `workout_session_sets` | INSERT — uma linha por série | ✅ (aluno + especialista vinculado) |

`sets_data` foi removida na `0023`.

---

## Implementação

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/0023_drop_sets_data.sql` | Apaga a coluna |
| `shared/src/services/workouts.service.ts` | `saveSessionExercises` grava exercício **e** séries |
| `shared/src/types/workouts.types.ts` | `SaveSessionSetInput`, `WorkoutSessionSet`; `sets_data` sai |
| `app/.../student/execute-workout.tsx` | Manda série estruturada |
| `app/.../screens/ExecuteWorkoutScreen.tsx` | Idem, com prescrito e executado separados |
| `app/.../store/workoutStore.ts` | `fetchWorkoutSessionDetails` lê série a série |
| `app/.../utils/progressionUtils.ts` | Compara pela maior carga executada |
| `web/src/lib/database.types.ts` | Regerado do schema |

---

## Regras de negócio

1. **Uma linha por série executada.** Não por exercício, não por sessão.
2. **Prescrito e executado são colunas distintas.** Gravar o executado nos dois
   destrói a informação que torna a evolução mensurável.
3. **Repetição não medida é `null`, não zero.** Zero repetição é uma afirmação
   falsa sobre o treino; nulo é a ausência de medida. A tela
   `student/execute-workout` não coleta repetição por série, então grava nulo.
4. **A progressão compara com a maior carga da sessão anterior**, não com a
   primeira série — a primeira costuma ser aquecimento.
5. **Série pulada não conta na progressão de séries.** Contá-la faria o aluno
   parecer ter feito mais do que fez.

## Decisões técnicas não-óbvias

- **A coluna saiu, não foi deprecada de novo.** Deprecar foi o que a `0007`
  fez, e o resultado foi este trabalho dois meses depois. Enquanto a coluna
  existisse, o caminho antigo compilava e alguém voltaria a usá-lo.

- **O índice do array liga exercício e séries.** A ordem que o PostgREST devolve
  no `insert().select()` acompanha a do INSERT, então não é preciso uma segunda
  leitura para descobrir os ids.

- **`export type ... from` não traz o nome para o escopo local.** Em
  `app/src/modules/workout/types.ts` foi preciso um `import type` separado para
  usar `SaveSessionSetInput` no mesmo arquivo que o reexporta.

## Verificação

- 27 testes no `workoutStore`, incluindo o que afirma o formato gravado: duas
  séries, com `set_index`, `reps_actual` e `weight_actual` corretos
- 6 testes novos em `progressionUtils`, que não tinha nenhum
- Exercitado contra o banco local: gravado por `saveSessionExercises`, lido pela
  mesma consulta que as métricas usam — as duas séries voltaram, com 47,5 kg
  preservado

## Pendência que isto desbloqueia

`useProgressionAnalysis` monta o objeto, itera os exercícios e **descarta o
resultado** — `void effectiveItem`, com o comentário explicando que o tipo da
sessão anterior não expunha as séries. Era verdade, e deixou de ser: a leitura
agora devolve série a série, e `analyzeExerciseProgression` está pronta e
testada. Falta ligar o hook — dívida 35 no `STATUS.md`.
