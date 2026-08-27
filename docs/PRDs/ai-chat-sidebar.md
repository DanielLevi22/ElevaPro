# PRD: ai-chat-sidebar

**Data de criação:** 2026-08-27
**Status:** done
**Branch:** feature/ai-chat-sidebar
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?

Duas coisas, e a segunda não tem parentesco com a primeira:

1. **O chat passa a ter barra lateral permanente**, no formato da referência
   enviada: lista de conversas à esquerda, conversa à direita, "nova conversa"
   no topo — e cada conversa ganha **título derivado da primeira mensagem**, em
   vez de "Conversa de 27/08".
2. **Correção de um bug no mobile**: o aluno abre um treino prescrito e a tela
   não mostra nenhum exercício.

O bug entra aqui porque foi assim que foi pedido. Vale o registro de que ele não
pertence a esta feature — é correção de RLS, sem relação com o chat — e por isso
sai da branch em commit próprio.

### Por quê?

**Sobre a lateral.** A Fase 2 do `ai-chat-conversations` entregou conversas
separadas, mas escondidas atrás de um menu suspenso e rotuladas por data. Duas
consequências:

*A lista não é descobrível.* Um seletor fechado não anuncia que existem outras
conversas. Quem não souber que a feature existe continua usando uma só — foi
exatamente o risco registrado naquele PRD: *"a feature existiria sem ser usada"*.

*Data não identifica conversa.* Com cinco conversas do mesmo aluno, "27/08",
"27/08" e "25/08" não dizem qual é a de hipertrofia e qual é a de emagrecimento.
A pessoa abre uma por uma até achar — mais trabalhoso que rolar uma conversa
única, que era o problema original.

**Sobre o bug.** O aluno não consegue treinar. É a função central do produto para
o lado dele, e a tela não erra: mostra o treino com a lista vazia, como se o
especialista tivesse prescrito um treino sem exercícios. Mais um caso do padrão
que este projeto já coleciona — **falha e ausência com a mesma aparência**.

### Como saberemos que está pronto?

**Lateral**
- [x] A lista de conversas fica visível sem nenhum clique
- [x] A conversa aberta é destacada na lista
- [x] "Nova conversa" está no topo da lateral, sempre alcançável
- [x] Em tela estreita a lateral recolhe e o chat ocupa a largura toda
- [x] As conversas de treino e as de nutrição aparecem na mesma lista, cada uma
      identificável pelo coach a que pertence
- [x] Abrir uma conversa de nutrição carrega **aquela** conversa, não a última
- [x] O coach de nutrição fica alcançável sem digitar URL

**Título**
- [x] Conversa nova ganha título assim que a primeira mensagem é enviada — sem
      esperar a resposta do modelo
- [x] O título reflete o assunto, não a data
- [x] Renomear à mão sobrescreve o título automático e não é sobrescrito depois
- [x] Nenhuma condição clínica do aluno aparece no título

**Bug do mobile**
- [x] O aluno abre um treino prescrito dentro de uma fase e vê os exercícios
- [x] Teste em `test-rls-isolation.mjs` cobrindo esse caminho, verificado
      negativamente (removida a política, o teste falha)
- [x] O aluno continua sem ver exercícios de treino que não é dele
- [x] A tela distingue "treino sem exercícios" de "não consegui carregar"

---

## Parte 1 — A lateral

### O que já existe

Fases 1 e 2 de `ai-chat-conversations` deixaram pronto, e **nada disso muda**:

| Peça | Onde |
|---|---|
| `title`, `archived_at` | migration `0032`, `shared/src/database/schema/ai.ts` |
| `createSession`, `listSessions`, `archiveSession`, `sessionOwnedBy` | `web/src/modules/ai/services/chatService.ts` |
| `GET`/`POST`/`PATCH` de sessões | `web/src/app/api/ai/chat/[studentId]/sessions/route.ts` |
| Carregar histórico por `sessionId` | `GET /api/ai/chat/[studentId]?sessionId=` |

A rota de sessões **já aceita `module: "nutrition"`**. O coach de nutrição não
precisa de backend novo — precisa só da UI, que nunca ganhou nem o seletor
suspenso.

### O que muda

**Uma página só, com os dois coaches.** A lateral lista as conversas de treino e
as de nutrição juntas, cada uma marcada por ícone, e abrir uma decide qual coach
aparece à direita. "Nova conversa" pergunta de qual: treino ou nutrição.

Isso resolve um problema que só apareceu ao abrir o código: **o coach de nutrição
não tem aba.** `NutritionCoachPage` existe, a rota
`/dashboard/students/[id]/nutrition-coach` responde, e nada no `StudentDetailShell`
leva até lá — só quem digitar a URL chega. Duas telas separadas seriam duas abas,
e uma delas já provou que some. Uma lateral com os dois fluxos é a correção e o
pedido ao mesmo tempo.

A rota antiga passa a redirecionar para `ai-coach`, para não quebrar link salvo.

O `ConversationPicker` suspenso **sai** — dois caminhos para a mesma coisa
divergem, e um deles fica sem manutenção.

### O que o backend precisa ganhar

Pouco, e é o que confirma que o desenho está certo:

- `listSessions` devolve o `module` e aceita listar os dois de uma vez — hoje ela
  filtra por um só, então uma lista unificada seria duas chamadas e uma ordenação
  no cliente.
- `GET /api/ai/nutrition/chat/[studentId]` passa a aceitar `?sessionId=`, como o
  de treino já aceita. Sem isso, clicar numa conversa de nutrição abriria sempre
  a mais recente — o bug original, sobrevivendo num canto.

---

## Parte 2 — O título

Há três caminhos, e a escolha muda custo, latência e qualidade.

| | Como | Custo | Resultado |
|---|---|---|---|
| **A. Truncar a primeira mensagem** | `substring(0, 40)` | zero | "Preciso montar um treino pra ele que…" — ruim |
| **B. Pedir ao modelo** | uma chamada depois da primeira troca | ~US$ 0,001 | "Hipertrofia — bloco de 12 semanas" |
| **C. Provisório e depois definitivo** | A no envio, B em segundo plano | igual ao B | título imediato que melhora sozinho |

**Este PRD adota o C.**

O A sozinho não resolve: um título ruim identifica tão mal quanto uma data. O B
sozinho deixa a conversa sem nome enquanto o modelo responde — e é justamente o
momento em que a pessoa olha a lista.

**Modelo: `claude-haiku-4-5-20251001`.** Não é preferência — o
`SYSTEM_MAPPING.md` já fixou isso na tabela "Modelo por função (não negociar)",
para sub-agentes que geram saída estruturada, com a nota *"10x mais barato, nunca
usar Sonnet aqui"*. Gerar um título é o caso mais claro dessa linha.

**Quando roda.** Depois do stream terminar, não durante. Somar uma chamada à
resposta que a pessoa está esperando trocaria um problema de organização por um
de latência.

**Quando falha.** Mantém o provisório. Título é conveniência; não pode derrubar a
conversa nem bloquear o envio.

**Onde grava.** O `PATCH` de sessões, que hoje só arquiva, passa a aceitar
`title`. O `sessionOwnedBy` que já protege o arquivamento protege os dois — é a
mesma verificação de dono, na mesma rota.

---

## Parte 3 — O bug do treino sem exercícios

### O que acontece

O aluno abre um treino prescrito pelo especialista. O cabeçalho carrega — título,
descrição, grupo muscular. A lista de exercícios vem vazia.

### Por que acontece

`workouts` ganhou `student_id` na migration `0012`, para o caso do **member que
cria treino para si mesmo**. Num treino prescrito pelo especialista dentro de uma
fase, esse campo é **NULL** — o vínculo com o aluno passa por
`training_plan → training_periodization.student_id`.

A `0018` escreveu duas políticas, e só uma sabe disso:

```sql
-- workouts: conhece os dois caminhos ✅
CREATE POLICY "workouts_student_read" ON workouts FOR SELECT USING (
  student_id = (SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM training_plans tpl
             JOIN training_periodizations tp ON tp.id = tpl.periodization_id
             WHERE tpl.id = workouts.training_plan_id
               AND tp.student_id = (SELECT auth.uid())));

-- workout_exercises: só conhece o caminho do member ❌
CREATE POLICY "workout_exercises_student_read" ON workout_exercises FOR SELECT USING (
  EXISTS (SELECT 1 FROM workouts w
          WHERE w.id = workout_exercises.workout_id
            AND w.student_id = (SELECT auth.uid())));
```

O aluno passa pela primeira e é barrado pela segunda. Daí a forma exata do
sintoma: **o treino abre, os exercícios não vêm.**

### Prova

Executada no Postgres local — periodização → fase → treino prescrito → um
exercício, lido com o JWT do aluno:

```
 workouts.student_id do treino prescrito | NULL
 workouts visiveis p/ aluno              | 1
 workout_exercises visiveis p/ aluno     | 0
```

### A correção

Uma migration nova alinhando `workout_exercises_student_read` com a política de
`workouts` — os mesmos dois caminhos, o do member e o da periodização.

**Não serve trocar por um `EXISTS` sobre `workouts` apoiado na política de
`workouts`.** RLS não se compõe assim: a subconsulta dentro de uma policy roda
sem aplicar a policy da tabela consultada. Herdar a regra significaria
reescrevê-la — e é o que se faz, explicitamente, aceitando a duplicação.

### Por que nenhuma guarda pegou

- **`check-column-refs.js` não pega.** As colunas estão certas; RLS não é coluna.
- **O tipo não pega.** A consulta é válida.
- **O erro não aparece.** RLS não devolve erro: devolve zero linhas. Não há
  `error` para tratar — nem `execute-workout.tsx`, que descarta o `error`, nem
  `workout-detail.tsx`, que o trata, mostrariam algo diferente.
- **`test-rls-isolation.mjs` não pega.** Ele prova que quem não deve ver, não vê.
  Este caso é o contrário: quem **deve** ver, não vê. É o teste que falta — e a
  lição é geral, porque uma política pode falhar nas duas direções.

### Dívida vizinha, fora do escopo

A prova esbarrou em outra divergência: `training_periodizations.start_date` e
`training_plans.start_date` são **NOT NULL no banco** e nuláveis no schema
Drizzle, e as duas tabelas têm colunas no banco que o schema não declara.
Registrar como dívida no `STATUS.md`; corrigir aqui misturaria assunto de novo.

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. A conversa em si já foi analisada em
> `ai-chat-conversations`; aqui vale o que este PRD acrescenta.

**Bloco A — Necessidade** ✅ O título é derivado do que já está guardado; não há
coleta nova. A correção do mobile não coleta nada — libera leitura.

**Bloco B — Base legal** ✅ Sem mudança. Prescrição de treino é execução de
contrato (Art. 7°, V); o aluno lendo o próprio treino é o titular acessando o
próprio dado (Art. 18, II).

**Bloco C — Segurança** ⚠️ Duas frentes.

*Renomear* passa a aceitar texto do cliente numa rota que usa `service_role`. O
`sessionOwnedBy` cobre o dono; falta limitar tamanho e não confiar no conteúdo na
renderização.

*A política de `workout_exercises`* está sendo ampliada. Ampliar leitura em RLS é
a operação que mais merece teste negativo: o critério de pronto exige provar que
o aluno de outra periodização continua vendo zero.

**Bloco D — Direitos** ✅ A correção **restaura** o Art. 18, II — hoje o titular
não consegue ver o próprio treino.

**Bloco E — Prevenção e transparência** ⚠️ **O título é dado de saúde exposto de
forma persistente.** "Hérnia de disco L5" numa barra lateral fica visível o tempo
todo, inclusive para quem passa atrás do especialista — diferente do corpo da
conversa, que exige abrir e rolar.

O prompt do gerador precisa pedir **o tema do trabalho, não a condição do
aluno**: "Bloco de força — 8 semanas", não "Reabilitação de lesão no ombro". E
nunca o nome do aluno: a lateral já está dentro do contexto dele, e repetir o
nome só espalha identificação por mais uma superfície.

---

## Escopo

### Incluído

**Fase 1 — a lateral, com os dois coaches**
- `ConversationSidebar` com lista unificada, ícone por módulo, destaque da ativa
  e "nova conversa" (treino ou nutrição) no topo
- `AiCoachWorkspace`: duas colunas, e o coach da direita segue o módulo da
  conversa aberta
- `listSessions` devolve `module` e aceita listar os dois
- `GET` de nutrição aceita `?sessionId=`
- `nutrition-coach` redireciona para `ai-coach`
- Recolhe em tela estreita
- `ConversationPicker` removido

**Fase 2 — o título**
- Provisório no envio da primeira mensagem
- Definitivo com `claude-haiku-4-5-20251001` depois do stream
- `PATCH` de sessões aceita `title`, com limite de tamanho
- Renomear à mão, e o automático não sobrescreve o manual

**Fase 3 — o bug do mobile**
- Migration alinhando `workout_exercises_student_read`
- Teste em `test-rls-isolation.mjs` nas duas direções
- A tela do aluno separa "sem exercícios" de "não carregou"

### Fora do escopo

- **Busca na lista.** Depois, se passar de umas vinte conversas.
- **Agrupar por data** ("Hoje", "Últimos 7 dias"). Enfeite enquanto a lista for
  curta.
- **Arrastar para reordenar.** A ordem é por atividade recente e isso basta.
- **Renomear automático depois do primeiro título.** Conversa que muda de assunto
  no meio deveria ter virado outra conversa.
- **A divergência de schema em `training_plans` / `training_periodizations`.**
  Dívida registrada, corrigida em outro lugar.

---

## Riscos

**A lateral rouba largura do chat.** A conversa já divide espaço com cartões de
proposta, que são largos. Se a lateral apertar demais, o cartão de treino fica
ilegível — e é nele que o especialista aprova. Recolher precisa ser fácil.

**O título vira ruído se for genérico.** Se o Haiku devolver "Planejamento de
treino" para todas, a lista volta a não identificar nada. O prompt precisa de
exemplo, e vale conferir com conversas reais antes de dar por pronto.

**A correção de RLS não chega em produção.** As migrations `0016`–`0032` ainda
não foram aplicadas lá — é a dívida 25 do `STATUS.md`. Este bug só some para o
aluno quando aquele deploy acontecer, e uma migration a mais aumenta o que está
represado.

---

## Referências

- `docs/PRDs/ai-chat-conversations.md` — as fases que prepararam a parte 1
- `docs/SYSTEM_MAPPING.md` — "Modelo por função (não negociar)"
- `web/src/modules/ai/components/AiCoachChat.tsx`
- `web/src/modules/ai/components/ConversationPicker.tsx` — sai na Fase 1
- `web/src/app/api/ai/chat/[studentId]/sessions/route.ts`
- `supabase/migrations/0012_member_owned_workouts.sql` — de onde vem o `student_id`
- `supabase/migrations/0018_rls_prescription_and_catalog.sql` — a política incompleta
- `scripts/test-rls-isolation.mjs`
