# PRD: briefing

**Data de criação:** 2026-08-11
**Status:** draft — **bloqueado**, ver "Bloqueadores"
**Branch:** feature/briefing
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Uma tela de abertura do dia para o especialista, em `/dashboard/briefing`, que
responde a uma pergunta só: **quem precisa de mim hoje?** Um parágrafo com o
resumo do dia, cartões de alunos que exigem ação, e uma linha de números.

### Por quê?
Hoje o especialista abre o `/dashboard` e vê quatro contagens — total de alunos,
treinos criados, dietas ativas, treinos concluídos. Nenhuma delas responde a
pergunta que ele realmente tem ao abrir o sistema. Para descobrir que um aluno
sumiu há uma semana, ele precisa entrar aluno por aluno.

O aluno que abandona não avisa: ele simplesmente para de registrar treino. Esse
silêncio é invisível na tela atual, e é exatamente o sinal que chega cedo o
bastante para o especialista agir.

### Como saberemos que está pronto?
- [ ] Um aluno sem sessão de treino há N dias aparece no briefing, e o número de
      dias exibido bate com a última sessão registrada
- [ ] Um convite pendente há mais de 3 dias aparece, com a contagem correta
- [ ] Uma anamnese concluída sem plano de treino ativo aparece
- [ ] O especialista **não** vê nenhum aluno fora dos seus vínculos ativos —
      verificado por teste com dois especialistas e o mesmo aluno
- [ ] Nenhuma resposta do briefing contém conteúdo de anamnese, peso, medida ou
      carga; apenas nome, contagem e rótulo de situação
- [ ] Sem alunos, ou sem nada a sinalizar, a tela diz isso — não mostra
      esqueleto infinito nem cartão vazio
- [ ] `npm run lint`, `tsc --noEmit` e testes limpos

---

## Contexto

Levantado em 2026-08-11 a partir da tela `BriefingPage` do projeto ElevaPro no
Claude Design, comparada ao schema real.

O design propõe quatro elementos. Nem todos têm dado por trás:

| Elemento do design | Fonte | Existe? |
|---|---|---|
| "24 alunos ativos" | `student_specialists.status = 'active'` | ✅ já usado em `useDashboardStats` |
| "1 em risco de abandono" | derivar de `workout_sessions.completed_at` | ⚠️ derivação nova, dado existe |
| "Convite pendente há 4 dias" | `profiles.account_status = 'invited'` + `student_specialists.created_at` | ✅ |
| "Anamnese concluída — pronta para o plano" | `student_anamnesis.completed_at` | ✅ |
| "Bateu 3 PRs esta semana" | `workout_session_sets.weight_actual` | ❌ **RLS impede** — ver Bloqueadores |
| "86 sessões de IA (+18% no mês)" | `ai_chat_sessions` | ⚠️ contagem sim; o "+18%" exige série histórica |
| "94% retenção" | — | ❌ **não existe fonte nem definição** |
| "12 modelos de treino" | `workouts` do especialista | ✅ |

`student_specialists.status` é o enum `link_status`, que tem só `active` e
`inactive`. **Não existe `pending`** — o convite pendente vive em
`profiles.account_status = 'invited'`, que é outra tabela. Quem implementar
precisa saber disso antes de escrever a query.

---

## Bloqueadores

> Não implementar sem resolver. Levantado no `/lgpd-check` de 2026-08-11.

### 1. `workout_sessions` e `student_anamnesis` não têm RLS — nenhuma 🔴

Auditoria das migrations: RLS está habilitado em **9 tabelas** —
`ai_chat_sessions`, `ai_chat_messages` (0003), `workout_session_sets` (0007),
`diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods` (0013) e
`health_daily_metrics` (0015).

Não está habilitado em `profiles`, `student_specialists`, `student_anamnesis`,
`physical_assessments`, `workout_sessions`, `workout_session_exercises`,
`workouts` nem `training_periodizations`.

Consequência: hoje **qualquer usuário autenticado consegue ler o histórico de
treino e a anamnese de qualquer aluno do sistema**, de qualquer especialista.
O `0000_snapshot.json` confirma — `"isRLSEnabled": false` em todas elas.

Isso é anterior ao briefing e não foi causado por ele. Mas o briefing é a
primeira tela que lê essas tabelas **agregando todos os alunos de uma vez**, o
que transforma um buraco latente em superfície de exposição real. Construir em
cima disso seria assinar embaixo.

**Ação obrigatória:** habilitar RLS em `workout_sessions`, `student_anamnesis`,
`student_specialists` e `profiles` antes da primeira query do briefing, no
padrão que `meal_logs` e `health_daily_metrics` já usam — aluno dono + leitura
para especialista com `student_specialists.status = 'active'`. Isso é PRD
próprio, não item deste.

### 2. "Bateu 3 PRs" é impossível para o especialista hoje 🔴

`workout_session_sets` **tem** RLS, e a política é só do aluno:

```sql
CREATE POLICY "student_own_sets" ON workout_session_sets
  FOR ALL USING (... ws.student_id = auth.uid());
```

Não há política de leitura para o especialista. A query de recordes retornaria
vazio — silenciosamente, sem erro. Some do escopo até existir a política.

Some ainda um segundo problema: `workout_session_sets` convive com
`workout_session_exercises.sets_data` guardando o mesmo dado em JSONB — a dívida
#9 do `STATUS.md`. Detectar recorde exige antes decidir qual das duas manda.

### 3. "94% retenção" não tem definição, nem dado 🟡

Não existe tabela de churn, nem definição de o que conta como retido. Inventar
um número que o especialista lê como real é pior do que omitir.

---

## Escopo

### Incluído

**Fase 1 — sinais que já têm dado e não dependem de RLS nova**
- Convite pendente há mais de 3 dias (`profiles.account_status = 'invited'`)
- Anamnese concluída sem periodização ativa (`student_anamnesis.completed_at`)
- Linha de números: alunos ativos, treinos criados, dietas ativas, sessões de IA

**Fase 2 — inatividade, depois da RLS**
- Aluno sem sessão concluída há N dias, com N configurável no código e um
  padrão justificado, não escolhido no chute
- Parágrafo de resumo montado a partir dos sinais reais

**Fase 3 — item de navegação**
- "Briefing" no sidebar, como primeiro item do especialista

### Fora do escopo (explicitamente)

- **Recordes / PRs.** Bloqueador 2. Volta quando existir política de leitura do
  especialista em `workout_session_sets` e a dívida #9 estiver resolvida.
- **Retenção.** Bloqueador 3.
- **"+18% no mês" nas sessões de IA.** Exige comparar com o mês anterior; a
  contagem simples entra, a variação não.
- **Texto gerado por IA.** O parágrafo é template com números reais. Passar
  dado de aluno a um modelo é outro tratamento, com outra base legal.
- **Briefing para o aluno.** Esta tela é do especialista.
- **Notificação ou e-mail diário.** Só a tela.

---

## Fluxo de dados

```
/dashboard/briefing  (Server Component)
  → briefingService.fetchBriefing(specialistId)   [shared/src/services]
      → Promise.all([
          student_specialists  (vínculos ativos do especialista)
          profiles             (nome + account_status dos vinculados)
          student_anamnesis    (completed_at, sem ler `responses`)
          training_periodizations (existe ativa?)
          workouts             (contagem)
          diet_plans           (contagem de ativas)
          ai_chat_sessions     (contagem)
        ])
  → BriefingSignal[]  ← já agregado, sem dado de saúde cru
  → <BriefingPage signals={...} stats={...} />
```

Server Component porque o dado é de leitura, não muda durante a visita, e assim
o payload que atravessa a fronteira é o sinal já agregado — não a linha da
tabela. Ver `server-serialization` em `vercel-react-best-practices`.

As sete buscas são independentes: `Promise.all`, nunca em série. Mesma lição do
`useDashboardStats`, que esperava quatro idas ao banco antes de pintar número.

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| `student_specialists` | SELECT | Vínculos `status = 'active'` do especialista |
| `profiles` | SELECT | `full_name`, `account_status` dos vinculados |
| `student_anamnesis` | SELECT | **Apenas `completed_at`**. Nunca `responses` |
| `training_periodizations` | SELECT | Existe ativa para o aluno? |
| `workouts`, `diet_plans`, `ai_chat_sessions` | SELECT | Contagem (`head: true`) |
| `workout_sessions` | SELECT | **Fase 2**, só depois da RLS. Apenas `completed_at` mais recente |

Nenhum campo novo. Nenhuma tabela nova. Nenhum INSERT, UPDATE ou DELETE.

## Impacto em outros módulos

- **`dashboard`** — o briefing responde a pergunta que o dashboard não responde.
  Os dois convivem; decidir qual é a rota inicial do especialista é decisão de
  produto, não deste PRD.
- **`students`** — cada cartão leva ao detalhe do aluno.
- **`workouts`, `nutrition`** — leitura de contagem apenas.

---

## Resultado do /lgpd-check — briefing

Executado em 2026-08-11 contra `docs/LGPD_COMPLIANCE.md`.

**Bloco A — Necessidade e Finalidade** ⚠️
Finalidade específica e legítima: permitir que o especialista intervenha antes
do abandono. O que salva o bloco é a **minimização**: o briefing lê
`student_anamnesis.completed_at` mas **nunca** `responses`, e lê a data da última
sessão mas **nunca** carga, repetição ou intensidade. O sinal que chega à tela é
"não treina há 5 dias", não o treino.

**Bloco B — Base Legal** ✅
Sem dado novo, então sem base legal nova. `workout_sessions` já está mapeado
como Execução de Contrato (Art. 7°, V) e `student_anamnesis` como Consentimento
Explícito (Art. 11, I). Agregar para alertar o profissional que já tem acesso
legítimo permanece dentro da mesma finalidade.

**Bloco C — Segurança e Acesso** ❌ **BLOQUEADOR**
As duas tabelas centrais não têm RLS. Ver Bloqueador 1. Enquanto isso valer, o
isolamento entre especialistas depende só do `WHERE` da aplicação — e a LGPD
trata RLS mal configurado como falha do controlador, não do operador
(`LGPD_COMPLIANCE.md`, seção 1).

**Bloco D — Direitos dos Titulares** ✅
Nada novo é armazenado; o briefing é leitura derivada. Não altera acesso,
correção, exclusão nem portabilidade.

**Bloco E — Prevenção e Transparência** ⚠️
Não logar o sinal em texto claro: "João Silva não treina há 5 dias" é inferência
sobre saúde de um titular identificado. Log só com contagem agregada.

### Bloqueadores (não implementar sem resolver)
- ❌ RLS ausente em `workout_sessions`, `student_anamnesis`, `student_specialists`
  e `profiles` → habilitar antes da fase 2
- ❌ `workout_session_sets` sem política de leitura para especialista → recordes
  fora do escopo

### Atualizações necessárias em docs/LGPD_COMPLIANCE.md
- [ ] Seção 3: registrar "Sinal derivado de inatividade para o especialista
      vinculado" como tratamento, sob a mesma base do dado de origem
- [ ] Seção 10: marcar que o módulo de workouts foi revisado e **reprovou** em
      RLS

---

## Decisões técnicas

**O parágrafo é template, não IA.** Passar nome e situação de saúde de aluno a
um modelo é tratamento novo, com base legal própria — e o valor da tela não
depende disso. Template com número real entrega o mesmo e não abre a questão.

**O sinal é calculado no servidor, não no cliente.** Se o cliente recebesse a
lista de sessões para derivar inatividade, o dado de saúde cru atravessaria a
fronteira e ficaria no HTML. Só o sinal agregado atravessa.

**Sem RLS, sem fase 2.** A tentação é entregar a inatividade agora e a RLS
depois. É o inverso: a fase 2 é justamente o que agrega dado sensível de todos
os alunos numa tela só. Fazer nessa ordem é o que a auditoria acima
desaconselha.

**N dias de inatividade precisa de justificativa.** O design usa 5. Não há
evidência de que 5 seja o ponto certo — depende da frequência prescrita ao
aluno. Registrar a escolha e a razão, ou derivar da frequência do plano.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [ ] Bloqueadores resolvidos ou escopo reduzido às fases sem bloqueio
- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] Teste de isolamento: dois especialistas, um aluno, nenhum vê o do outro
- [ ] PR mergeado em `development`
- [ ] `docs/features/briefing.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado
