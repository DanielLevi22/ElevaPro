# Status dos Módulos — Eleva Pro

> **Atualizado em:** 2026-08-12 (feature/ai-nutrition-coach)
> **Regra:** atualizar ao fechar cada PR. Nenhuma feature é `done` sem este arquivo atualizado.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Completo e documentado |
| 🔄 | Implementado, spec técnica pendente |
| ⚠️ | Parcial / em andamento |
| ❌ | Não iniciado |
| N/A | Não aplicável nesta plataforma |

---

## Estado atual dos módulos

| Módulo | Web | Mobile | Spec (`docs/features/`) | Testes Web | Testes Mobile |
|--------|-----|--------|--------------------------|------------|---------------|
| **Auth** | ✅ | ✅ | 🔄 pendente | N/A | ⚠️ parcial |
| **Nutrition** | ✅ | ✅ | ✅ | ⚠️ parcial | ⚠️ parcial |
| **Workouts** | ✅ | ✅ | 🔄 pendente | ⚠️ parcial | ⚠️ parcial |
| **Students** | ✅ | ⚠️ parcial | 🔄 pendente | ⚠️ parcial | ⚠️ parcial |
| **Assessment** | ✅ análise corporal (leitura) | ✅ | ✅ [body-scan-integrity](features/body-scan-integrity.md) | ⚠️ parcial | ⚠️ parcial |
| **Gamification** | ⚠️ parcial | ✅ | ✅ | ❌ | ❌ |
| **AI / Agentes** | ⚠️ student coach (web) | ⚠️ cliente do BFF ([ADR-004](decisions/004-ai-bff-pattern.md)) | ⚠️ draft (blueprint) | ⚠️ parcial (service + readiness) | ⚠️ parcial |
| **Packages / Shared** | ✅ centralizado (students + auth + workouts + nutrition + gamification) | ✅ centralizado (students + auth + workouts + nutrition + gamification) | ✅ | N/A | N/A |
| **Database Schema** | ✅ | ✅ | ✅ | N/A | N/A |
| **Database Types** | ✅ gerado (`database.types.ts`) | ✅ | ✅ | N/A | N/A |
| **Briefing** | ✅ | N/A | ✅ | ✅ 21 testes | N/A |

---

## Design system (web)

Casa única: `web/src/shared/components/ui/`. Não criar outro diretório de UI —
o CLAUDE.md manda `Módulo → shared/`. **Procurar aqui antes de criar componente.**

| Primitiva | Papel |
|---|---|
| `DataTable` | Casca, cabeçalho, divisórias, hover, foco, esqueleto e vazio das listagens |
| `StatusBadge` | Pílula de status por tom semântico (`success`, `warning`, `info`, `danger`, `neutral`) |
| `PageHeader` | Sobrelinha, título, descrição e ações do topo da página |
| `FilterBar` | Busca, selects e pílulas de filtro |
| `Button` | Variantes, tamanhos e `isLoading`. Emite `type="button"` por padrão |
| `Dialog` | Overlay, painel, Escape, `role="dialog"`; `scrollable` para listas longas |
| `ConfirmModal` | Confirmação de ação — único do produto |
| `DateField` | Entrada de data com faixa aceita embutida |
| `formatDate` / `formatDateRange` | Exibição de data em `shared/utils/formatDate.ts` |

Três armadilhas que já custaram tempo:

- **Tailwind só gera classe que aparece literalmente no fonte.** Nunca montar
  `${breakpoint}:${width}` em runtime — a classe não existe no CSS.
- **`format` do date-fns lança** com data inválida, diferente de
  `toLocaleDateString`. Sempre usar o utilitário, nunca `format` direto.
- **`new Date("2026-08-01")` é lido como UTC** e volta um dia em fuso negativo.
  As colunas de data são *date-only*; usar `parseISO`.

---

## PRDs ativos

| PRD | Feature | Status | Branch |
|-----|---------|--------|--------|
| [student-web-dashboard](PRDs/student-web-dashboard.md) | Dashboard web do aluno (student + member) | ✅ done | `feature/student-web-dashboard` |
| [ci-and-vercel-optimization](PRDs/ci-and-vercel-optimization.md) | CI path filters + Vercel ignoreCommand | ✅ done | `feature/ci-and-vercel-optimization` |
| [vercel-pipeline-deploy](PRDs/vercel-pipeline-deploy.md) | Deploy via GitHub Actions + Vercel CLI | ✅ done | `feature/ci-and-vercel-optimization` |
| [database-audit-and-refactor](PRDs/database-audit-and-refactor.md) | Schema limpo: 21 tabelas, RLS, RPC, seeds | ✅ done | `feature/database-audit-and-refactor` |
| [students-schema-alignment](PRDs/students-schema-alignment.md) | Alinha módulo students ao novo schema | ✅ done | `feature/students-schema-alignment` |
| [shared-students-service](PRDs/shared-students-service.md) | Serviço centralizado students + auth em shared/ | ✅ done | `feature/shared-students-service` |
| [shared-workouts-service](PRDs/shared-workouts-service.md) | Serviço centralizado workouts em shared/ | ✅ done | `feature/shared-workouts-service` |
| [shared-nutrition-service](PRDs/shared-nutrition-service.md) | Serviço centralizado nutrition em shared/ | ✅ done | `feature/shared-nutrition-service` |
| [shared-gamification-service](PRDs/shared-gamification-service.md) | Serviço centralizado gamification em shared/ | ✅ done | `feature/shared-gamification-service` |
| [3d-muscle-map](PRDs/3d-muscle-map.md) | Mapa muscular 3D interativo com volume de treino | approved | — (branch não existe) |
| [ai-student-personalized-coach](PRDs/ai/ai-student-personalized-coach.md) | Coach IA para aluno: dual-persona, análise visual, motor de explicabilidade | approved | — (fase 1 mergeada) |
| [local-dev-environment](PRDs/local-dev-environment.md) | 3 ambientes: Local→Preview→Production | ✅ done | — |
| [social-and-engagement](PRDs/social-and-engagement.md) | Comunidade, ranking, chat, notificações | draft | — |
| [health-background-tracking](PRDs/health-background-tracking.md) | Passos/calorias: correção da leitura + coleta em background (Android) | ✅ done | — (mergeada) |
| [schema-drift-alignment](PRDs/schema-drift-alignment.md) | Alinha mobile e web ao schema real + guarda em CI contra recorrência | ✅ done | — (mergeada) |
| [admin-panel-restore](PRDs/admin-panel-restore.md) | Torna o painel /admin acessível, sem dar ao admin acesso a dados de saúde | draft — **aguarda decisão sobre 3 colunas** | — |
| [design-system-unification](PRDs/design-system-unification.md) | Tema claro alcançável, tokens e primitivas de UI do web | ⚠️ em andamento — fases 1–3 feitas, falta erradicar hex e a guarda de lint | `feature/design-system-unification` |
| [rls-security-hardening](PRDs/rls-security-hardening.md) | RLS nas 27 tabelas + guarda em CI + teste de isolamento | ✅ mergeado — **falta verificar preview e aplicar em produção** | `feature/rls-security-hardening` |
| [api-security-hardening](PRDs/api-security-hardening.md) | Autorização das rotas do BFF, que a RLS não alcança | approved | `feature/api-security-hardening` |
| [briefing](PRDs/briefing.md) | Briefing diário do especialista: quem precisa de mim hoje | ✅ done — recordes desbloqueados pela `0023`, ainda não implementados | `feature/briefing` |
| [workout-execution-consolidation](PRDs/workout-execution-consolidation.md) | Uma única representação de treino executado | ✅ done | `feature/workout-execution-consolidation` |
| [ai-coach-workout-stage](PRDs/ai-coach-workout-stage.md) | Coach de IA enxergando o aluno + estágio de criação de treino | ✅ done | `feature/ai-coach-workout-stage` |
| [ai-chat-sidebar](PRDs/ai-chat-sidebar.md) | Conversas na lateral com os dois coaches + título automático + bug do treino sem exercícios | ✅ done | `feature/ai-chat-sidebar` |
| [technical-debt-remediation](PRDs/technical-debt-remediation.md) | Auditoria completa das 3 bases: inventário DT-01..DT-40 com evidência, fases e guardas de CI | draft | — (branch não existe) |

> Adicionar linha aqui ao criar um novo PRD via `node scripts/new-feature.js`.

---

## Dívidas técnicas ativas

| # | Descrição | Prioridade | ADR relacionado |
|---|-----------|------------|-----------------|
| 1 | ~~`packages/supabase` duplicado e já divergido~~ — a tabela de permissões do CASL virou **arquivo único** em `shared/src/auth/abilities.ts`, com teste de 4 papéis × 14 subjects (87 casos) que quebra se as concessões mudarem sem a expectativa mudar junto. `getUserContextJWT` continua por plataforma de propósito: o web se autoconserta chamando `/api/auth/ensure-profile` (URL relativa) e o mobile repete a leitura com backoff para a corrida do signup — comportamento genuinamente diferente, não duplicação | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 2 | Specs técnicas dos módulos implementados pendentes (auth, workouts, students) | 🟡 Média | — |
| 3 | ~~Separação de ambientes Supabase (dev/preview/prod)~~ — **resolvido** | ✅ | [ADR-003](decisions/003-environment-strategy.md) |
| 4 | Cobertura com piso, e `shared/src/services` **coberto**: os 8 serviços têm teste (92 casos), contra 1 de 8 antes. Um duplo do cliente Supabase em `__tests__/supabaseFake.ts` fixa a resposta no `.from()` — sem isso o `Promise.all` de 7 consultas do briefing daria teste intermitente — e registra tabela, colunas e payload, que é como um teste pega `select("*")` em tabela sensível. Pisos: web 19%, mobile 9%, verificados falhando acima do valor real. **Continua sem medir `shared/`**: o provider v8 descarta arquivo fora da raiz do Vite, então esses 92 testes rodam e protegem mas não entram no número | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |
| 5 | ~~Código mobile/web referenciando tabelas antigas~~ — **resolvido** | ✅ | — |
| 6 | ~~`assessment` module usa `as unknown as AssessmentInsert`~~ — **Resolvido junto com a 44**: o cast saiu e o tipo gerado voltou a ser a guarda | ✅ | [PRD](PRDs/physical-assessment-schema-drift.md) |
| 7 | ~~12 tabelas referenciadas em código não existem no banco~~ — **resolvido**, com guarda em CI contra recorrência | ✅ | [PRD](PRDs/schema-drift-alignment.md) |
| 8 | Tela de perfil (mobile) exibe barra de XP sem fonte de dados — não existe sistema de nível/XP no schema | 🟢 Baixa | — |
| 9 | ~~Duas representações concorrentes de execução de treino~~ — **resolvido** na `0023`: `sets_data` apagada, as três telas gravam em `workout_session_sets` | ✅ | [PRD](PRDs/workout-execution-consolidation.md) |
| 10 | ~~**Painel `/admin` inacessível a todos**~~ — **Resolvido**: as colunas fantasma saíram das consultas, o `error` deixou de ser descartado, e `scripts/check-column-refs.js` passou a barrar coluna inexistente no pre-commit e no CI. A varredura achou o mesmo defeito em mais 8 lugares fora do admin — cardio calculando caloria com 70 kg fixo, sincronização de dieta que nunca rodou, conquistas que nunca contaram. Lista completa no PRD | ✅ | [PRD](PRDs/admin-panel-restore.md) |
| 11 | `check-schema-refs.js` valida só nomes de tabela, não colunas — as 4 colunas fantasma de `profiles` passariam pela guarda | 🟡 Média | — |
| 12 | ~~Nenhum job de CI roda `next build`~~ — **Resolvido**: job `web-build` no CI, dentro da verificação do `ci-success` (job fora do gate passa despercebido, como no PR #99). Mais o workflow `maestro-nightly.yml`, que finalmente roda os 7 fluxos de `app/.maestro/` — existiam no repositório e em workflow nenhum | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 13 | `sync-env.js` não é exercitado por nenhum teste, e já divergiu duas vezes dos `.env.example` | 🟢 Baixa | [ADR-009](decisions/009-migration-strategy.md) |
| 14 | 6 tabelas removidas do código podem ser features legítimas nunca implementadas: `workout_assignments`, `workout_feedback`, `nutrition_progress` e 3 de admin | 🟡 Média | [PRD](PRDs/schema-drift-alignment.md) |
| 15 | iOS nunca foi buildado — não existe `app/ios`. O caminho HealthKit e o background delivery seguem sem qualquer verificação | 🟡 Média | — |
| 16 | ~~**Bug do coral no mobile**~~ — **Resolvido**: `tailwind.config.js` parou de sobrescrever `primary`/`secondary`/`accent` com a paleta "Energy Gradient" do `constants/colors` e passou a ler os tokens de `global.css`, que já espelhavam o Claude Design. `bg-primary` e `var(--color-primary)` agora devolvem o mesmo lime. O `colors.ts` foi realinhado à paleta do design (lime `#CCFF00`, cyber-blue `#00F0FF`, hot-pink `#FF0099`, superfícies zinc) e 156 hex da marca antiga saíram das telas. Decisão já estava no PRD de design desde 2026-08-09 — eu é que não a tinha encontrado | ✅ | [PRD](PRDs/design-system-unification.md) |
| 17 | Tema claro do web nunca foi exercitado em uso real. `enableSystem` está desligado de propósito para que ninguém caia nele sem pedir — só volta a ligar depois de validar as telas | 🟡 Média | [PRD](PRDs/design-system-unification.md) |
| 18 | 10 periodizações no banco com data inválida, incluindo ano de 5 dígitos (`12312-12-23`). A leitura agora aguenta, mas os registros seguem corrompidos | 🟢 Baixa | — |
| 19 | `CreateWorkoutModal` é o único modal com casca própria — tem dois modos (página/modal) e rodapé fixo, que o `Dialog` não oferece | 🟢 Baixa | — |
| 20 | Sparklines do dashboard não existem: `useDashboardStats` devolve só contagens do momento, sem série histórica | 🟢 Baixa | — |
| 21 | ~~**18 de 27 tabelas sem RLS**~~ — **resolvido** nas migrations `0016`–`0020`, com guarda no pre-commit e no CI contra recorrência | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 22 | ~~**Escalonamento por `student_specialists`**~~ — **resolvido**: a tabela perdeu INSERT e DELETE, e o vínculo só nasce pela RPC `link_student_by_code` | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 23 | ~~`workout_session_sets` tem RLS só do aluno~~ — **resolvido** na `0017` (`sets_specialist_read`) | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 24 | `body_scans` guarda URL de foto corporal. RLS na tabela não protege o arquivo no Storage se a URL vazar — o bucket dessas fotos ainda não é versionado | 🟡 Média | [PRD](PRDs/rls-security-hardening.md) |
| 25 | Produção ainda não recebeu as migrations — só entram no push para `main`. O preview passou a se verificar sozinho no deploy (`scripts/verify-rls.sql`) | 🔴 Crítica | [PRD](PRDs/rls-security-hardening.md) |
| 26 | ~~`/api/students/[id]` contornava a imutabilidade de `physical_assessments`~~ — a RLS da `0017` concede só INSERT; a rota fazia UPDATE pelo `service_role`, que ignora RLS. O que a política proibia ao cliente, o servidor fazia assim mesmo. **Resolvido**: sempre insere nova avaliação, como a `LGPD_COMPLIANCE.md` seção 12 determina. `/lgpd-check` executado | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 27 | ~~**IDOR nas rotas de IA do especialista**~~ — `studentId` vinha da URL e nenhuma checagem de vínculo; um token de aluno lia a anamnese de qualquer outro. **Resolvido** com `@/lib/api-auth` + guarda no CI | ✅ | [PRD](PRDs/api-security-hardening.md) |
| 28 | ~~Privilégio saindo de `user_metadata`~~ — `ensure-profile` e `getUserContextJWT` (web) liam o `account_type` de campo que o próprio usuário edita. **Resolvido**: sai de `profiles` | ✅ | [PRD](PRDs/api-security-hardening.md) |
| 29 | Nenhuma rota de IA tem rate limit. Cada chamada custa dinheiro e qualquer conta autenticada chama à vontade — abuso de custo, não vazamento | 🟡 Média | [PRD](PRDs/api-security-hardening.md) |
| 44 | ~~**Nenhum caminho grava `physical_assessments` corretamente**~~ — **Resolvido**: nomes alinhados nas duas plataformas, lista de campos única em `@elevapro/shared`, cast removido, erros propagados. Migration `0030` completou as sete circunferências que o web já coletava. Antes: — mobile e web usam nomes de coluna que não existem, e os dois desligam a checagem (`const { data }` sem `error`; `as unknown as AssessmentInsert`). A leitura devolve "sem avaliação" em vez de erro. Bloqueava a régua do body scan (`ADR-010`) | ✅ | [PRD](PRDs/physical-assessment-schema-drift.md) |
| 30 | Cadastro público de especialista — **metade resolvida**. A migration `0034` faz o especialista nascer `invited` e passar pela aprovação do `/admin` (verificado no banco: specialist→invited, student→active). Isso e a correção do filtro da tela (dívida 50) fecham o fluxo, que nunca aprovou ninguém. **Fica pendente** o `email_confirm: true`: desligar exige SMTP configurado em produção, e não dá para verificar isso daqui | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |
| 41 | Os 44 alimentos de `foods` têm `category` NULL. Nenhuma busca por categoria funciona, e a curadoria nunca foi feita | 🟡 Média | [PRD](PRDs/ai-nutrition-coach.md) |
| 42 | ~~`DietDetailsHeader` derrubava a tela com plano sem período~~ — `format(new Date(""))` lança RangeError. **Resolvido**: utilitário de data + `0025` recusando nulo | ✅ | [PRD](PRDs/ai-nutrition-coach.md) |
| 43 | O cartão de refeições não soma calorias por refeição. O catálogo tem os macros; falta o cálculo por quantidade | 🟢 Baixa | [PRD](PRDs/ai-nutrition-coach.md) |
| 40 | ~~O schema Drizzle 4 colunas atrás do banco e divergente na obrigatoriedade~~ — **Resolvido**: `level`/`duration_weeks` e `duration_weeks`/`focus` entraram, e `start_date`/`end_date` viraram `.notNull()` nas duas tabelas. A divergência era ativa: `studentCoachService` e `CreateTrainingPlanScreen` inseriam sem data e o banco recusava — salvar plano do coach e criar ficha nunca funcionaram. Guarda: `npm run db:check-types` no CI | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 35 | `useProgressionAnalysis` monta o objeto, itera e descarta o resultado (`void effectiveItem`) — a análise de progressão do treino nunca funcionou. `analyzeExerciseProgression` está pronta e testada; falta ligar o hook | 🟡 Média | [PRD](PRDs/workout-execution-consolidation.md) |
| 34 | ~~Especialista nascia sem `specialist_services`~~ — o cadastro reinseria o perfil que o trigger já criara, batia em chave duplicada e pulava os serviços; o autoconserto do `ensure-profile` falhava com 42P10 por falta de UNIQUE. **Resolvido** na `0022` + rota corrigida | ✅ | — |
| 31 | ~~`students.service.ts` invoca a edge function `create-student`, que não existe~~ — o cadastro de aluno pelo mobile falhava em toda tentativa. **Resolvido**: passa por `POST /api/students`, o mesmo caminho autorizado por `authorizeSpecialist` que o web usa. `specialist_id` e `service_type` deixaram de vir do cliente — a rota os deriva do token. Guarda: 5 testes em `students.service.createStudent.test.ts` | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 32 | ~~`loadStudentContext` faz `select("*")` na anamnese~~ — **resolvido**: lê só `responses` e usa seis campos nomeados | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 36 | ~~**O coach de IA prescreve às cegas**~~ — **resolvido**: a anamnese é lida de `responses`, a avaliação pelos nomes reais, e a leitura de periodizações pedia `goal` em vez de `objective` — três 42703 descartados no mesmo arquivo. Agora o erro sobe | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 37 | ~~`query_exercises` manda o modelo buscar `Ombros` e `Braços`~~ — **resolvido**: o parâmetro virou enum dos nove grupos reais, com normalização de acento e plural, e grupo desconhecido responde o que existe | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 38 | ~~`/api/ai/chat/[studentId]` não verifica `student_consents`~~ — **resolvido**: consentimento checado antes de o dado sair do banco, nome do titular fora do prompt, e a rota entrou no mapa da seção 10 | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 39 | ~~O estágio de criação de treino existe pela metade~~ — **resolvido**: `propose_workouts` guarda a proposta, o cartão renderiza e a aprovação salva a cópia guardada | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 45 | ~~**O aluno não vê os exercícios do treino prescrito**~~ — `workout_exercises_student_read` (0018) só conhecia o caminho do member (`workouts.student_id`), NULL no treino de dentro de uma fase. O treino abria e a lista vinha vazia, sem erro: RLS não recusa, devolve zero linhas. **Resolvido** na `0033`, com o caso nas duas direções em `test-rls-isolation.mjs` | ✅ | [PRD](PRDs/ai-chat-sidebar.md) |
| 46 | ~~`test-rls-isolation.mjs` só provava uma direção~~ — nenhuma asserção cobria quem **deve** ver e não está vendo, e foi por isso que a 45 passou despercebida. **Resolvido**: 4 asserções novas, verificadas com a política antiga (1 falha) | ✅ | [PRD](PRDs/ai-chat-sidebar.md) |
| 33 | ~~Gate do CI ficava verde com a suíte pulada~~ — `paths-filter` sem `pull-requests: read` falhava, os outputs saíam vazios e o `ci-success` lia "nada mudou". **Resolvido**: permissão + o gate exige que a detecção tenha passado | ✅ | [PRD](PRDs/api-security-hardening.md) |
| 47 | ~~**Hooks dentro de `.map()` derrubavam o dashboard de nutrição**~~ — `useDietPlans` e `useStudentNutritionStats` eram chamados por aluno, um deles dentro de um `useMemo`. A contagem de hooks era `2 × alunos`: bastava a lista mudar de tamanho (primeiro aluno cadastrado, filtro aplicado) e o React lançava "Rendered more hooks than during the previous render". **Resolvido** com `useStudentsNutritionStats` sobre `useQueries` — uma chamada de hook, N consultas. Guarda: teste de rerender 0 → 1 → 3 → 0, verificado contra o padrão antigo | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 48 | ~~**Consulta do mobile e do browser sem tipo**~~ — `app/.../types.ts` exportava `Database = any` e `client.ts` exportava `Record<string, unknown>`; nenhum dos dois clientes recebia o genérico, então toda consulta das duas pontas devolvia `any`. Causa-raiz de #7, #10, #40 e #44. **Resolvido**: `database.types.ts` mudou para `shared/src/database/`, os dois clientes viraram `createClient<Database>`, e os placeholders sumiram. Isso destravou 65 erros de tipo que estavam escondidos. Guarda: `npm run db:check-types` regenera do banco e falha se divergir | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 49 | ~~**`database.types.ts` três migrations atrás do banco**~~ — faltava `student_anamnesis.updated_at` (`0029`) e as seis colunas `framing_*` de `body_scans` (`0027`/`0028`), e `start_date`/`end_date` ainda constavam nuláveis depois da `0024`/`0025`. Um arquivo gerado que ninguém regenera envelhece em silêncio. **Resolvido**: regenerado do banco com as 34 migrations aplicadas, com guarda no CI | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 50 | ~~**Vocabulário de `account_status` que o banco nunca teve**~~ — o código usava `pending`, `rejected` e `suspended`; o enum é `active \| inactive \| invited`. A lista de aprovações do `/admin` filtrava por `pending` e vinha **sempre vazia**; *Suspender*/*Rejeitar* gravavam valor recusado com 22P02; o login do mobile deixava conta `inactive` **entrar**; o badge exibia todo mundo como "Ativo". **Resolvido** mapeando para o enum real nas duas plataformas | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 51 | ~~**`/admin` de conteúdo escrevia colunas inexistentes**~~ — `exercises` não tem `category`, `equipment`, `difficulty`, `instructions` nem `status`; `foods` não tem `status` nem `is_verified`. Criar e editar exercício e alimento falhava sempre com 42703. `check-column-refs.js` não pegava: são `select("*")` e literais de objeto, invisíveis a um scanner textual — foi o cliente tipado que expôs. **Resolvido**: formulários passaram a usar só colunas reais | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 52 | ~~**Descanso entre séries nunca contou**~~ — `execute-workout.tsx` lia `item.rest_time`, campo que `workout_exercises` não tem (a coluna é `rest_seconds`): o cronômetro recebia sempre 0 e o tempo de descanso não aparecia na tela. **Resolvido** | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 53 | ~~**`WorkoutLog` descrevia uma tabela que não existe**~~ — a interface declarava `feedback` e o store consulta `workout_sessions`, cuja coluna é `notes`. O insert já gravava `notes`, então o erro ficou invisível. **Resolvido**: interface alinhada à tabela real | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 54 | ~~**6 rotas de IA com autorização copiada à mão**~~ — `body-scan`, `nutrition/{adherence,assistant,recipe}` e `workout/{batch,negotiate}` reimplantavam a checagem; cinco faziam `const { data } = await client.auth.getUser(token)` com o erro descartado. Provavam que existe um usuário, nunca qual papel ele tem. `check-api-auth.js` não as via porque não tocam `supabaseAdmin`. **Resolvido**: todas passam por `@/lib/api-auth`, e a guarda passou a exigir isso em **toda** rota sob `/api/` | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 55 | ~~**`biome.json` desligava regras que o `CLAUDE.md` exige**~~ — `noExplicitAny` (a regra "Nunca `any`"), `useExhaustiveDependencies` e `noArrayIndexKey` estavam off no override de `web/**`. **Resolvido**: as três religadas e o código corrigido — 19 `any` tipados, 4 efeitos que rodavam a cada render (`loadExercise`, `loadFood`, `handleLogout`, `calculateMatch`) envolvidos em `useCallback`, e as chaves por índice restantes com justificativa individual. Faltam as 6 de a11y, que vão na Fase 5 junto do DT-12 | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 56 | ~~**Menu de status da dieta oferecia valores que o enum recusa**~~ — `DietDetailsHeader` listava "Rascunho" (`draft`) e "Concluído" (`completed`), mas `diet_plan_status` só tem `active` e `finished`: as duas opções apareciam e falhavam com 22P02. Mesma classe do #50. **Resolvido** | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 57 | ~~**Cliente do Supabase em Server Component sem tipo**~~ — `createServerSupabaseClient` chamava `createServerClient` sem o genérico, e quem passava esse cliente para os serviços compartilhados precisava de `as any`. **Resolvido**: tipado por `Database`, o cast saiu | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 58 | Consultas que descartam o `error` — **catraca instalada**. Varredura achou 63; nem toda é defeito (em `api-auth.ts` o descarte é deliberado), então converter tudo em `throw` de uma vez trocaria falha silenciosa por falha barulhenta em caminho sem teste. `scripts/check-discarded-errors.js` fixa o teto por arquivo e falha quando **cresce**; as 63 descem uma a uma. Já corrigidas as de `useStudentDashboardData`, `useStudentProfile`, `chatService` e `anamnesisService` | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |
| 59 | ~~**`member` via botão de periodização que o banco recusava**~~ — o CASL do mobile concedia `manage Periodization` ao `member`; a RLS da `0018` dá a ele apenas SELECT. Botão aparecia, gravação era recusada sem erro — RLS não recusa, devolve zero linha. **Resolvido** unificando na versão restritiva. Para o member gerenciar de verdade, primeiro precisa de política que permita: é migration, não linha de CASL | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 60 | ~~**Toolchain divergente entre os três workspaces**~~ — TypeScript `~5.9.2` / `~6.0.3` / `^5`, React `19.2.3` / `19.2.0`, Biome `^2.3.11` / `2.4.10`. O mesmo código de `shared/` era verificado por dois compiladores. **Resolvido**: os três em TS `~6.0.3`, React `19.2.3` e Biome `2.4.10` fixos. O `baseUrl` do web saiu (depreciado no TS 6, removido no 7) e revelou um import `lib/utils` que só resolvia por causa dele | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 61 | ~~**Catálogo de exercícios com lixo só no mobile**~~ — o filtro de linhas-placeholder ("Adicionar exercício") vivia no hook do web; o mobile listava essas linhas como exercício real, porque cada plataforma tinha o próprio `useExercises`. **Resolvido**: filtro dentro de `fetchExercises`, e os hooks das duas pontas viraram casca sobre o serviço | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 62 | ~~Código morto espalhado pelas duas bases~~ — **Resolvido**: 32 arquivos apagados após varredura por grafo de imports real (a partir das rotas do Expo Router e do Next, seguindo aliases e barrels). Entre eles o módulo `training-plans` inteiro, `web/src/packages/core` (interfaces à mão duplicando os tipos do banco, com o `status` fantasma que a 56 corrigiu), os dois hooks de treino do mobile que só o próprio teste importava, e as sobras do template Expo. Uma varredura ingênua por nome apontava 392 arquivos, incluindo `api-auth.ts` — foi preciso resolver o grafo de verdade, e ainda assim ela só ficou correta depois de passar a reconhecer `import 'x'` sem `from`, que quase levou o `nativewind-interop` junto | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 63 | ~~**Botão de anamnese não levava a lugar nenhum**~~ — `PhysicalAssessment.tsx` fazia `router.push('/assessment/anamnesis' as never)` e essa rota nunca existiu; o `as never` transformou erro de compilação em botão morto. **Resolvido**: entrada `ROUTES.ASSESSMENT.ANAMNESIS` apontando para `/student/anamnesis`, que é a rota real | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 64 | ~~**Três caminhos para executar treino, dois para detalhe**~~ — `student/execute-workout`, `student/workout-execute/[id]`, `student/workout-detail` e `workouts/[id]` (na raiz, 636 linhas) não eram destino de nenhum `router.push`, `<Link>` ou `ROUTES`: o app inteiro navega por `(tabs)/workouts/...`. **Apagados**, junto das sobras do template Expo (`modal.tsx`, `+html.tsx`, `EditScreenInfo`, `StyledText`, `ExternalLink` e o teste de snapshot órfão). `student/anamnesis` e `students/anamnesis` **não** eram duplicatas — são telas diferentes (aluno preenchendo × especialista consultando) com caminhos parecidos demais | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 65 | ~~**Marca antiga no que o aluno recebe**~~ — o PDF de dieta trazia "MEU PERSONAL" no cabeçalho e "AUTENTICADO POR MEUPERSONAL ENGINE" no rodapé, o card de rede social dizia MEU PERSONAL, os prompts de IA se apresentavam como o app "Meu Personal" e o suporte era `@meupersonal.app`. Pior: a recuperação de senha mandava `redirectTo: 'meupersonal://reset-password'` enquanto o `app.json` declara `"scheme": "elevapro"` — **o link do e-mail não voltava para o app**. Tudo corrigido; falta só confirmar o fluxo em device | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 66 | ~~**44 `as never` desligavam as rotas tipadas**~~ — `typedRoutes` está ligado no `app.json` e o cast anulava a verificação. Removidos todos os 44: o compilador então apontou **três destinos que não existiam** — `/assessment/anamnesis` (botão da avaliação física), `/settings` (item inteiro do menu principal) e `/workouts/[id]/assignments` (declarado em `ROUTES`, nunca criado). Nenhum dava erro: o Expo Router simplesmente não navega. `ROUTES` ganhou tipos de retorno literais no lugar de `string`. Guarda: `npm run app:check-nav` no CI | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 67 | Acessibilidade — **web fechado, mobile começado**. Web: as 6 regras de a11y religadas e **201 violações reais** corrigidas (a contagem inicial de 20 era o teto de diagnósticos do Biome, não o número). Entre elas um defeito de uso: os dias do `DatePicker` eram `<div onClick>`, então **escolher data pelo teclado era impossível** — viraram `<button>` com rótulo por extenso. Mobile: `Button` passou a derivar `accessibilityLabel` do próprio `label` (pega os 23 usos sem tocar em call site) e `IconButton` tornou o rótulo **obrigatório no tipo**, já que só renderiza ícone — o compilador listou os 10 usos e todos foram nomeados. Ficam os ~700 touchables escritos direto nas telas | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |
| 68 | ~~`select("*")` em tabela sensível~~ — **Resolvido** nas 6 tabelas que a `LGPD_COMPLIANCE.md` classifica. `physical_assessments` ganhou `PHYSICAL_ASSESSMENT_COLUMNS` em `shared/`, literal única para o supabase-js inferir a linha. Guarda: `check-column-refs.js` recusa `*` nessas tabelas — e, ao passar a escanear `shared/src` (que nunca escaneava), ele também exigiu corrigir um falso positivo próprio no `.order(..., { foreignTable })` | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 69 | ~~`cn` duplicado e `@elevapro/core` do web~~ — duas implementações idênticas de `cn` (`lib/utils.ts` e `shared/utils/cn.ts`); a primeira saiu e os 6 imports foram reapontados. Junto: `app/src/lib/supabase.ts`, que montava um adapter de SecureStore e chamava `setSupabaseStorage` — documentado como no-op —, e `app/src/store/gamificationStore.ts`, atalho de 2 linhas para o módulo canônico | ✅ | [PRD](PRDs/technical-debt-remediation.md) |
| 70 | Fronteiras entre módulos no mobile — **catraca instalada**. Dos 25 imports módulo→módulo, 8 eram o módulo importando **a si mesmo** por caminho absoluto (convertidos para relativo). Os 17 restantes são acoplamento real, e 7 apontam para `auth/store/authStore`, que virou dependência global de fato. Resolver isso é mover estado de autenticação para `shared/` — arrasta Zustand e abre risco de ciclo; é decisão de arquitetura, não limpeza. `app:check-modules` barra acoplamento novo | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |
| 16b | Arquivos acima de 500 linhas — **aviso no CI**, não bloqueio. São 23 e ~14 mil linhas; reescrever tudo com 9% de cobertura no mobile trocaria dívida conhecida por regressão desconhecida, e bloqueio que ninguém atende vira `--no-verify`. A regra registrada é "arquivo que o PR tocar sai dele abaixo de 500" | 🟡 Média | [PRD](PRDs/technical-debt-remediation.md) |

---

## Próximas features planejadas

> Mover para `docs/PRDs/` ao iniciar. Não começar sem PRD aprovado.

1. ~~Criar projetos Supabase Preview + Production~~ — **feito**
2. ~~Atualizar código para usar novo schema~~ — **feito** (diet_plans, diet_meals, student_specialists)
3. ~~Fechar PR `feature/auth-student-registration`~~ — **feito** (branch mergeada e removida)
4. **Validar em aparelho** o que só se prova em uso: comandos de voz no treino,
   entrega de notificação, e coleta de passos em background
5. Corrigir `icon.png` e `adaptive-icon.png` — são JPEG com extensão `.png`,
   último item aberto do `expo-doctor` e motivo comum de recusa em loja
6. Migração de packages para `/packages/` na raiz (ADR-002)
7. Spec técnica de Auth (`docs/features/auth.md`)
8. Spec técnica de Workouts (`docs/features/workouts.md`)
9. AI student coach: fase 2 (mobile + spec técnica)
