# Feature: ai-nutrition-coach

**Status:** active
**PRD:** [ai-nutrition-coach](../PRDs/ai-nutrition-coach.md)
**Plataformas:** web
**Última atualização:** 2026-08-12

---

## O que é

`/dashboard/students/[id]/nutrition-coach` — a conversa que monta o plano
alimentar: metas, refeições e alimentos, revisados em cartão e salvos com um
clique.

## Por que existe

Montar dieta era preencher formulário: criar o plano, criar refeição a refeição,
buscar cada alimento, digitar cada quantidade. O coach de treino já conduzia
essa conversa do outro lado do produto; nutrição era a metade que faltava.

E o ganho não é digitar menos: o coach lê a anamnese, então uma restrição
alimentar declarada entra na conta antes de o plano existir.

---

## Fluxo de dados

```
Especialista → POST /api/ai/nutrition/chat/[studentId]
  → authorizeLinkedSpecialist       ← vínculo ativo
  → loadStudentContext              ← consentimento verificado, sem o nome
  → Anthropic

  propose_diet_plan → state.pendingDietPlan  → cartão → POST /save-plan
  query_foods       → catálogo
  propose_meals     → valida alimentos       → cartão → POST /save-meals
```

## Tabelas do banco

| Tabela | Operação |
|---|---|
| `foods` | SELECT — catálogo, sem INSERT pela IA |
| `diet_plans` | INSERT — período obrigatório desde a `0025` |
| `diet_meals` | INSERT — `day_of_week` só na dieta cíclica |
| `diet_meal_items` | INSERT — `food_id` mapeado e validado antes |
| `ai_chat_sessions`, `ai_chat_messages` | `module: "nutrition"` |

---

## Implementação

| Arquivo | Responsabilidade |
|---|---|
| `services/foodCatalog.ts` | Busca, validação de nome e mapeamento nome → id |
| `orchestrators/nutrition.orchestrator.ts` | Estende a base; só prompt e ferramentas mudam |
| `prompts/nutrition.prompts.ts` | Os dois estágios e os guard-rails |
| `tools/nutritionTools.ts` | `query_foods`, `propose_diet_plan`, `propose_meals` |
| `api/ai/nutrition/chat/[studentId]/` | Conversa, `save-plan` e `save-meals` |
| `components/DietProposalCards.tsx` | Os dois cartões |
| `components/NutritionCoachChat.tsx` | A conversa |
| `migrations/0025_diet_plan_dates_not_null.sql` | Período obrigatório |

---

## Regras de negócio

1. **Sem consentimento vigente, dado de saúde não sai do banco.** Herdado do
   `loadStudentContext`, que é o mesmo do coach de treino.
2. **Restrição alimentar é intransponível**, e o coach diz qual alimento tirou.
3. **Alimento vem do catálogo.** Nome inexistente recusa a proposta com a lista
   do que faltou — `diet_meal_items.food_id` é `NOT NULL` com `ON DELETE
   restrict`, não existe item em texto livre.
4. **A IA não cria alimento.** `foods` é compartilhado entre especialistas.
5. **Duas aprovações, duas propostas.** Metas e refeições são decisões
   distintas: dá para aprovar a meta calórica e ainda discutir a distribuição.
6. **Dieta única não tem `day_of_week`; cíclica tem 0–6.** São estruturas
   diferentes, e o coach pergunta qual antes de montar.
7. **A aprovação salva a cópia guardada no servidor.**

## Decisões técnicas não-óbvias

- **`query_foods` não filtra por categoria.** `foods.category` é `NULL` nos 44
  alimentos. Uma ferramenta que filtrasse por ela devolveria zero em toda
  chamada e o modelo concluiria que o catálogo está vazio — foi exatamente o que
  aconteceu com `muscle_group` no coach de treino. Há um teste afirmando que a
  coluna não é pedida, e ele deve cair se alguém acrescentar o filtro.

- **`getSessionState` espalha o estado em vez de montar campo a campo.** A
  versão anterior listava as chaves conhecidas, o que **descartava em silêncio**
  qualquer chave nova: a proposta de dieta era gravada e sumia na leitura
  seguinte, com a aprovação respondendo "nenhuma proposta pendente". Lista
  branca em getter cresce sem avisar.

- **Orquestrador próprio sobre a base compartilhada.** Eventos de atividade,
  loop de ferramenta e tratamento de erro já estavam resolvidos no coach de
  treino.

- **`DietDetailsHeader` parou de usar `format` cru.** `new Date("")` é
  `Invalid Date` e o `format` do date-fns **lança** — um plano sem período
  derrubava a tela inteira. A `0025` passou a recusar data nula, e a tela usa o
  utilitário.

## Verificação

9 testes em `foodCatalog`, mais a regressão do estado da sessão em
`chatService`. E a conversa exercitada ponta a ponta contra o banco local, com
aluno intolerante à lactose:

```
[metas]     13,9s  Calculando as metas do plano
  plano: Cutting 8 Semanas, unique, 01/09/2026, 1900 kcal, 180/170/60
[aprovar plano]    HTTP 200
[refeições] 19,5s  Consultando o catálogo → Montando as refeições
  Café da manhã(5), Almoço(5), Lanche da tarde(3), Jantar(5)
  propôs lácteo? não
[aprovar refeições] HTTP 200 — 4 refeições salvas
```

No banco: plano com período 01/09 → 27/10, e as refeições com alimento,
quantidade e unidade. Perguntando em seguida, o coach responde *"Sim, está tudo
salvo"* com o resumo — sem pedir aprovação de novo.

## Pendências conhecidas

- Os 44 alimentos não têm `category` preenchida. Categorizar é curadoria.
- Sem rate limit (dívida 29).
- A Anthropic ainda não consta como sub-processadora na Política de Privacidade.
- O cartão de refeições não soma calorias por refeição — o catálogo tem os
  macros, mas o cálculo por quantidade ficou de fora desta entrega.
