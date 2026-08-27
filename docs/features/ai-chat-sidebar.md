# Feature: conversas na lateral

**Implementado em:** 2026-08-27
**PRD:** [ai-chat-sidebar](../PRDs/ai-chat-sidebar.md)
**Branch:** `feature/ai-chat-sidebar`

---

## O que existe hoje

`/dashboard/students/[id]/ai-coach` é uma tela de duas colunas. À esquerda, a
lista de conversas do especialista sobre aquele aluno — **treino e nutrição
juntos**, cada linha com o ícone do coach a que pertence. À direita, a conversa
aberta, renderizada pelo componente do coach correspondente.

`/dashboard/students/[id]/nutrition-coach` redireciona para cá. Ela nunca teve
aba no `StudentDetailShell`: existia, respondia, e só chegava quem digitasse a
URL.

---

## Como o título nasce

Duas etapas, na mesma primeira troca:

| Quando | O quê | Onde |
|---|---|---|
| No envio da 1ª mensagem | Primeira mensagem truncada na palavra | `definirTituloProvisorio` |
| Depois do stream terminar | Título gerado por `claude-haiku-4-5-20251001` | `nomearConversa` |

O provisório existe porque o definitivo só fica pronto depois da resposta — e é
enquanto o modelo responde que a lista é olhada. O definitivo roda **depois** do
stream, nunca durante: somar uma chamada à resposta que a pessoa espera trocaria
organização por latência.

**Só age na primeira troca.** `storedMessages.length === 0` é a condição. Depois
disso o que está lá foi escolhido — pelo gerador ou pela pessoa — e não se mexe.
É o que faz o renomear à mão sobreviver sem precisar de coluna nova.

**Falha em silêncio.** A resposta já foi entregue; título é conveniência.

### O que o prompt proíbe

O título fica visível o tempo todo na lateral, inclusive para quem passa atrás
do especialista — diferente do corpo da conversa, que exige abrir e rolar. O
gerador recebe exemplos do que **não** fazer:

- `"Reabilitação de hérnia L5"` — expõe condição clínica
- `"Treino do João"` — nomeia o titular
- `"Planejamento de treino"` — serve para qualquer conversa

Verificado ao vivo: `"Quero montar um bloco de forca de 8 semanas para esse
aluno, 4x por semana"` virou **"Bloco de força 8 semanas"**.

---

## O bug que veio junto

O aluno abria um treino prescrito e a lista de exercícios vinha vazia.

`workouts.student_id` (migration `0012`) existe para o **member que cria treino
para si mesmo**. Num treino prescrito dentro de uma fase ele é NULL, e o vínculo
passa por `training_plans → training_periodizations.student_id`.

A `0018` escreveu duas políticas e só uma soube disso: `workouts_student_read`
conhece os dois caminhos, `workout_exercises_student_read` ficou só com o do
member. O aluno passava pela primeira e era barrado pela segunda — daí a forma
exata do sintoma.

A `0033` alinha as duas. Não dá para delegar a um `EXISTS` apoiado na política
de `workouts`: a subconsulta dentro de uma policy roda sem aplicar a policy da
tabela consultada.

**Por que nada pegou:** as colunas estavam certas, o tipo estava certo, e RLS não
devolve erro — devolve zero linhas. `test-rls-isolation.mjs` só provava uma
direção (quem não deve ver, não vê); agora prova as duas.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `web/src/modules/ai/pages/AiCoachWorkspace.tsx` | Duas colunas; dono da lista e da conversa aberta |
| `web/src/modules/ai/components/ConversationSidebar.tsx` | Lista, criar, renomear, arquivar, recolher |
| `web/src/modules/ai/services/conversationTitle.ts` | Provisório e definitivo |
| `web/src/modules/ai/services/chatService.ts` | `listSessions("all")`, `updateSessionTitle` |
| `web/src/app/api/ai/chat/[studentId]/sessions/route.ts` | `?module=all`, `PATCH` com `title` |
| `web/src/app/api/ai/nutrition/chat/[studentId]/route.ts` | `GET` passou a aceitar `?sessionId=` |
| `supabase/migrations/0033_workout_exercises_student_read.sql` | A política que faltava |
| `app/src/app/student/workout-detail.tsx` | Separa "sem exercícios" de "não carregou" |
| `app/src/app/student/execute-workout.tsx` | Parou de descartar o `error` |

---

## O que ficou de fora

- **Busca na lista** — depois, se passar de umas vinte conversas.
- **Agrupar por data** ("Hoje", "Últimos 7 dias") — enfeite enquanto a lista for
  curta.
- **Renomear automático depois do primeiro título** — conversa que muda de
  assunto no meio deveria ter virado outra conversa.

---

## Pendência que não é desta feature

A `0033` só chega ao aluno quando as migrations `0016`–`0032` forem aplicadas em
produção — dívida 25 do `STATUS.md`. Até lá o bug continua de pé lá.
