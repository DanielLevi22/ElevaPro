# PRD: ai-nutrition-coach

**Data de criação:** 2026-08-12
**Status:** approved
**Branch:** feature/ai-nutrition-coach
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
O mesmo fluxo do coach de treino, para nutrição: uma conversa que monta plano
alimentar, define metas e distribui as refeições com alimentos, revisada em
cartão e salva com um clique.

### Por quê?
Montar dieta hoje é preencher formulário: criar o plano, criar refeição a
refeição, buscar cada alimento e digitar cada quantidade. O especialista já tem
o coach de treino conduzindo essa conversa — a nutrição ficou de fora, e é o
outro metade do serviço que ele vende.

O ganho não é digitar menos. É o mesmo do treino: o coach enxerga a anamnese,
então uma restrição alimentar declarada entra na conta antes de o plano existir.

### Como saberemos que está pronto?
- [ ] O especialista cria plano alimentar completo pela conversa: metas,
      refeições e alimentos, revisa no cartão e salva
- [ ] O cartão mostra a prescrição inteira — alimento, quantidade e as calorias
      e macros por refeição
- [ ] Alimento que não existe no catálogo faz a proposta ser recusada, com a
      lista do que faltou — nunca salva pela metade
- [ ] Nenhum dado de saúde vai para a Anthropic sem consentimento vigente
- [ ] Um especialista sem vínculo ativo não abre a conversa
- [ ] `diet_plans` criado pela IA tem período preenchido
- [ ] Aprovar no cartão registra no histórico — o coach não pede aprovação de
      novo
- [ ] A tela de detalhe da dieta abre sem quebrar para plano sem data

---

## Contexto

O coach de treino ficou pronto no [ai-coach-workout-stage](ai-coach-workout-stage.md).
A infraestrutura que ele deixou é reaproveitável quase inteira:

| Peça | Estado |
|---|---|
| `BaseOrchestrator` com `tool_start`/`tool_end` | pronta |
| Contexto do aluno com consentimento verificado | pronta |
| `authorizeLinkedSpecialist` na rota | pronta |
| `ai_chat_sessions.module` | **já aceita `"nutrition"`** — `getOrCreateSession` tem o parâmetro e ninguém usa |
| Padrão propor → cartão → aprovar → gravar | pronto |
| `nutrition.service.ts` | tem `createDietPlan`, `createDietMeal`, `addFoodsToMeal`, `searchFoods` |

O que não dá para copiar é justamente onde estão os problemas.

---

## Achados do levantamento

### N1 — O catálogo de alimentos não tem categoria 🔴

44 alimentos, e **`category` é `NULL` nos 44**. Uma ferramenta com filtro por
categoria — "proteínas", "carboidratos" — devolveria zero em todas as chamadas,
e o coach afirmaria que o catálogo está vazio.

É exatamente o defeito que o coach de treino teve com `muscle_group`, e que
custou dois dias para aparecer. Copiar o desenho do `query_exercises` aqui seria
reproduzi-lo de propósito.

**Decisão:** `query_foods` busca **por nome**, não por categoria, e devolve o
`total`. Categorizar os 44 alimentos é trabalho de curadoria, não desta entrega —
fica registrado como dívida.

### N2 — A tela de detalhe quebra com plano sem data 🔴

`DietDetailsHeader.tsx:169`:

```ts
format(new Date(dietPlan.start_date ?? ""), "d 'de' MMM", { locale: ptBR })
```

`new Date("")` é `Invalid Date`, e o `format` do date-fns **lança**
`RangeError`. É a mesma armadilha registrada no `STATUS.md` depois do incidente
das periodizações. `diet_plans.start_date` é nullable, então qualquer plano sem
data derruba a tela.

O coach de treino teve o mesmo problema e a `0024` resolveu tornando as datas
obrigatórias. Aqui vale o mesmo: o plano nasce com período, e a tela para de
depender de sorte.

### N3 — O alimento é obrigatório e restrito

`diet_meal_items.food_id` é `NOT NULL` com `ON DELETE restrict`. Não existe
"item de refeição em texto livre": a IA precisa mapear para alimento existente,
como já faz com exercício. Vale a mesma validação antes de guardar a proposta.

### N4 — Dieta única e dieta cíclica

`diet_plans.plan_type` é `unique | cyclic`, e `diet_meals.day_of_week` é `NULL`
para única, `0–6` para cíclica. O coach precisa perguntar qual dos dois antes de
montar as refeições — são estruturas diferentes, não um detalhe de exibição.

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. O caminho é o mesmo já aberto no
> [ai-coach-workout-stage](ai-coach-workout-stage.md); esta seção registra o que
> muda.

**Bloco A — Necessidade** ✅
Nenhum campo novo. O contexto enviado à Anthropic é o mesmo do coach de treino,
que já foi recortado a seis campos da anamnese mais peso, altura e % de gordura
— e sem o nome do titular. Para dieta, esses campos são ainda mais diretamente
a finalidade: peso e composição corporal definem a meta calórica.

**Bloco B — Base Legal** ✅
Plano alimentar é dado sensível: Tutela da saúde (Art. 11, II, f) +
Consentimento, exatamente como `diet_plans` já está mapeado na seção 3 do
`LGPD_COMPLIANCE.md`. A verificação de `student_consents` já roda em
`loadStudentContext` e vale para esta rota também, pelo mesmo caminho.

**Bloco C — Segurança** ✅
`authorizeLinkedSpecialist` na rota, `service_role` sem RLS abaixo — o mesmo
desenho auditado no PR #99. A guarda `check-api-auth.js` cobre a rota nova
automaticamente.

**Bloco D — Direitos** ⚠️
A conversa de nutrição vai para `ai_chat_messages`, já registrada na seção 2.2
como local secundário de dado sensível, com retenção na seção 7 e `CASCADE` a
partir de `profiles`. Sem mudança — mas o volume cresce, porque a conversa de
dieta cita quantidade e alimento, que dizem muito sobre a pessoa.

**Bloco E — Prevenção** ⚠️
Duas pendências que esta entrega herda e não resolve: a Anthropic ainda não
consta como sub-processadora na Política de Privacidade, e o texto do
consentimento não menciona envio a terceiro para prescrição assistida.

**Atualização necessária:** seção 10 do `LGPD_COMPLIANCE.md` — incluir
`/api/ai/nutrition/chat/[studentId]` no mapa de rotas de IA.

---

## Escopo

### Incluído

**Fase 1 — a conversa**
- Rota `/api/ai/nutrition/chat/[studentId]`, sessão com `module: "nutrition"`
- Prompt do nutricionista, com os mesmos guard-rails do coach de treino:
  restrição declarada é intransponível, nunca anunciar sem acionar, nunca
  afirmar ausência de restrição sem ter o dado

**Fase 2 — as ferramentas**
- `query_foods` — busca por nome, com `total`, e erro que sobe
- `propose_diet_plan` — nome, tipo, período, metas de calorias e macros
- `propose_meals` — refeições com alimento, quantidade e unidade

**Fase 3 — cartão e gravação**
- `DietPlanProposalCard` com metas e período
- `DietMealsProposalCard` com a prescrição inteira e o total por refeição
- Rota de aprovação que grava plano, refeições e itens a partir da cópia
  guardada no servidor
- A aprovação entra no histórico, como no coach de treino

**Fase 4 — a tela que quebra**
- `DietDetailsHeader` passa a usar o utilitário de data em vez de `format` cru
- Migration tornando `diet_plans.start_date/end_date` obrigatórios

### Fora do escopo (explicitamente)

- **Criar alimento novo no catálogo pela IA.** `foods` é compartilhado; deixar o
  modelo inserir polui a base de todos os especialistas. Mesma decisão do
  catálogo de exercícios.
- **Categorizar os 44 alimentos.** Curadoria, não código. Dívida registrada.
- **Cálculo de meta calórica por fórmula** (Harris-Benedict, Mifflin). O coach
  sugere pela conversa; automatizar é outra feature, com validação clínica
  própria.
- **Substituição de alimento pelo aluno.** Já existe em `meal_logs`.
- **Coach de nutrição para o aluno.** O `nutribot` já existe e é outra persona.

---

## Fluxo de dados

```
Especialista → POST /api/ai/nutrition/chat/[studentId]
  → authorizeLinkedSpecialist        ← vínculo ativo
  → loadStudentContext               ← consentimento verificado
  → prompt sem o nome do titular
  → Anthropic

  tool propose_diet_plan  → state.pendingDietPlan   → cartão
  tool propose_meals      → valida alimentos        → cartão
  botão Aprovar → POST /save-diet → grava a cópia guardada
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|---|---|---|
| `foods` | SELECT | Catálogo; sem INSERT pela IA |
| `diet_plans` | INSERT | Período obrigatório |
| `diet_meals` | INSERT | `day_of_week` só na dieta cíclica |
| `diet_meal_items` | INSERT | `food_id` mapeado e validado antes |
| `ai_chat_sessions`, `ai_chat_messages` | SELECT, INSERT, UPDATE | `module: "nutrition"` |

Nenhuma tabela nova. Uma migration para as datas.

## Impacto em outros módulos

- **AI (web)** — orquestrador novo, reusando a base
- **Nutrition (web)** — `DietDetailsHeader` corrigido
- **Mobile** — nenhum

---

## Decisões técnicas

**Busca por nome, não por categoria.** O catálogo não tem categoria preenchida.
Uma ferramenta que filtra por algo que é `NULL` em 100% das linhas devolve zero
sempre, e o modelo conclui que o catálogo está vazio — foi literalmente o que
aconteceu com os exercícios.

**Orquestrador próprio, base compartilhada.** `NutritionOrchestrator` estende
`BaseOrchestrator`: os eventos de atividade, o loop de ferramenta e o
tratamento de erro já estão resolvidos e testados.

**Duas propostas, dois cartões.** Metas e refeições são decisões distintas: o
especialista pode aprovar a meta calórica e ainda discutir a distribuição. Um
cartão só obrigaria a refazer tudo por causa de um ajuste.

**A proposta fica no servidor.** Mesma razão do treino: pedir ao modelo para
reemitir um plano com 5 refeições e 20 itens abriria espaço para divergir do que
o especialista aprovou olhando o cartão.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Repetir o defeito do `muscle_group` com `category` | A ferramenta não tem filtro por categoria; o achado N1 está no PRD para quem for mexer |
| Plano salvo com item que não existe | Validação de nome antes de guardar a proposta, como nos exercícios |
| Tela de detalhe quebrando com data nula | Migration + utilitário de data; o `format` cru sai |
| Dieta cíclica salva como única | O coach pergunta o tipo antes de montar; o cartão mostra qual é |

---

## Checklist de done

- [ ] Plano alimentar criado e salvo pela conversa, verificado contra o banco
- [ ] Alimento inexistente recusa a proposta
- [ ] Consentimento verificado antes de qualquer dado de saúde ir para o prompt
- [ ] `DietDetailsHeader` abre com plano sem data
- [ ] `docs/LGPD_COMPLIANCE.md` seção 10 atualizada
- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/ai-nutrition-coach.md` criado
- [ ] `docs/STATUS.md` atualizado
