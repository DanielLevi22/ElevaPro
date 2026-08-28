# Feature: student-activity-feed

**Entregue em:** 2026-08-28
**PRD:** [student-activity-feed](../PRDs/student-activity-feed.md)
**Branch:** `feature/student-activity-feed`

---

## O que é

A aba **Atividades** do aluno — um acompanhamento agrupado por dia, com o treino
executado, o cardio, as refeições registradas e o feedback de fim de sessão, com
filtro por autoria. E o bloco **Aconteceu** no Briefing, com os 10 eventos mais
recentes de todos os alunos vinculados.

## Por que existe

O app pedia RPE e observações no fim de toda sessão, gravava em
`workout_sessions.intensity` e `.notes`, e **nenhuma query do web lia essas duas
colunas**. O aluno escrevia "senti dor no ombro" e o personal nunca via.

Pedir feedback e não usar ensina o aluno a não responder: em duas ou três
sessões ele passa a apertar Salvar com o RPE no 5 do meio, e aí o dado que existe
também deixa de valer. É violação de finalidade pelo avesso — coletar sem usar.

E não existia a tela do acompanhamento: o especialista tinha Métricas (agregado),
Avaliações (pontual) e Nutrição (o plano), e nada que respondesse "o que esse
aluno fez esta semana?".

---

## Fluxo de dados

```
[Aluno registra no mobile]
  treino:   WorkoutFeedbackModal → saveWorkoutSession → workout_sessions (strength)
  cardio:   WorkoutFeedbackModal → saveCardioSession  → workout_sessions (cardio)
  refeição: nutritionStore                            → meal_logs
  (trigger de gamificação agrega o dia)               → daily_goals

[Especialista abre Atividades]
  StudentActivitiesPage → useStudentActivities(studentId, autoria)
    → GET /api/students/[id]/activities?author=…
       authorizeLinkedSpecialist + supabaseAdmin
       activityService.fetchStudentActivities
       Promise.all: workout_sessions · meal_logs · daily_goals ·
                    physical_assessments · diet_plans
    ← ActivityDay[] { date, summary, events[] }

[Especialista abre o Briefing]
  briefing/page.tsx (Server Component)
    → Promise.all(fetchBriefing, fetchRecentActivity)
    ← RecentActivityItem[] { studentId, studentName, kind, title, rpe, at }
```

O agrupamento por dia acontece **no servidor**. Mandar cinco listas cruas para o
cliente montar o calendário é trabalho de renderização que não precisa existir —
e, no caso de `notes`, é dado de saúde viajando sem necessidade.

---

## Tabelas

| Tabela | Operação | Observação |
|---|---|---|
| `workout_sessions` | ALTER (4 colunas), SELECT | `session_type`, `duration_seconds`, `active_calories`, `activity_name` |
| `workouts` | DELETE | Linhas sintéticas `'Treino Cardio Livre'` apagadas |
| `meal_logs` | ALTER (2 drops), SELECT | Saíram `photo_url` e `notes` — nenhuma tinha caminho de escrita |
| `student_specialists` | SELECT | Vínculo ativo — é o filtro do bloco recente |
| `daily_goals` | SELECT | Resumo do dia, já computado pela gamificação |
| `physical_assessments`, `diet_plans` | SELECT | Eventos de autoria do especialista |
| `student_consents` | SELECT/UPSERT | Gate versionado da política 1.1 |

---

## Implementação

### Compartilhado (`shared/src/`)

| Arquivo | Responsabilidade |
|---|---|
| `services/activity.service.ts` | `fetchRecentActivity` e `fetchStudentActivities` |
| `types/activity.types.ts` | `ActivityDay`, `ActivityEvent`, `RecentActivityItem` |
| `utils/rpe.ts` | Escala de esforço — fonte única das duas plataformas |
| `services/health.service.ts` | `POLICY_VERSION` e o consentimento versionado |

### Mobile (`app/src/`)

| Arquivo | Responsabilidade |
|---|---|
| `components/consent/HealthDataConsentGate.tsx` | Pede o consentimento na abertura, quando a versão sobe |
| `modules/workout/store/workoutStore.ts` | Grava `session_type` e os números do cardio; `notes` só com consentimento |
| `components/workout/WorkoutFeedbackModal.tsx` | Lembrete "Seu personal vê este feedback" |

### Web (`web/src/`)

| Tipo | Arquivo |
|---|---|
| Rota | `app/api/students/[id]/activities/route.ts` |
| Redirect | `app/dashboard/students/[id]/history/page.tsx` |
| Page | `modules/students/pages/StudentActivitiesPage.tsx` |
| Component | `modules/students/components/ActivityDayCard.tsx` |
| Hook | `modules/students/hooks/useStudentActivities.ts` |
| Component | `modules/briefing/components/RecentActivity.tsx` |

---

## Decisões técnicas não-óbvias

### `session_type` em vez de tabela `cardio_sessions`

Tabela separada duplicaria `student_id`, `started_at`, `completed_at`,
`intensity` e `notes`, e obrigaria toda consulta de feed e de métricas a fazer
UNION. Do ponto de vista do produto as duas são a mesma coisa — uma sessão que o
aluno executou e avaliou.

### A linha sintética de cardio foi apagada, não consertada

Ela nascia com `specialist_id` = id do **aluno**, e existia só para dar um título
ao join. Com `session_type` na sessão, o join não é mais necessário: `workout_id`
já era anulável (`ON DELETE SET NULL`). Resolve D1 e D3 de uma vez, e tira a
prescrição fantasma da biblioteca do aluno.

### `activity_name` — a coluna que o PRD não previu

Com `workout_id` nulo, a modalidade do cardio ("Corrida", "Bike") ficaria sem
casa. A linha sintética nunca a guardou: o título dela era sempre `'Treino Cardio
Livre'`. A modalidade só existia dentro da string gerada em `notes`, e sumia
quando o aluno escrevia qualquer coisa.

### O filtro do bloco recente é o vínculo, não o dono do treino

`.eq("workouts.specialist_id", user.id)` responde "treinos que eu criei". A
pergunta certa é "alunos que são meus". São diferentes sempre que o aluno executa
algo que o especialista não prescreveu — e, com o `specialist_id` errado do D3,
**nenhuma sessão de cardio podia aparecer, de nenhum aluno, nunca**.

### O corte em 10 é no resultado ordenado

O bloco antigo somava três consultas com teto próprio (5 + 3 + 3) e cortava a
soma. Um especialista com 20 treinos concluídos no dia via 5, e nenhuma
quantidade de atividade fazia o sexto aparecer. E não há janela de dias: para "os
10 últimos" a pergunta é de ordenação, não de intervalo — a janela de 7 dias
esvaziava a tela de quem voltava de férias.

### O resumo do dia vem de `daily_goals`

A meta vem junto com o realizado: "3 refeições" não diz nada, "3/4" diz.
Recalcular no feed duplicaria a regra da gamificação, e as duas divergiriam no
primeiro ajuste.

### Dia sem registro aparece, não some

Para o especialista **a ausência é a informação**: três dias vazios seguidos é o
que ele precisa ver, e uma lista que pula de 28/08 para 25/08 esconde isso atrás
de uma conta que ninguém faz de cabeça.

### As colunas de `workout_sessions` estão escritas por extenso em cada `.select()`

`check-column-refs.js` casa `.from("tabela")` com o **próximo** `.select()` de
string literal. Uma constante compartilhada faz a guarda pular adiante e conferir
a lista contra a tabela da consulta seguinte — foi assim que ela acusou
`workout_sessions.logged_date`, que é coluna de `meal_logs`. Repetir dez nomes é
mais barato que perder a guarda.

---

## LGPD

- `workout_sessions.notes` reclassificado como **dado sensível** (Art. 11, II, f +
  Art. 11, I) e separado da linha genérica de performance na seção 2.2. `intensity`
  segue como execução de contrato — é medida de carga, não relato clínico.
- `notes` deixou de receber texto gerado pelo app. Enquanto recebia, não havia
  como saber se uma linha era relato do titular ou string do sistema — e os dois
  têm tratamento diferente no direito de acesso e na eliminação.
- **Consentimento versionado de verdade.** `hasCollectionConsent` passou a
  comparar `policy_version`; antes lia só `given_at`/`revoked_at`, então subir a
  constante não alcançava ninguém. `POLICY_VERSION` virou fonte única (estava
  duplicada em dois arquivos). A `1.1` acrescenta a cláusula que faltava: o
  especialista vinculado lê o que o aluno escreve no feedback.
- **`HealthDataConsentGate`** no mobile. Antes, o único registro de consentimento
  era efeito colateral de conectar o HealthKit no onboarding: quem pulava nunca
  consentia. Gate na porta cobre os caminhos que ainda não existem — o que
  encerra a pendência de `toggleMealCompletion` da seção 10.
- **Recusar significa alguma coisa:** `notasSeConsentido` descarta o texto livre
  sem consentimento vigente e grava a sessão mesmo assim.
- **`meal_logs.photo_url` e `.notes` apagadas** — nenhuma tinha caminho de
  escrita. Registradas na seção 2.3.
- **Três vazamentos de log fechados**: o masquerade imprimia `sessionData`
  inteiro, com `notes` dentro.
- `authorizeLinkedSpecialist` na rota nova, antes de qualquer SELECT.

---

## O que ficou de fora, e por quê

- **Passos e calorias do `health_daily_metrics` no feed** — dado contínuo, não
  evento. Pertence a Métricas.
- **Gráfico de RPE ao longo do tempo** — é onde o dado vira decisão de
  prescrição, mas depende de a coleta estar confiável primeiro. PRD próprio.
- **Sinal no briefing** ("3 sessões seguidas com RPE ≥ 9") — o briefing consome
  tendência, não evento.
- **Notificar quando o aluno relata dor** — feature de saúde com
  responsabilidade própria; precisa de decisão de produto sobre o que o app
  promete quando alguém escreve "senti dor no peito".
- **Unificar o `intensity` do acelerômetro com o RPE (D4)** — renomear é trivial;
  decidir o que fazer com a leitura do acelerômetro não é.
- **Retroagir o dado perdido** — duração, calorias e modalidade das sessões de
  cardio antigas estão dentro da string gerada e não são recuperáveis. Não há
  parser de propósito: parser de string gerada acerta a maioria e erra em
  silêncio, e o resultado seria número inventado numa coluna que o especialista
  lê como medida.

---

## Verificação

```bash
# Estrutura e comportamento da RLS, incluindo as colunas da 0035
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-rls.sql

npm run lint
npm run db:check-columns && npm run api:check-auth && npm run db:check-errors
cd web && npx tsc --noEmit && npx vitest run && npx next build
cd app && npx tsc --noEmit && npx jest
```

Manual, com conta de aluno em `policy_version = '1.0'`: abrir o app, ver o pedido
de reconsentimento uma vez, aceitar, confirmar que a linha ficou em `1.1` e que o
pedido não volta. Executar um cardio e conferir no banco que a sessão tem
`session_type='cardio'`, `workout_id IS NULL`, duração/calorias em coluna e
`notes` com só o que foi digitado.

## Dívidas abertas por esta entrega

- **71** — direito de correção (Art. 18, III): o aluno não tem caminho para
  editar observação já enviada.
- **72** — `workoutStore.ts` (753) e `workouts.service.ts` (519) acima de 500
  linhas.
