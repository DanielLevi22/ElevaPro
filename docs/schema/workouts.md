# Schema — Módulo Workouts

> Registra **por que** o schema deste módulo é assim, e o que foi rejeitado.
> A fonte da verdade do DDL é `shared/src/database/schema/*.ts` ([ADR-0009](../adr/0009-migration-strategy.md)).

---

## Contexto

O módulo Workouts gerencia o ciclo completo de prescrição e execução de treinos:

1. **Planejamento** — o specialist organiza o trabalho em periodizações e fases
2. **Prescrição** — treinos com exercícios, séries, repetições e cargas definidas
3. **Biblioteca** — treinos reutilizáveis criados pelo specialist, independentes de qualquer periodização
4. **Execução** — o aluno executa o treino e o sistema registra o que foi feito
5. **Catálogo** — banco global de exercícios, verificados ou criados por specialists

---

## Hierarquia de planejamento

```
training_periodizations   ← macrociclo  ("Projeto Verão 2026")
    └── training_plans    ← fase        ("Fase de Adaptação — semanas 1-4")
            └── workouts  ← treino      ("Treino A — Peito e Tríceps")
                    └── workout_exercises ← prescrição (Supino 3x10 80kg)
```

A **biblioteca** é composta pelos treinos do specialist que têm `training_plan_id = NULL`. São templates reutilizáveis. Ao importar da biblioteca para uma fase, o treino é **copiado** — cada fase tem uma cópia independente e edições em um não afetam o outro.

---

## Enum compartilhado — `training_status`

Usado tanto em `training_periodizations` quanto em `training_plans`. Enum no banco — valores inválidos são rejeitados antes de chegar na aplicação.

```
training_status: planned | active | completed
```

| Valor | Significado |
|-------|-------------|
| `planned` | Criado mas ainda não iniciado |
| `active` | Em andamento |
| `completed` | Encerrado |

**Por que enum e não text?**
Com `text`, nada impede que o código insira `'ativo'`, `'ACTIVE'` ou `'finalizado'`. O enum garante consistência sem precisar de validação na aplicação — o banco rejeita na origem.

---

## Tabela `exercises` — catálogo global

**`is_verified`**: `true` = exercício oficial da plataforma. `false` = criado por um specialist. Specialists veem ambos. No futuro, um fluxo de aprovação pode promover exercícios de specialists para verificados.

**`created_by NULL`**: exercícios oficiais não têm dono (`created_by = NULL`). Exercícios de specialists referenciam o criador. `SET NULL` na deleção do specialist — o exercício é preservado para não quebrar histórico de prescrições.

**`muscle_group` como text e não enum**: grupos musculares podem ser granulares ou agregados dependendo do contexto ("Peito" vs "Peitoral Maior"). Flexibilidade necessária.

---

## Tabela `training_periodizations` — macrociclo

**`specialist_id CASCADE DELETE`**: periodização pertence ao specialist. Se o specialist for removido, as periodizações do aluno associadas a ele são deletadas. Os dados do aluno em outras tabelas (avaliações, anamnese) não são afetados.

**`start_date` / `end_date` como `date`**: tipo `date` no PostgreSQL não tem timezone — é puro ano-mês-dia, sem ambiguidade. O argumento anterior de usar `text` ("evita timezone issues") se aplica a `timestamp`, não a `date`. Usar `date` permite queries como `WHERE start_date <= now()` para calcular periodizações ativas.

**`objective` como text**: o personal deve poder descrever livremente o objetivo — enum seria restritivo demais para algo descritivo.

---

## Tabela `training_plans` — fase/mesociclo

**`status` próprio da fase**: uma periodização `active` pode ter fase 1 `completed` e fase 2 `active` simultaneamente. O specialist acompanha progresso granular dentro do ciclo sem precisar de lógica derivada.

**`start_date` / `end_date`**: definem a duração de cada fase dentro do macrociclo. O specialist preenche ao criar a fase. Nullable — pode definir as datas depois.

**`order_index`**: define a sequência das fases dentro da periodização. Permite reordenar sem alterar datas.

---

## Tabela `workouts` — treino / biblioteca

**`training_plan_id NULL` = biblioteca**: quando `NULL`, o treino pertence à biblioteca pessoal do specialist — não está associado a nenhuma fase. Quando preenchido, o treino faz parte de uma fase específica.

**`specialist_id` nullable (migration 0012)**: obrigatório para treinos de specialist. `NULL` quando o treino pertence a um `member` auto-gerenciado.

**`student_id` nullable**: preenchido apenas para treinos criados por `member` (`specialist_id = NULL`). Constraint garante que pelo menos um dos dois campos é não-nulo.

**Importar da biblioteca**: ao importar um treino da biblioteca para uma fase, o sistema:
1. Cria um novo registro em `workouts` com `training_plan_id` preenchido
2. Copia todos os `workout_exercises` do treino original para o novo
3. O treino original na biblioteca permanece intacto
Editar o treino na fase não afeta a biblioteca. Editar a biblioteca não afeta fases que já importaram.

**`difficulty` — enum `workout_difficulty`**:
Mesmo sendo informativo, os valores são fixos e conhecidos. Enum previne inconsistências como `'Iniciante'`, `'easy'` ou `'ADVANCED'` que quebrariam filtros e labels na UI.

**`day_of_week` — enum `day_of_week`**:
O specialist associa o treino a um dia da semana ou deixa NULL (qualquer dia). Enum garante que não entrem valores como `'Segunda'`, `'Mon'` ou `'2'`.

---

## Tabela `workout_exercises` — prescrição

**`reps` e `weight` como text**: ambos precisam suportar valores qualitativos além de números puros. `reps = 'AMRAP'` e `weight = 'bodyweight'` são prescrições válidas e comuns.

**`exercise_id RESTRICT`**: não permite deletar um exercício que esteja em uso em prescrições. Diferente de `SET NULL` — se o exercício sumir, a prescrição perde sentido. O sistema deve impedir a deleção ou oferecer substituição.

**Sem `updated_at`**: prescrições não são editadas individualmente. Para alterar, o specialist deleta e recria. Isso mantém o histórico de sessões coerente — a sessão referencia a prescrição que existia na época.

---

## Tabela `workout_sessions` — execução

**`completed_at NULL`**: sessão em andamento (aluno abriu o treino mas ainda não terminou). O app pode retomar uma sessão não finalizada.

**`workout_id SET NULL`**: quando um treino é deletado (ex: specialist reorganiza a periodização), a sessão do aluno é preservada — apenas perde a referência ao treino. O histórico de performance (`sets_data`, `intensity`, `notes`, datas) fica intacto. Isso é exigência LGPD: o dado do aluno não pode ser destruído por ação unilateral do specialist.

**Por que não RESTRICT?** RESTRICT bloquearia toda a cadeia de deleção `training_periodizations → training_plans → workouts`. Se um aluno executou qualquer treino de uma periodização, o specialist nunca conseguiria deletar ou reorganizar a estrutura — erro silencioso difícil de diagnosticar.

**`intensity`**: RPE (Rate of Perceived Exertion) de 1-10. O aluno avalia no final da sessão. Útil para análise de progressão e ajuste de carga pelo specialist.

**Sem `specialist_id`**: enquanto o workout existir, o specialist é derivável via `workout → training_plan → training_periodizations.specialist_id`. Quando `workout_id` vira NULL (treino deletado), a sessão fica órfã de specialist — mas o dado do aluno permanece.

---

## Tabela `workout_session_exercises` — execução por exercício

**`workout_exercise_id` em vez de `exercise_id`**: referencia a **prescrição** (não o catálogo). Enquanto a prescrição existir, permite comparar o que foi prescrito com o que foi executado:
- Prescrito: `workout_exercises.sets=3, reps='10', weight='80kg'`
- Executado: `sets_data=[{set:1, reps:10, weight:82.5, completed:true}, ...]`

**`SET NULL` na deleção da prescrição**: se o specialist deletar um exercício da prescrição (ou a periodização inteira), `workout_exercise_id` vira NULL. O `sets_data` com os dados reais executados pelo aluno é preservado — a comparação prescrito/executado deixa de ser possível, mas o histórico de performance do aluno permanece intacto. Mesma lógica do `workout_id SET NULL` na sessão.

**`sets_data` jsonb**: array de objetos, uma entrada por série executada.
```json
[
  {"set": 1, "reps": 10, "weight": 80.0, "completed": true},
  {"set": 2, "reps": 9,  "weight": 80.0, "completed": true},
  {"set": 3, "reps": 8,  "weight": 75.0, "completed": true}
]
```
Cada série pode ter peso e reps diferentes — realidade comum no treino real. Jsonb aqui é justificado: a query de uma sessão sempre lê o bloco completo, não filtra por série individual.

---

## O que foi explicitamente rejeitado

| Decisão rejeitada | Motivo |
|------------------|--------|
| `periodizations` como nome da tabela | O código inteiro já usa `training_periodizations`. Drizzle precisa ser atualizado para refletir o banco real. |
| `start_date` / `end_date` como `text` | `date` no PostgreSQL não tem timezone — o argumento de usar text era válido para `timestamp`, não para `date`. |
| `professional_id` na periodização | Renomeado para `specialist_id` para consistência com o novo vocabulário do domínio. |
| `finished_at` na sessão | Renomeado para `completed_at` para alinhar com os tipos TypeScript existentes. |
| `workout_session_exercises` referenciando `exercise_id` | Referenciar a prescrição (`workout_exercise_id`) permite comparar prescrito vs executado. Referenciar só o catálogo perde esse contexto. |
| `training_plan_id NOT NULL` em workouts | Bloqueia o conceito de biblioteca. Treinos avulsos (biblioteca) são um caso de uso real — o specialist precisa criar treinos independentes para reutilizar. |
| Status como `text` | Enum no banco rejeita valores inválidos na origem, sem depender de validação na aplicação. |
| Referenciar workout original ao importar da biblioteca | Editar um afetaria o outro — comportamento não esperado. Copiar ao importar dá independência total a cada fase. |
| `workout_id RESTRICT` em workout_sessions | RESTRICT bloquearia a deleção de toda a cadeia periodização → fase → treino se qualquer sessão existisse. SET NULL preserva o histórico do aluno e deixa o specialist reorganizar livremente. |
| `workout_exercise_id RESTRICT` em workout_session_exercises | Mesmo motivo — RESTRICT bloquearia o cascade. SET NULL preserva o sets_data do aluno mesmo sem a referência à prescrição. |

---

## Compliance LGPD

Base legal, finalidade, retenção e direitos dos titulares deste módulo estão em
[`docs/LGPD_COMPLIANCE.md`](../LGPD_COMPLIANCE.md), que é o registro canônico.
As políticas de RLS vivem nas migrations (`supabase/migrations/`), não aqui — ver
[ADR-0014](../adr/0014-rls-helpers-security-definer.md).

### Bloco C — Segurança e RLS ⚠️

RLS obrigatório. Políticas mínimas:

**Garantia crítica:** specialist só acessa sessões de alunos com `student_specialists.status = 'active'`. Ao desvincular, perde acesso ao histórico de sessões via RLS — os dados permanecem no banco mas ficam invisíveis.
