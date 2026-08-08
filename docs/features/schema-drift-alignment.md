# Feature: schema-drift-alignment

**Status:** active
**PRD:** [schema-drift-alignment](../PRDs/schema-drift-alignment.md)
**Plataformas:** ambos
**Última atualização:** 2026-08-02

---

## O que é

Alinhamento do código de mobile e web ao schema real do Supabase, mais uma
verificação automática que impede a divergência de voltar.

## Por que existe

O schema foi construído tabela a tabela e as telas não acompanharam os renomes.
Nome de tabela é string: nem o TypeScript nem os testes acusam a divergência, e
os testes ainda mockam o Supabase. O sintoma aparecia só em runtime — às vezes
nem lá, quando a chamada descartava o resultado sem checar erro.

---

## A guarda

```
[pre-commit ou CI]
  → scripts/check-schema-refs.js
  → extrai todo .from('<tabela>') de app/src e web/src
  → compara com pgTable(...) de shared/src/database/schema/
  → falha listando arquivo:linha de cada referência órfã
```

Roda em dois lugares: no `pre-commit` (feedback imediato) e no job `schema-refs`
do CI, **sem filtro de path** — uma tabela pode sair do schema sem que nenhum
arquivo de `app/` ou `web/` mude no mesmo commit.

Compara com o schema Drizzle, não com o banco: o CI não tem credencial, e o
schema versionado é a fonte da verdade.

---

## O que foi corrigido

### Renomes — onde existia equivalente no banco

| De | Para |
|---|---|
| `workout_items` | `workout_exercises` |
| `workout_executions` | `workout_sessions` |
| `diet_logs` | `meal_logs` |
| `students_personals` | `student_specialists` |
| `training_plan_workouts` | `workouts.training_plan_id` (relação direta) |
| `personal_id` / `professional_id` | `specialist_id` |
| `rest_time` / `order` | `rest_seconds` / `order_index` |

### Remoções — onde não existia equivalente

| Tabela | O que saiu |
|---|---|
| `workout_assignments` | 2 telas mobile, bloco no `CreateWorkoutModal`, seletor de alunos |
| `workout_feedback` | `FeedbackModal` (não era importado por ninguém) |
| `admin_audit_logs`, `content_reports`, `feature_flags`, `system_settings` | 3 páginas de admin + 3 itens de navegação |

### Troca de fonte

`nutrition_progress` não existia, mas o dado sim: o peso vem de
`physical_assessments.weight_kg`. O hook passou a ler de lá mantendo o contrato
`{ recorded_date, weight }`, o que preservou o gráfico e os 5 pontos de UI que
exibiam `latestWeight`.

### Divergência inversa

A guarda, ao rodar pela primeira vez, encontrou o problema no sentido oposto:
`ai_chat_sessions`, `ai_chat_messages` e `workout_session_sets` existiam no banco
desde as migrations 0003 e 0007 mas **nunca foram declaradas no Drizzle**.

Isso era mais perigoso que o caso original — `drizzle-kit generate` emite
migration a partir do diff do schema, então tabela ausente ali poderia virar
`DROP TABLE` na próxima geração. Seriam as sessões de chat da IA e o histórico de
séries executadas.

Com as três declaradas, schema e banco batem exatamente: 27 tabelas dos dois
lados, zero divergência em qualquer direção.

---

## Regras de negócio

1. Toda referência `.from('<tabela>')` deve existir em
   `shared/src/database/schema/`.
2. Tabela inexistente **não vira tabela nova por padrão** — criar schema a partir
   de código morto inverte a direção. Se a feature deve existir, vira PRD próprio.
3. A guarda roda sem filtro de path, nos dois pontos de controle.

## Decisões técnicas não-óbvias

- **Renome ≠ remoção.** Cinco das doze tabelas tinham equivalente real. Apagar o
  código delas teria destruído features que o modelo de dados suporta. Cada
  renome foi conferido coluna a coluna antes de aplicar.
- **UI órfã sai junto.** Ao remover o bloco de assignments, o seletor "Atribuir a
  Alunos" ficaria na tela sem efeito. UI que promete e não entrega é pior que
  ausência.
- **Comparar com Drizzle, não com o banco.** Permite rodar no CI sem credencial e
  trata o schema versionado como fonte da verdade.

## Divergências web ↔ mobile

- Nenhuma. A guarda cobre `app/src` e `web/src` com o mesmo critério.

## Dívidas que permanecem

Registradas no [STATUS.md](../STATUS.md):

- Duas representações concorrentes de execução de treino
  (`workout_session_exercises.sets_data` em JSONB vs `workout_session_sets`
  normalizada) — ambas existem e são usadas.
- Barra de XP na tela de perfil do mobile sem fonte de dados.
- Seis tabelas removidas podem ser features legítimas nunca implementadas:
  `workout_assignments`, `workout_feedback`, `nutrition_progress` e as 4 de
  admin. Cada uma exige a pergunta "essa feature deve existir?".
