# Schema — Módulo Nutrition

> Registra **por que** o schema deste módulo é assim, e o que foi rejeitado.
> A fonte da verdade do DDL é `shared/src/database/schema/*.ts` ([ADR-0009](../adr/0009-migration-strategy.md)).

---

## Contexto

O módulo Nutrition gerencia o ciclo completo de prescrição e acompanhamento alimentar:

1. **Catálogo** — banco de alimentos público (TBCA/USDA) e customizados por especialista (`foods`)
2. **Prescrição** — plano alimentar com refeições e alimentos por dia (`diet_plans`, `diet_meals`, `diet_meal_items`)
3. **Acompanhamento** — registro diário do aluno: o que comeu, substituições, check-in por refeição (`meal_logs`)

Progresso corporal (peso, % gordura, medidas) não vive aqui — vem de `physical_assessments` e `body_scans` do módulo Assessment.

---

## Hierarquia de prescrição

```
diet_plans         ← plano do aluno  ("Cutting — Janeiro 2026")
    └── diet_meals ← refeição        ("Almoço — Segunda")
            └── diet_meal_items      ← prescrição (Frango 200g, Arroz 100g)
                    └── foods        ← catálogo de alimentos
```

O aluno registra o dia a dia em `meal_logs` — um log por refeição por dia, com flag de conclusão e substituições.

---

## Enums

| Enum | Valores | Usado em |
|---|---|---|
| `diet_plan_status` | `active \| finished` | `diet_plans.status` |
| `diet_plan_type` | `unique \| cyclic` | `diet_plans.plan_type` |

**`diet_plan_type`**:
- `unique` — mesma dieta todos os dias. Refeições têm `day_of_week = NULL`.
- `cyclic` — dieta diferente por dia da semana. Refeições têm `day_of_week = 0–6`.

**`diet_plan_status`** — apenas dois valores:
- `active` — plano em uso
- `finished` — encerrado (manual ou por expiração de `end_date`)

Não existe `completed` separado de `finished` — a distinção "manual vs expirado" é detalhe de implementação, não de estado persistido. Se `end_date < hoje` e `status = active`, o app finaliza automaticamente ao detectar.

---

## Tabela `foods` — catálogo global

**`is_custom + created_by`**: alimentos públicos têm `is_custom = false, created_by = NULL`. Alimentos criados por especialistas têm `is_custom = true, created_by = specialist_id`. O RLS permite que cada especialista veja os alimentos públicos mais os seus próprios customizados.

**`created_by SET NULL`**: se o especialista sair da plataforma, seus alimentos customizados são preservados — evita quebrar planos que os referenciam. O alimento fica "órfão" mas funcional.

**`search_vector`**: coluna `tsvector` atualizada por trigger a cada INSERT/UPDATE em `name`. Permite busca full-text eficiente sem depender de `ILIKE` conforme o catálogo cresce. O seed traz uma amostra da TACO, não a tabela inteira.

**`category` como text**: categorias de alimentos variam por contexto ("Proteína" vs "Carne Vermelha" vs "Carne"). Flexibilidade necessária — não vale enum.

---

## Tabela `diet_plans` — plano alimentar

**`specialist_id NULL`**: o especialista pode ser desvinculado após criar o plano. `SET NULL` preserva o plano — o aluno não perde o histórico.

**`version`**: número de versão exibido na aba "Histórico". Incrementado manualmente pelo especialista ao criar uma nova versão do plano. Sem lógica automática de versionamento — é só um label.

**Sem `is_active`**: redundante com `status`. Um plano é ativo se `status = 'active'`. Dois campos com a mesma informação criam risco de inconsistência.

**Um plano ativo por aluno**: enforçado na aplicação — antes de criar um novo plano, o anterior é finalizado. Não adicionamos constraint único no banco por `status` porque histórico de planos do mesmo aluno com `status = 'finished'` deve existir múltiplos.

---

## Tabela `diet_meals` — refeições do plano

**`day_of_week NULL` para dieta única**: quando `diet_plans.plan_type = 'unique'`, todas as refeições têm `day_of_week = NULL` — as mesmas refeições valem para todos os dias. Quando `plan_type = 'cyclic'`, `day_of_week` é obrigatório (0–6). Mais limpo que usar `-1` como sentinela.

**`name` livre**: o especialista nomeia a refeição como quiser — "Café da manhã", "Pré-treino", "Ceia fit". Não é enum para não limitar a criatividade do especialista.

**`meal_type` como texto livre**: categoria opcional para agrupar refeições em relatórios futuros. Sem enum — o produto ainda está descobrindo quais categorias fazem sentido.

---

## Tabela `diet_meal_items` — alimentos da refeição

**`food_id RESTRICT`**: não permite deletar um alimento que está sendo usado em alguma refeição prescrita. Diferente de `CASCADE` (que destruiria silenciosamente a prescrição) ou `SET NULL` (que deixaria item sem alimento). O especialista precisa remover o item primeiro.

**`unit` como text**: unidades de medida são muito variadas no contexto de nutrição — "colher de sopa", "xícara", "fatia", "unidade pequena". Enum seria restritivo demais.

---

## Tabela `meal_logs` — registro diário do aluno

**Uma tabela, dois propósitos**: `completed` registra o check-in da refeição. `actual_items` registra substituições — o aluno trocou um alimento por outro. Os dois acontecem no mesmo contexto (o aluno registrando o dia) e compartilham a mesma linha.

**Por que `actual_items` em jsonb e não tabela separada?**
Substituições são sempre lidas como bloco junto com o log — nunca consultamos um alimento específico dentro de `actual_items`. A query é sempre "me dê o log desta refeição neste dia". jsonb é adequado para dados sempre lidos em conjunto.

**`diet_plan_id SET NULL` e `diet_meal_id SET NULL`**: o log pertence ao aluno — se o plano ou a refeição for deletado, o histórico do aluno é preservado com os campos zerados. O aluno ainda tem a data e o `completed` como referência.

**`UNIQUE(student_id, diet_meal_id, logged_date)`**: garante que existe no máximo um log por refeição por dia por aluno. Um check-in é atualizado (UPDATE), não duplicado.

---

## O que foi explicitamente rejeitado

| Decisão rejeitada | Motivo |
|---|---|
| `nutrition_plans` como nome da tabela | Padronizado com prefixo `diet_` consistente com o restante do módulo |
| `meals` e `meal_foods` como nomes | Genéricos demais — `diet_meals` e `diet_meal_items` deixam clara a hierarquia |
| Dois campos `is_active` + `status` em `diet_plans` | Redundância — `status` sozinho é suficiente. Dois campos com a mesma informação criam risco de inconsistência |
| Três valores de status: `active / finished / completed` | `finished` cobre ambos os casos (manual e expirado). A distinção é detalhe de implementação, não de estado persistido |
| `day_of_week = -1` para dieta única | `NULL` é semânticamente correto para "não se aplica". Sentinela numérico é hack |
| `nutrition_progress` como tabela separada | Dados de progresso corporal vivem em `physical_assessments` e `body_scans` (Assessment). Fonte única de verdade |
| `actual_items` em tabela separada | Substituições são sempre lidas em bloco com o log — jsonb é adequado. Tabela separada adicionaria join sem ganho |
| Alimentos customizados globais (visíveis para todos) | Cada especialista tem escopo próprio. Alimentos globais precisariam de moderação — complexidade desnecessária no MVP |
| Enum para `meal_type` e `unit` | Muita variação legítima nesses campos. Enum restringiria sem benefício real |

---

## Compliance LGPD

Base legal, finalidade, retenção e direitos dos titulares deste módulo estão em
[`docs/LGPD_COMPLIANCE.md`](../LGPD_COMPLIANCE.md), que é o registro canônico.
As políticas de RLS vivem nas migrations (`supabase/migrations/`), não aqui — ver
[ADR-0014](../adr/0014-rls-helpers-security-definer.md).
