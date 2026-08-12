# PRD: workout-execution-consolidation

**Data de criação:** 2026-08-12
**Status:** approved
**Branch:** feature/workout-execution-consolidation
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Apagar `workout_session_exercises.sets_data` e deixar `workout_session_sets`
como única representação de treino executado — uma linha por série, com
prescrito e executado separados.

### Por quê?
Hoje duas telas do mobile gravam a mesma coisa em lugares diferentes:

| Tela | Grava em |
|---|---|
| `student/execute-workout.tsx` e `ExecuteWorkoutScreen.tsx` | `sets_data` (JSONB) |
| `student/workout-execute/[id].tsx` | `workout_session_sets` (normalizada) |

E a leitura se divide igual: `useWorkoutMetrics` e `WorkoutAnalyticsService` leem
a normalizada; o `workoutStore` lê o JSONB.

**A consequência não é estética.** Dependendo de por qual tela o aluno treinou, a
análise de evolução enxerga ou não enxerga a sessão. Não dá erro — volta vazio.
É a mesma falha silenciosa da RLS: o sistema parece funcionar.

É também o que manteve os recordes fora do [briefing](briefing.md): a query não é
difícil, mas daria uma resposta que depende de qual tela o aluno usou.

### Como saberemos que está pronto?
- [x] `sets_data` não existe mais no banco nem no código — zero ocorrências
- [x] As três telas de execução gravam em `workout_session_sets`, com o mesmo
      formato
- [x] Uma sessão salva por qualquer uma delas aparece nas métricas de evolução
- [x] `reps_actual` e `weight_actual` chegam preenchidos, não só a contagem de
      séries
- [x] Suíte do mobile e do web passando

---

## Contexto

`sets_data jsonb` nasceu na `0000`, no schema original: a sessão inteira de um
exercício virava um JSON.

O PRD [workout-execution-tracking](workout-execution-tracking.md) constatou o
limite — *"o campo `sets_data` jsonb inviabiliza queries analíticas
relacionais"* — e criou `workout_session_sets` na `0007`. A decisão está
escrita lá:

> **sets_data jsonb mantido:** Remoção quebra compatibilidade se houver sessões
> legadas. Deprecado — nova code path usa `workout_session_sets`. Remove em
> migration futura após confirmar que não há dados em produção.

A duplicação era intencional e temporária. Faltou a segunda metade: a migration
de remoção nunca veio, e o caminho antigo continuou sendo usado por duas telas
em vez de morrer.

**Não há produção.** O projeto está em construção, então a condição que o PRD
anterior deixou registrada está satisfeita: a coluna sai, sem migration de
conversão.

---

## Achado durante o levantamento

**A análise de progressão já está morta, e ninguém percebeu.**

`useProgressionAnalysis` monta o objeto, itera os exercícios e descarta o
resultado:

```ts
workout.exercises?.forEach((item) => {
  const effectiveItem = editedWorkoutItems[item.id] || item;
  // previousSession doesn't expose individual exercise items in the canonical type
  void effectiveItem;
});
return analysis;   // sempre {}
```

`analyzeExerciseProgression`, em `progressionUtils.ts`, é a função que faria o
cálculo — e **não é chamada por ninguém**. `ProgressionBadge` e
`ProgressionSummaryModal` renderizam a partir de um registro sempre vazio.

O comentário no `void` explica o porquê: o tipo canônico da sessão anterior não
expõe as séries. Ou seja, a feature morreu exatamente por causa da divergência
que este PRD resolve — `fetchWorkoutSessionDetails` lê `sets_data`, que não
casa com o que a tela precisa.

Consertar a progressão é feature, não dívida, e fica fora daqui. Mas sai daqui
o que ela precisa: uma leitura única que devolve série a série, com carga e
repetição executadas.

---

## Escopo

### Incluído

- Migration que apaga a coluna `sets_data`
- `saveSessionExercises` no `shared` grava exercício **e** séries, numa chamada
- As duas telas legadas passam a mandar série estruturada em vez do JSON
- `fetchWorkoutSessionDetails` lê de `workout_session_sets`
- `SessionItem.sets_data` vira `SessionItem.sets`, e `analyzeExerciseProgression`
  passa a comparar pela maior carga executada. A função não é chamada por
  ninguém hoje, mas é a única implementação da progressão que existe — apagá-la
  jogaria fora a feature em vez da dívida
- Testes cobrindo o formato gravado e o cálculo da progressão

### Fora do escopo (explicitamente)

- **Fazer a análise de progressão funcionar.** É feature; fica registrada como
  dívida, agora com o dado disponível para implementá-la.
- **Recordes no briefing.** Desbloqueados por esta entrega, mas são outra.
- **Unificar as três telas de execução.** Três telas fazendo a mesma coisa é
  dívida de produto, não de schema. Este PRD as faz gravar igual; fundi-las é
  outro trabalho.

---

## Fluxo de dados

```
Tela de execução
  → workoutsService.saveWorkoutSession
      → workout_sessions           (1 linha)
      → workout_session_exercises  (1 por exercício)
      → workout_session_sets       (1 por série executada)  ← única verdade
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|---|---|---|
| `workout_session_exercises` | ALTER (drop `sets_data`), INSERT | Passa a ser só a ligação sessão ↔ exercício |
| `workout_session_sets` | INSERT | Uma linha por série, com prescrito e executado |

Nenhuma tabela nova. RLS das duas já existe desde a `0017`, incluindo a leitura
do especialista.

## Impacto em outros módulos

- **Mobile `workout`** — duas telas de execução e o store
- **Briefing** — nada muda agora; recordes deixam de estar bloqueados
- **Web** — `useWorkoutMetrics` já lê a normalizada; nada a fazer

---

## Decisões técnicas

**A coluna sai, não é deprecada.** Deprecar foi o que a `0007` fez, e o
resultado é este PRD dois meses depois. Enquanto a coluna existir, o caminho
antigo continua compilando e alguém volta a usá-lo.

**Uma chamada grava exercício e séries.** Se a tela precisar inserir o exercício,
ler o id e então inserir as séries, cada tela reimplementa isso — e uma delas
vai esquecer, como já aconteceu.

**`weight_prescribed` e `reps_prescribed` vêm da prescrição, não do executado.**
São colunas distintas de propósito: comparar o que foi pedido com o que foi feito
é o que torna a evolução mensurável. Gravar o executado nos dois campos destrói
essa informação.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Tela legada gravando série vazia por não ter o dado | O teste afirma `reps_actual` e `weight_actual` preenchidos, não só a contagem |
| Perder o histórico já gravado em `sets_data` | Não há produção; o local é recriado por `db reset` |
| Sobrar leitura de `sets_data` em algum canto | Critério de pronto é zero ocorrência no código |

---

## Checklist de done

- [x] Zero ocorrências de `sets_data` no banco e no código
- [x] As três telas gravam no mesmo lugar e no mesmo formato
- [x] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [x] `docs/features/workout-execution-consolidation.md` criado
- [x] `docs/STATUS.md` atualizado — dívida 9 fechada
