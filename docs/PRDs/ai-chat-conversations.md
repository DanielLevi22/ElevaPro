# PRD: ai-chat-conversations

**Data de criação:** 2026-08-16
**Status:** approved
**Branch:** feature/ai-chat-conversations
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?

Permitir que o especialista tenha **várias conversas** com o coach de IA sobre o
mesmo aluno, em vez de uma única que nunca termina.

### Por quê?

Hoje `getOrCreateSession(studentId, specialistId, module)` procura a sessão mais
recente daquele trio e devolve ela. Não existe caminho para começar de novo: a
conversa de hoje continua a de três semanas atrás.

Três consequências, em ordem de gravidade:

**1. Uma linha de raciocínio contamina a outra.** Discutir um bloco de
hipertrofia e depois um de emagrecimento para o mesmo aluno acontece dentro do
mesmo histórico. O modelo carrega a discussão anterior e responde influenciado
por decisões que já foram descartadas.

**2. A conversa só cresce.** O histórico inteiro é reenviado a cada turno. Uma
sessão de meses fica cara e lenta, e não há como encerrá-la.

**3. Não há como voltar.** Se a conversa desandou — o modelo entendeu errado e
insistiu —, o especialista não tem como recomeçar limpo.

### Como saberemos que está pronto?

- [x] O especialista cria uma conversa nova sobre um aluno sem perder as antigas
- [x] Uma lista mostra as conversas daquele aluno, com título e data
- [x] Trocar de conversa carrega o histórico dela, e só dela
- [x] Uma proposta pendente pertence à conversa onde nasceu — aprovar numa não
      afeta a outra
- [x] Arquivar uma conversa a tira da lista sem apagar o registro
- [x] Conversa nova **não** re-pergunta o que já está na anamnese e na avaliação
- [ ] O aluno continua sem acesso às conversas do especialista sobre ele
- [ ] Teste cobrindo o isolamento de estado entre duas conversas do mesmo aluno

---

## A ressalva que muda o desenho

**Conversa nova não pode significar "coach sem contexto".**

É a armadilha óbvia desta feature, e ela transformaria uma melhoria em
regressão: o especialista abre uma conversa nova e o coach volta a perguntar
objetivo, lesão e frequência — tudo que já está gravado.

O que separa as duas coisas é a origem do que o modelo sabe:

| | De onde vem | Ao criar conversa nova |
|---|---|---|
| **Conhecimento do aluno** — anamnese, avaliação, periodizações, análise corporal | Lido do banco a cada turno por `loadStudentContext` | **Continua igual** |
| **Diálogo** — o que foi dito, o que foi decidido, propostas pendentes | `ai_chat_messages` e `ai_chat_sessions.state` | **Recomeça** |

O contexto do aluno nunca esteve na conversa: ele é montado do zero a cada
requisição. Então "conversa nova" já significa, hoje, "mesmo conhecimento,
diálogo limpo" — que é exatamente o que se quer.

**A feature é mais barata do que parece.** O que falta não é reconstruir
contexto: é deixar de forçar a reutilização da última sessão e dar uma lista ao
especialista.

---

## Contexto técnico

### O que já existe e serve

```ts
ai_chat_sessions   id, student_id, specialist_id, module, state, created_at, updated_at
ai_chat_messages   session_id, role, content, created_at
```

A tabela **já modela várias sessões** por aluno — nada impede duas linhas com o
mesmo trio. O que impede é o `getOrCreateSession`, que devolve sempre a mais
recente.

O `state` (jsonb) já é por sessão, então `pendingWorkoutProposal`,
`pendingDietPlan` e `savedDietPlanId` já ficam isolados entre conversas sem
mudança nenhuma.

### O que falta

**Uma coluna `title`.** A lista precisa de algo além da data. E um `archived_at`,
para sumir da lista sem apagar — conversa com o coach é registro de prescrição
assistida, e a seção 7 do `LGPD_COMPLIANCE` já declara retenção enquanto a conta
existir.

**O `sessionId` na requisição.** Hoje a rota recebe só `studentId` e resolve a
sessão sozinha. Precisa aceitar `sessionId` e, **quando ele vier, validar que
pertence àquele aluno e àquele especialista** — é entrada não confiável, e a
rota usa `service_role`, que não consulta RLS. Mesmo cuidado que o `phaseOwnedBy`
já faz com `phase_id`.

**A lista e o seletor na UI**, nos dois coaches — treino e nutrição.

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. A conversa carrega dado de saúde: o contexto do
> aluno entra no prompt e as respostas do modelo comentam lesão e restrição.

**Bloco A — Necessidade** ⚠️ Mais conversas significam mais histórico de saúde
guardado. O contrapeso é real: conversas separadas e encerráveis coletam **menos**
que uma única que cresce para sempre, porque o histórico reenviado a cada turno
para de crescer sem limite. O arquivamento é o que fecha isso — sem ele, a
feature só multiplica.

**Bloco B — Base legal** ✅ Sem mudança: execução de contrato para a prescrição,
com o consentimento de saúde já verificado no carregamento do contexto.

**Bloco C — Segurança** ❌ **BLOQUEADOR.** O `sessionId` passa a vir do cliente
numa rota que usa `service_role`. Sem validar o dono, um especialista lê a
conversa de outro sobre qualquer aluno — é a mesma classe do IDOR resolvido na
dívida 27. A validação não é detalhe de implementação: é condição para a feature
existir.

**Bloco D — Direitos** ⚠️ A exportação de dados do titular precisa incluir as
conversas, e a exclusão de conta precisa levá-las junto. `ON DELETE CASCADE` a
partir de `profiles` já cobre a exclusão; a exportação precisa ser conferida.

**Bloco E — Transparência** ⚠️ O aluno sabe que existe um coach de IA? A
Política de Privacidade menciona que a conversa do especialista sobre ele é
guardada? Verificar antes de multiplicar o volume.

---

## Escopo

### Incluído

**Fase 1 — o banco e a rota deixam de forçar uma só** ✅
- `title` e `archived_at` em `ai_chat_sessions`
- `getOrCreateSession` ganha um irmão: `createSession`, e a rota aceita
  `sessionId` opcional
- **Validação de dono do `sessionId`**, com teste negativo — `sessionOwnedBy`, quatro testes, verificados removendo o filtro por especialista
- Sem `sessionId`, o comportamento atual é preservado — a última conversa
  continua sendo retomada

**Fase 2 — o especialista escolhe** ✅ (coach de treino; nutrição pendente)
- Lista de conversas do aluno, com título, data e contagem de mensagens
- Botão de nova conversa
- Trocar de conversa recarrega histórico e estado
- Arquivar

**Fase 3 — título automático**
- A conversa nasce sem título e ganha um depois das primeiras mensagens,
  derivado do que foi discutido. Uma lista de "Conversa de 14/08" não ajuda a
  achar nada.

### Fora do escopo

- **Compartilhar conversa entre especialistas.** Dois especialistas do mesmo
  aluno continuam com conversas separadas — misturá-las levanta questão de
  acesso que esta feature não resolve.
- **Busca dentro do histórico.** Depois, se a lista crescer.
- **Ramificar a partir de uma mensagem.** Interessante e caro; conversa nova
  resolve o problema relatado.
- **Dar ao aluno acesso às conversas do especialista sobre ele.** É outra
  decisão de produto, com peso de LGPD próprio.

---

## Riscos

**A lista vira lixo.** Sem título automático, o especialista acumula dez
"Conversa de 14/08" e volta a usar uma só — a feature existiria sem ser usada. A
Fase 3 não é enfeite.

**Proposta pendente órfã.** Se o especialista troca de conversa com uma proposta
aberta no cartão, o que acontece com ela? O `state` é por sessão, então ela fica
onde nasceu — mas a UI precisa deixar isso claro, senão parece que sumiu.

---

## Referências

- `web/src/modules/ai/services/chatService.ts` — `getOrCreateSession`
- `web/src/app/api/ai/chat/[studentId]/route.ts`
- `web/src/app/api/ai/nutrition/chat/[studentId]/route.ts`
- `web/src/modules/ai/components/AiCoachChat.tsx`
- `shared/src/database/schema/ai.ts`
- Dívida 27 do STATUS — o IDOR que esta feature pode reintroduzir
