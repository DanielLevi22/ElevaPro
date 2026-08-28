# PRD: student-activity-feed

**Data de criação:** 2026-08-28
**Status:** done
**Aprovado em:** 2026-08-28
**Branch:** feature/student-activity-feed
**Autor:** Daniel Levi

> **Três correções à leitura original, achadas ao ler o código antes de escrever
> o primeiro commit.** Elas mudam o trabalho e estão registradas aqui porque o
> PRD é o que se lê depois, não a conversa.
>
> 1. **`meal_logs.notes` é coluna morta.** Nenhum caminho escreve nela —
>    `toggleMealLog` grava `completed`, `updateMealLogItems` grava
>    `actual_items`, e não existe tela onde o aluno escreva sobre a refeição. O
>    bloqueador que mandava reclassificá-la como Art. 11 não tem dado a proteger,
>    e o lembrete "seu personal vê isto" não tem onde morar. Ela **sai junto com
>    `photo_url`**, pelo mesmo raciocínio do D5. Sobra um único campo de texto
>    livre a reclassificar: `workout_sessions.notes`.
> 2. **O reconsentimento não funcionava como descrito.** `hasCollectionConsent` e
>    `useHealthDataConsent` nunca leram `policy_version` — subir a constante para
>    1.1 não pediria reconsentimento de ninguém. E o único registro de
>    consentimento no mobile era efeito colateral de conectar o HealthKit no
>    onboarding: quem pulou nunca consentiu. A fase 0 passa a construir o gate
>    versionado de verdade, com componente próprio no mobile.
> 3. **A linha sintética de cardio é apagada, não consertada.**
>    `createWorkoutSession` já aceita `workout_id` nulo e a FK é
>    `ON DELETE SET NULL`. Com `session_type` na sessão, a linha sintética não
>    tem mais função — corrigir o dono manteria, por aluno, uma linha que existe
>    só para satisfazer um join. Resolve D1 e D3 de uma vez.

> Substitui o rascunho `session-feedback-visibility`, que tratava só do feedback
> de fim de treino. O problema real é maior: o especialista não tem uma tela que
> responda "o aluno está fazendo o combinado?".

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?

Transformar a aba **Histórico** do aluno em **Atividades**: um acompanhamento
agrupado por dia, mostrando o que o aluno fez — treino, cardio, refeições
registradas, feedback de esforço — com filtro por autoria para separar o que o
aluno fez do que o especialista fez.

E mover o bloco **Atividades Recentes**, hoje no Dashboard, para o **Briefing** —
onde ele responde a pergunta que a tela faz —, reescrito para mostrar de verdade
os 10 últimos registros de todos os alunos.

### Por quê?

Duas coisas, e a segunda é a que dói.

**O app pede feedback e joga fora.** `WorkoutFeedbackModal` coleta RPE (1 a 10) e
observações em texto livre no fim de toda sessão, `saveWorkoutSession` grava em
`workout_sessions.intensity` e `workout_sessions.notes`, e **nenhuma query do web
lê essas duas colunas**. O aluno escreve "senti dor no ombro, diminuí a carga no
supino" e o personal nunca vê. Pedir feedback e não usar ensina o aluno a não
responder: em duas ou três sessões ele passa a apertar "Salvar" com o RPE no 5 do
meio, e aí o dado que existe também deixa de valer.

**Não existe a tela do acompanhamento.** O personal tem Métricas (agregado),
Avaliações (pontual), Nutrição (o plano) — e nada que responda "o que esse aluno
fez esta semana?". O Histórico chega perto, mas lista três tipos de evento soltos
e mistura ação do aluno com ação do especialista.

### Como saberemos que está pronto?

- [x] A aba se chama **Atividades** e mostra os dias em ordem decrescente, com
      uma linha de resumo por dia ("Treino ✓ · Refeições 3/4")
- [x] Um dia expandido mostra o treino executado com RPE rotulado ("8 — Difícil")
      e as observações do aluno quando houver
- [x] Uma sessão de cardio aparece rotulada como cardio, com duração e calorias,
      e nunca como "treino"
- [x] O filtro de autoria tem três estados (Todos / Aluno / Especialista), começa
      em **Aluno**, e o estado escolhido sobrevive à navegação dentro da aba —
      vive na query string, então sobrevive também ao recarregar e ao link enviado
- [x] Um evento sem feedback não mostra campo vazio nem "—": some
- [x] O texto que o aluno escreveu nunca aparece misturado com texto gerado pelo
      app — são campos distintos no banco
- [x] `scripts/verify-rls.sql` prova que um especialista não vinculado não lê
      `intensity` nem `notes` de sessão de aluno alheio. **`notes` de refeição saiu
      do critério**: a coluna foi apagada na `0035` por nunca ter tido caminho de
      escrita
- [x] A seção 2.2 de `docs/LGPD_COMPLIANCE.md` classifica `workout_sessions.notes`
      como dado sensível, com base do Art. 11. **`meal_logs.notes` não foi
      reclassificada — foi apagada**, pela correção 1 acima
- [x] Um aluno que consentiu na política `1.0` vê o pedido de reconsentimento uma
      vez, e `student_consents.policy_version` fica em `1.1` depois de aceitar
- [x] `WorkoutFeedbackModal` diz, na própria tela, que o personal lê o que for
      escrito. **O registro de refeição não ganhou lembrete**: não há campo de
      texto nessa tela para o lembrete acompanhar
- [x] **Atividades Recentes saiu do Dashboard e está no Briefing**, e o Dashboard
      não tem mais nenhum bloco de atividade
- [x] O bloco mostra **os 10 eventos mais recentes de fato** — não 5 de treino
      mais 3 de aluno mais 3 de dieta — e sem janela de 7 dias
- [x] Uma sessão de cardio aparece nesse bloco (era impossível — ver D6)
- [x] Cada item leva para a aba Atividades do aluno correspondente
- [x] O HTML da página do Briefing não contém linha crua de `workout_sessions` —
      o item atravessa a fronteira já resumido, com teste que afirma isso

---

## Contexto

Levantado em 2026-08-28 ao investigar por que o feedback de fim de treino não
aparece para o professor.

### O que o web lê hoje de `workout_sessions`

| Onde | Colunas lidas |
|---|---|
| `web/src/app/api/students/[id]/history/route.ts` | `id, started_at, completed_at, workout(title)` |
| `web/src/shared/hooks/useWorkoutMetrics.ts` | `id, completed_at` |
| `useAnalytics`, `useDashboardStats`, `useRecentActivity` | contagem e datas |
| `web/src/app/admin/page.tsx` | contagem |

A única ocorrência da palavra `intensity` no web inteiro é iluminação do three.js
no mapa muscular.

### D1 — Cardio e musculação são indistinguíveis 🔴

Não existe tabela de cardio. `saveCardioSession` grava em `workout_sessions`,
apontando para uma linha sintética de `workouts` criada na hora:

```ts
let { data: cardioWorkout } = await supabase
  .from('workouts')
  .select('id')
  .eq('title', 'Treino Cardio Livre')
  .eq('specialist_id', sessionData.studentId)   // ← ver D3
  .single();
```

O único jeito de saber que uma sessão é cardio é comparar o título do treino com
a string `'Treino Cardio Livre'`. Basta alguém renomear ou traduzir para o feed
voltar a chamar corrida de musculação.

### D2 — O cardio sobrescreve as observações do aluno 🔴

```ts
notes:
  sessionData.notes ||
  `${sessionData.exerciseName} - ${Math.floor(sessionData.durationSeconds / 60)}min - ${Math.round(sessionData.calories)}kcal`,
```

Duração e calorias de uma sessão de cardio **só existem dentro dessa string**. Não
há coluna para nenhum dos dois. Consequências:

- `notes` é ora o que o aluno escreveu, ora o que o app gerou, sem marcador que
  separe os dois casos;
- se o aluno escreve qualquer coisa, duração e calorias somem para sempre;
- exibir `notes` como "observações do aluno" hoje seria mentira em parte das
  linhas.

### D3 — O treino sintético de cardio nasce com dono errado 🟡

`specialist_id: sessionData.studentId` põe o id do **aluno** na coluna do
especialista. `workouts.specialist_id` é o dono da prescrição e é o que a RLS da
migration `0018` usa. O efeito é uma linha de `workouts` órfã por aluno, que
aparece como se fosse biblioteca pessoal dele.

### D4 — "Intensidade" quer dizer duas coisas na tela de cardio 🟡

`CardioSessionScreen` tem um estado `intensity: 'Baixa' | 'Moderada' | 'Alta'`
derivado do acelerômetro, falado em voz alta durante a sessão e **nunca gravado**.
No fim, o `WorkoutFeedbackModal` pede outro `intensity`, de 1 a 10, que é o que
vai para o banco. Dois conceitos, um nome.

### D5 — `meal_logs.photo_url` existe e não deveria 🟡

A coluna está no schema e é carregada por `nutrition.service.ts`,
`web/src/shared/hooks/useNutrition.ts`, `nutritionStore.ts` e pelos tipos de
`packages/core` — e **não há bucket de foto de refeição** em migration nenhuma. O
único bucket criado é `assessments`, na `0021`, e ele é da avaliação física.

**Decisão: não armazenamos foto de refeição.** A coluna sai.

É a mesma decisão que a `0026` já tomou para `body_scans`, e o comentário dela
vale palavra por palavra aqui:

> Coluna que nunca deve ser preenchida não é neutra, é convite: enquanto ela
> existir, alguém escreve nela sem saber que há uma decisão contrária, e aí
> passamos a ter foto persistida sem bucket com política própria.

Foto de prato é dado pessoal com rosto, casa e companhia no enquadramento, para
uma informação que o registro de refeição já dá em texto. Guardar exigiria bucket
com política, URL assinada, retenção e eliminação — custo de conformidade sem
contrapartida.

**Nota de escopo:** isto vale para foto de refeição. A foto da avaliação física
continua como está — tem bucket com política desde a `0021` e parecer próprio no
PRD `body-scan-integrity`.

### D6 — "Atividades Recentes" está na tela errada e não mostra o que promete 🔴

O bloco vive em `/dashboard`, alimentado por `useRecentActivity`. Cinco problemas,
e o terceiro é o que impede simplesmente mudar de lugar.

**1. Está na tela que não faz a pergunta.** O Dashboard é painel de números —
total de alunos, treinos criados, dietas ativas. O Briefing é a tela que pergunta
"o que aconteceu e quem precisa de mim hoje". Atividade recente é resposta de
briefing, não de painel. Hoje o Briefing só mostra o que está **ruim** (sinais de
atenção); falta o contrapeso do que está acontecendo.

**2. Consulta o Supabase direto do cliente.** `useRecentActivity` é um hook
`"use client"` que faz `supabase.from("workout_sessions")` — contra as duas
regras de `CLAUDE.md` ("toda query passa pelo service do módulo" e "TanStack Query
só para mutations, polling ou estado otimista"). E contradiz o comentário que já
está em `briefing/page.tsx`:

> Server Component de propósito: o que atravessa a fronteira é o sinal já
> derivado ("não treina há 5 dias"), não a lista de sessões. Se o cliente
> recebesse as linhas para calcular a inatividade, o dado de saúde cru ficaria no
> HTML da página.

Mover o bloco como está levaria sessões de treino cruas para o HTML da própria
tela que existe para evitar isso.

**3. Cardio nunca aparece — e não é acidente.** O filtro é
`.eq("workouts.specialist_id", user.id)`: pega quem é dono do **treino**, não quem
é vinculado ao **aluno**. Como o D3 grava `specialist_id` = id do aluno na linha
sintética de cardio, **nenhuma sessão de cardio pode aparecer nesse bloco**, de
nenhum aluno, nunca. O mesmo vale para treino que o member criou para si.

**4. "Últimos 10" não é o que acontece.** São três consultas com teto próprio —
5 treinos, 3 alunos novos, 3 dietas — somadas e cortadas em 10. Se o especialista
teve 20 treinos concluídos hoje, ele vê 5. O corte tem de ser no resultado
ordenado, não por fonte.

**5. A janela de 7 dias esvazia a tela em silêncio.** Especialista voltando de
férias vê "Nenhuma atividade recente" com o histórico cheio. Para "os 10 últimos",
a janela não deveria existir — ordena por data e pega 10.

Além disso, as três consultas são `await` em sequência, não `Promise.all()`.

---

## Escopo

### Incluído

1. **Renomear Histórico → Atividades**, mantendo a rota, e reescrever o conteúdo
   como feed agrupado por dia.
2. **Separar o tipo da sessão no banco** — coluna `session_type` em
   `workout_sessions` (`strength` | `cardio`), com backfill a partir do título
   sintético existente.
3. **Tirar duração e calorias de dentro de `notes`** — colunas próprias, e `notes`
   passa a guardar só o que o aluno escreveu.
4. **Corrigir o dono do treino sintético de cardio** (D3), com migration de
   correção das linhas já criadas.
5. **Feed por dia** com a linha de resumo vinda de `daily_goals` e os eventos
   expandidos abaixo.
6. **Filtro de autoria** (Todos / Aluno / Especialista), default em Aluno.
7. **Mover Atividades Recentes do Dashboard para o Briefing**, reescrito como
   Server Component, com os 10 eventos mais recentes de verdade e sem janela de
   7 dias.
8. **Trocar o filtro por dono do treino pelo vínculo com o aluno** (D6.3), o que
   faz cardio aparecer.
9. **Remover `meal_logs.photo_url`** (D5) — migration de drop e limpeza dos
   quatro pontos que carregam a coluna.
10. **Teste de RLS** provando o isolamento entre especialistas para as colunas
    novas, `workout_sessions.notes` e `meal_logs.notes`.
11. **Atualizar `docs/LGPD_COMPLIANCE.md`** com a reclassificação dos dois `notes`
    e a saída de `photo_url`.

### Fora do escopo (explicitamente)

- **Passos e calorias do `health_daily_metrics` no feed.** É dado contínuo, não
  evento — poluiria o dia com uma linha que nunca é notícia. Pertence a Métricas.
- **Gráfico de RPE ao longo do tempo.** É onde o dado vira decisão de prescrição —
  um RPE isolado é ruído, a curva é que diz se a carga está alta demais há três
  semanas. Depende de a coleta estar confiável primeiro. PRD próprio.
- **Sinal no briefing** ("3 sessões seguidas com RPE ≥ 9"). Mesma razão: o
  briefing consome tendência, não evento.
- **Notificar o especialista quando o aluno relata dor.** É tentador e é uma
  feature de saúde com responsabilidade própria — precisa de decisão de produto
  sobre o que o app promete quando alguém escreve "senti dor no peito".
- **Foto de refeição.** Decidido em D5: não armazenamos. A coluna sai; não há
  feature a construir.
- **Editar, comentar ou responder atividade.** Leitura apenas nesta entrega.
- **Unificar o `intensity` do acelerômetro com o RPE (D4).** Renomear é trivial;
  decidir o que fazer com a leitura do acelerômetro não é.
- **Retroagir o dado perdido.** As sessões de cardio antigas que tiveram as
  observações sobrescritas não têm como ser recuperadas.

---

## A tela

Rota mantida: `/dashboard/students/[id]/activities` — a aba `history` passa a
redirecionar para ela, para não quebrar link salvo.

### Por que uma aba e não duas

O Histórico já é uma timeline de atividades. Uma aba "Atividades" ao lado dele
mostraria quase a mesma coisa, e o especialista teria de adivinhar em qual
procurar — com a aba do aluno já em nove itens. O conteúdo cresce, o nome passa a
descrever o que a tela faz, e o lugar continua sendo um só.

### Por que agrupado por dia

Lista plana de eventos vira ruído em uma semana: quatro refeições por dia dão 28
cartões de comida, e o treino se perde no meio. O dia é a unidade que o personal
usa quando pensa no aluno — "essa semana ele treinou três vezes e comeu direito
em duas". E a linha do dia **já existe pronta no banco**: `daily_goals` guarda
`meals_target`/`meals_completed`, `workout_target`/`workout_completed` e
`completed`, por aluno e por data.

```
┌───────────────────────────────────────────────────────────────┐
│ [ Todos ]  [ Aluno ]  [ Especialista ]              ← filtro   │
└───────────────────────────────────────────────────────────────┘

28/08 · quinta                                    ✓ dia completo
  ⚡ Treino A — Push (Empurrar)          RPE 8 — Difícil
     "Senti dor no ombro, diminuí a carga no supino"
  🏃 Corrida · 32 min · 280 kcal          RPE 6 — Moderado
  🍽 Refeições 4/4

27/08 · quarta                          Treino ✓ · Refeições 2/4
  ⚡ Treino B — Pull (Puxar)              RPE 6 — Moderado
  🍽 Almoço, Jantar

26/08 · terça                                       sem registro
```

Um dia sem nada aparece como "sem registro" em vez de sumir: para o especialista,
**a ausência é a informação** — três dias vazios seguidos é o que ele precisa ver.

### O RPE vai com rótulo, não só número

`WorkoutFeedbackModal` já mostra ao aluno "Muito Fácil / Fácil / Moderado /
Difícil / Muito Difícil". O especialista tem de ler a mesma escala, senão os dois
lados falam de "7" com significados diferentes. A função de rótulo sai do modal do
mobile para `shared/`, para não existirem duas tabelas de tradução.

### O bloco no Briefing

O Briefing hoje é: resumo → **Precisa da sua atenção** → faixa de estatísticas.
Ele só mostra o que está ruim. "Aconteceu" entra como contrapeso, entre os sinais
e as estatísticas — o especialista lê primeiro quem precisa dele, depois o que os
outros fizeram.

```
Precisa da sua atenção                                        2
  ┌──────────────────┐ ┌──────────────────┐
  │ Marina Costa     │ │ João Alves       │
  │ 6 dias sem treino│ │ convite parado   │
  └──────────────────┘ └──────────────────┘

Aconteceu                                          ver tudo →
  ⚡  Marina Costa      Treino B — Pull          RPE 8    há 2 h
  🏃  Rafael Lima      Corrida · 32 min                   há 4 h
  🍽  Ana Souza        Registrou o almoço                 há 5 h
  ⚡  Pedro Dias       Treino A — Push          RPE 5     ontem
  ...                                                (10 no total)

Alunos ativos 12 · Treinos 48 · Dietas 7
```

O que muda além do lugar:

- **Nome do aluno em primeiro**, não o tipo de evento. Numa lista de 10 alunos
  diferentes, é por ele que se procura.
- **O RPE aparece aqui também.** É o sinal mais barato de ler: "Marina, RPE 8" três
  vezes na semana é conversa para hoje.
- **Cada linha leva para a aba Atividades daquele aluno** — o bloco é a porta de
  entrada do resto deste PRD.
- **Cardio ganha ícone próprio**, pela `session_type` da fase 1.
- **Vazio deixa de ser sinônimo de erro.** "Nenhuma atividade" só aparece quando o
  especialista não tem aluno com registro nenhum — não quando ele passou uma semana
  fora.

### O filtro de autoria sai da RLS, não de uma lista escrita à mão

Quem pode escrever cada tabela já está decidido nas políticas de RLS. O feed
deriva a autoria daí:

| Evento | Tabela | Autor | De onde vem a regra |
|---|---|---|---|
| Treino executado | `workout_sessions` | Aluno | `sessions_own` (FOR ALL do aluno) |
| Cardio | `workout_sessions` | Aluno | idem |
| Refeição registrada | `meal_logs` | Aluno | `student_own_meal_logs` (FOR ALL) |
| Análise corporal | `body_scans` | Aluno | `body_scans_own` (FOR ALL) |
| Anamnese respondida | `student_anamnesis` | Aluno | `completed_at` preenchido pelo aluno |
| Avaliação física | `physical_assessments` | **Especialista** | `assessments_specialist_insert` — só o especialista insere |
| Plano alimentar | `diet_plans` | **Depende da linha** | `specialist_id IS NULL` → o próprio member criou; preenchido → o especialista criou |

`diet_plans` é o caso que uma lista escrita à mão erraria: o mesmo tipo de evento
tem autores diferentes conforme a coluna. A regra é `specialist_id`, não o tipo.

---

## Fluxo de dados

```
[Aluno registra atividade no mobile]
  → treino:    WorkoutFeedbackModal → saveWorkoutSession  → workout_sessions
  → cardio:    WorkoutFeedbackModal → saveCardioSession   → workout_sessions
  → refeição:  nutritionStore                             → meal_logs
  → (trigger de gamificação agrega o dia)                 → daily_goals

[Especialista abre Atividades no web]
  → StudentActivitiesPage
  → useStudentActivities(studentId, autoria)
  → GET /api/students/[id]/activities   (authorizeLinkedSpecialist + supabaseAdmin)
  → Promise.all: workout_sessions · meal_logs · daily_goals ·
                 physical_assessments · diet_plans · body_scans · student_anamnesis
  ← ActivityDay[] { data, resumo, eventos[] }
```

Os sete SELECTs são independentes — `Promise.all()`, conforme `CLAUDE.md`. O
agrupamento por dia acontece no servidor: mandar sete listas cruas para o cliente
montar o calendário é trabalho de renderização que não precisa existir.

```
[Especialista abre o Briefing]
  → briefing/page.tsx (Server Component)
  → Promise.all(fetchBriefing, fetchRecentActivity)
  → recentActivity.service (shared/) — vínculo ativo, ordena, corta em 10
  ← RecentActivityItem[] { alunoId, alunoNome, tipo, titulo, rpe?, quando }
  → BriefingPage → <RecentActivity />
```

O item que chega ao cliente é o já resumido — nome, tipo, título, RPE e horário.
Nem `notes`, nem linha de sessão, nem id de treino.

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| `workout_sessions` | ALTER (3 colunas), SELECT | `session_type`, `duration_seconds`, `active_calories`. Tabela sensível |
| `workouts` | UPDATE | Corrigir `specialist_id` das linhas sintéticas de cardio (D3) |
| `meal_logs` | ALTER (drop), SELECT | Sai `photo_url` (D5). Lê `completed`, `logged_date`, `notes`. Tabela sensível |
| `student_specialists` | SELECT | Vínculo ativo — passa a ser o filtro do bloco recente (D6.3) |
| `daily_goals` | SELECT | Linha de resumo do dia — já computada |
| `physical_assessments`, `body_scans`, `student_anamnesis`, `diet_plans` | SELECT | Eventos já exibidos ou novos no feed |

## Impacto em outros módulos

- **`app/src/modules/workout`** — `saveCardioSession` para de escrever a string
  gerada em `notes`; `saveWorkoutSession` passa a marcar `session_type`.
- **`shared/`** — a escala de RPE vira função compartilhada.
- **`web/src/modules/students`** — `HistoryEvent` vira `ActivityDay` + `ActivityEvent`;
  hook, rota da API e página novos; a rota `history` redireciona.
- **`web/src/modules/dashboard`** — `ActivityFeed` sai do Dashboard. O componente
  não é reaproveitado: a versão do Briefing tem outra forma (nome primeiro, RPE,
  link para o aluno) e o antigo some junto com `useRecentActivity`.
- **`web/src/modules/briefing`** — componente `RecentActivity` novo; `BriefingPage`
  ganha a seção.
- **`web/src/shared/hooks/useRecentActivity.ts`** — **deletado**. A consulta vira
  serviço em `shared/`, chamado do Server Component.
- **Gamificação** — leitura de `daily_goals` apenas. Nenhuma escrita nova.

---

## Decisões técnicas

### Por que uma coluna `session_type` e não uma tabela `cardio_sessions`

Tabela separada duplicaria `student_id`, `started_at`, `completed_at`, `intensity`
e `notes`, e obrigaria toda consulta de feed e de métricas a fazer `UNION`. As duas
são a mesma coisa do ponto de vista do produto — uma sessão que o aluno executou e
avaliou. O que muda é o detalhe: cardio tem duração e calorias, musculação tem
séries em `workout_session_exercises`. Coluna discriminadora resolve, e o backfill
é determinístico a partir do título sintético que já existe.

### Por que `notes` deixa de receber texto gerado

Enquanto o app escrever ali, `notes` não é "o que o aluno disse" — é "o que o aluno
disse, ou um resumo, e não dá para saber qual". Isso quebra a exibição (D2) e, mais
sério, quebra a base legal: texto do titular e texto do sistema têm tratamento
diferente no direito de acesso e na eliminação.

### Por que o resumo do dia vem de `daily_goals` e não de `COUNT`

`daily_goals` guarda a **meta** junto com o realizado. "3 refeições" sem a meta não
diz nada; "3/4" diz. Recalcular a meta no feed duplicaria a regra que a gamificação
já aplica, e as duas divergiriam no primeiro ajuste.

### Por que o bloco recente vira Server Component e não hook

O `briefing/page.tsx` já registra a razão em comentário: o que atravessa a
fronteira é o sinal derivado, não a lista de sessões. Levar `useRecentActivity`
como está colocaria linhas de `workout_sessions` no HTML da tela que existe para
não fazer isso. O serviço vive em `shared/` porque a regra de vínculo — quem é
aluno de quem — já mora lá, no `briefing.service.ts`.

### Por que o filtro passa a ser o vínculo, não o dono do treino

`.eq("workouts.specialist_id", user.id)` responde "treinos que eu criei". A
pergunta certa é "alunos que são meus". São diferentes sempre que o aluno executa
algo que o especialista não prescreveu — cardio livre, treino que o member montou
para si. O vínculo é `student_specialists` com status ativo, o mesmo que a RLS usa
em `private.is_linked_specialist`. Trocar o filtro conserta o D6.3 sem depender da
correção do D3.

### Por que o filtro começa em "Aluno"

A pergunta que traz o especialista a esta tela é "o aluno está fazendo o
combinado?". O que ele mesmo fez, ele já sabe. "Todos" existe para auditoria — não
é o caso de uso diário.

---

## Parecer LGPD — `/lgpd-check` de 2026-08-28

### Bloco A — Necessidade e Finalidade (Art. 6°, I e III) ✅

RPE, observações e registro de refeição já são coletados e têm finalidade direta:
ajustar prescrição e dieta. Esta entrega **não coleta nada novo do titular** —
passa a usar o que já é coletado, o que corrige uma violação de finalidade pelo
avesso (coletar sem usar). `session_type`, `duration_seconds` e `active_calories`
são derivados da própria execução, não pedidos ao aluno.

E a entrega **reduz** a superfície: `meal_logs.photo_url` sai (D5). Minimização no
sentido do Art. 6°, III — some a possibilidade de alguém começar a gravar foto de
refeição sem bucket, sem política e sem base legal, que é o cenário que a `0026`
descreve para `body_scans`.

Mover Atividades Recentes para Server Component (D6.2) também reduz exposição:
hoje linhas de `workout_sessions` de vários alunos chegam ao navegador do
especialista para serem filtradas ali; depois, só o item já resumido atravessa.

### Bloco B — Base Legal (Art. 7° ou Art. 11) ⚠️

A seção 2.2 do `LGPD_COMPLIANCE.md` classifica hoje:

> | Dados de treino executado | `workout_sessions` | Execução de contrato | Acompanhamento de desempenho |

**Isso está subclassificado para os campos de texto livre.** Séries, cargas e datas
são execução de contrato. Texto onde o aluno escreve *"senti dor no ombro"*, *"tive
tontura"*, *"voltei da cirurgia do joelho"* é **dado de saúde** e exige Art. 11 — é
exatamente o caso já reconhecido para `ai_chat_messages`, que a seção 2.2 chama de
"local secundário de dado sensível".

Vale para **dois** campos, não um: `workout_sessions.notes` e `meal_logs.notes`.

**Ação obrigatória:** reclassificar os dois como Tutela da saúde (Art. 11, II, f) +
Consentimento (Art. 11, I). `intensity` segue como execução de contrato — é escala
de esforço, não relato clínico.

### Bloco C — Segurança e Acesso (Art. 6°, VII) ✅

RLS já existe e é adequada nas duas tabelas:

```sql
-- 0017
CREATE POLICY "sessions_specialist_read" ON workout_sessions
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));
-- 0013
CREATE POLICY "specialist_read_linked_meal_logs" ON meal_logs
  FOR SELECT USING ( ... vínculo ativo ... );
```

Aluno vê o próprio; especialista vinculado e ativo lê; desvinculou, perde. As
colunas novas herdam a política — ela é por linha.

⚠️ **Mas a rota do web não passa pela RLS.** `/api/students/[id]/activities` usará
`supabaseAdmin` (service_role), como as demais rotas do BFF — ver PRD
[api-security-hardening](api-security-hardening.md). A barreira é
`authorizeLinkedSpecialist`, em código, e ela é **obrigatória na rota nova**. O
critério de aceitação exige que `verify-rls.sql` prove o isolamento no banco de
qualquer forma.

### Bloco D — Direitos dos Titulares (Art. 18) ⚠️

- Ver: o aluno vê as próprias atividades no app. ✅
- Corrigir: **não existe** caminho para o aluno editar uma observação já enviada,
  nem de treino nem de refeição. Vale para todo o histórico e não é regressão desta
  entrega — mas passa a incomodar mais quando o texto fica visível para terceiro.
  Registrar como dívida.
- Excluir: `ON DELETE CASCADE` a partir de `profiles` elimina sessões, logs e metas
  junto com a conta. ✅

### Bloco E — Prevenção e Transparência (Art. 6°, VI e VIII) ⚠️

- **Log:** `saveCardioSession` tem `console.error('Error saving cardio session:', error)`.
  O objeto de erro do PostgREST pode trazer o payload — inclusive `notes`. Trocar
  por log sem corpo antes de subir.
- **Transparência:** o aluno preenche o feedback sem que a tela diga que o personal
  vai ler. Isso muda o que ele escreve. Resolvido pelo consentimento versionado
  abaixo, mais uma linha em cada modal.

#### Como o consentimento é resolvido

A finalidade está clara e é a do produto: o feedback existe **para o
acompanhamento do profissional**. Isso é o que dá a base de tutela da saúde
(Art. 11, II, f) — a leitura pelo especialista não é um uso secundário, é o uso.
O que falta não é autorização nova, é o aluno **saber** disso quando escreve.

E a infraestrutura já existe. `student_consents` guarda
`consent_type = 'health_data_collection'` com `policy_version` e `revoked_at`, e
já é o portão documentado antes do primeiro `diet_plans` de member.

**Decisão: versão nova da política, não tipo novo de consentimento.**

- `policy_version` sobe de `1.0` para `1.1`, com a cláusula que hoje falta: o
  especialista vinculado lê o que o aluno escreve em feedback de treino e em
  observação de refeição.
- Quem consentiu em `1.0` reconsente uma vez, na primeira abertura após a
  atualização — o `upsert` com `onConflict: "student_id,consent_type"` de
  `useGrantHealthDataConsent` já suporta.
- Os dois modais ganham a linha de lembrete: *"Seu personal vê este feedback."*
  Consentimento é uma vez; o lembrete é toda vez, e é o que muda o comportamento
  na hora de escrever.

**Por que não um `consent_type` separado.** Um consentimento só para "seu
personal pode ler" seria um consentimento que o aluno não consegue recusar e
seguir usando o produto — e consentimento que não pode ser negado não é livre
(Art. 5°, XII). Separar criaria a aparência de escolha onde não há. A leitura
pelo especialista pertence à mesma finalidade da coleta, e é ali que deve estar
declarada.

**Efeito colateral bom:** a seção 10 do `LGPD_COMPLIANCE.md` já lista como
pendente "consentimento no app mobile antes de `toggleMealCompletion`" — a fase 0
deste PRD passa a cobrir isso.

### Bloqueadores (não implementar sem resolver)

- ❌ **Reclassificar `workout_sessions.notes` e `meal_logs.notes` na seção 2.2**
  com base do Art. 11 antes de expor os campos. Expor dado de saúde sob base legal
  de execução de contrato é infração grave (ANPD).
- ❌ **`policy_version` 1.1 com a cláusula de leitura pelo especialista, mais o
  lembrete no `WorkoutFeedbackModal` e no registro de refeição.** Sem isso o
  consentimento não é informado (Art. 9°). Caminho decidido acima — reusa
  `student_consents`, não cria mecanismo novo.
- ❌ **`authorizeLinkedSpecialist` na rota `/api/students/[id]/activities`** antes
  de qualquer SELECT — a rota agrega sete tabelas sensíveis com service_role.

### Atenção

- ⚠️ Remover `notes` do log de erro do cardio.
- ⚠️ Abrir dívida para o direito de correção (Art. 18, III).
- ⚠️ Confirmar que `meal_logs.photo_url` está vazia antes do drop, como a `0026`
  fez com `body_scans`. Se houver valor, é foto gravada em bucket não declarado —
  vira incidente, não migration.

### Atualizações necessárias em `docs/LGPD_COMPLIANCE.md`

- [ ] Seção 2.2: separar `workout_sessions.notes` da linha genérica de "dados de
      treino executado", com base Art. 11, II, f + Art. 11, I
- [ ] Seção 2.2: mesma classificação para `meal_logs.notes`
- [ ] Seção 2.2: registrar os dois como local secundário de dado sensível, no mesmo
      parágrafo de `ai_chat_messages`
- [ ] Seção 2.1: `session_type`, `duration_seconds`, `active_calories` como execução
      de contrato
- [ ] Seção 2.3 ("o que NÃO coletamos"): acrescentar foto de refeição, com a razão
- [ ] Seção 10: marcar os módulos Treino e Nutrição como revistos em 2026-08-28

---

## Fases

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | Bloqueadores do parecer LGPD: reclassificação na seção 2.2, `policy_version` 1.1 com reconsentimento, lembrete nos dois modais | — |
| 1 | Migration: `session_type`, `duration_seconds`, `active_calories`, backfill, correção do `specialist_id` (D3), drop de `photo_url` (D5) | 0 |
| 2 | Mobile: parar de escrever texto gerado em `notes`, gravar `session_type` e os números do cardio; tirar `photo_url` do store e dos tipos | 1 |
| 3 | Shared: escala de RPE como função compartilhada + `recentActivity.service` | — |
| 4 | Web: rota `/api/students/[id]/activities` com `authorizeLinkedSpecialist` e agrupamento por dia | 1 |
| 5 | Web: página Atividades, filtro de autoria, redirect de `history` | 3, 4 |
| 6 | Web: Atividades Recentes no Briefing; remover do Dashboard e deletar `useRecentActivity` | 1, 3, 5 |
| 7 | `verify-rls.sql` e testes | 6 |

A fase 6 vem depois da 5 de propósito: cada linha do bloco recente leva para a aba
Atividades do aluno, e link para tela que ainda não existe é o defeito que a
guarda `check-navigation-casts` foi criada para pegar.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [x] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [x] `docs/features/student-activity-feed.md` criado ou atualizado
- [x] `docs/STATUS.md` atualizado
