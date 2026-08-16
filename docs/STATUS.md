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

> Adicionar linha aqui ao criar um novo PRD via `node scripts/new-feature.js`.

---

## Dívidas técnicas ativas

| # | Descrição | Prioridade | ADR relacionado |
|---|-----------|------------|-----------------|
| 1 | `packages/core` e `packages/supabase` duplicados em web e app — já divergiram (students, auth, workouts, nutrition e gamification centralizados) | 🟡 Média | [ADR-002](decisions/002-flat-monorepo.md) |
| 2 | Specs técnicas dos módulos implementados pendentes (auth, workouts, students) | 🟡 Média | — |
| 3 | ~~Separação de ambientes Supabase (dev/preview/prod)~~ — **resolvido** | ✅ | [ADR-003](decisions/003-environment-strategy.md) |
| 4 | Testes de cobertura insuficientes em todos os módulos | 🟡 Média | — |
| 5 | ~~Código mobile/web referenciando tabelas antigas~~ — **resolvido** | ✅ | — |
| 6 | ~~`assessment` module usa `as unknown as AssessmentInsert`~~ — **Resolvido junto com a 44**: o cast saiu e o tipo gerado voltou a ser a guarda | ✅ | [PRD](PRDs/physical-assessment-schema-drift.md) |
| 7 | ~~12 tabelas referenciadas em código não existem no banco~~ — **resolvido**, com guarda em CI contra recorrência | ✅ | [PRD](PRDs/schema-drift-alignment.md) |
| 8 | Tela de perfil (mobile) exibe barra de XP sem fonte de dados — não existe sistema de nível/XP no schema | 🟢 Baixa | — |
| 9 | ~~Duas representações concorrentes de execução de treino~~ — **resolvido** na `0023`: `sets_data` apagada, as três telas gravam em `workout_session_sets` | ✅ | [PRD](PRDs/workout-execution-consolidation.md) |
| 10 | **Painel `/admin` inacessível a todos** — `layout.tsx` consulta `is_super_admin`, coluna inexistente, e redireciona qualquer usuário. Mais 3 colunas fantasma em `profiles` | 🔴 Alta | [PRD](PRDs/admin-panel-restore.md) |
| 11 | `check-schema-refs.js` valida só nomes de tabela, não colunas — as 4 colunas fantasma de `profiles` passariam pela guarda | 🟡 Média | — |
| 12 | Nenhum job de CI roda `next build`. Erro de prerender só aparece no deploy, depois do merge — foi assim com o `useSearchParams` em `/auth/register` | 🟡 Média | — |
| 13 | `sync-env.js` não é exercitado por nenhum teste, e já divergiu duas vezes dos `.env.example` | 🟢 Baixa | [ADR-009](decisions/009-migration-strategy.md) |
| 14 | 6 tabelas removidas do código podem ser features legítimas nunca implementadas: `workout_assignments`, `workout_feedback`, `nutrition_progress` e 3 de admin | 🟡 Média | [PRD](PRDs/schema-drift-alignment.md) |
| 15 | iOS nunca foi buildado — não existe `app/ios`. O caminho HealthKit e o background delivery seguem sem qualquer verificação | 🟡 Média | — |
| 16 | **Mobile continua com o bug do coral**: `app/tailwind.config.js` sobrescreve o lime de `app/src/global.css`, então `bg-primary` e `var(--color-primary)` devolvem cores distintas na mesma tela. Mais 873 hex cravados em `app/src` | 🟡 Média | [PRD](PRDs/design-system-unification.md) |
| 17 | Tema claro do web nunca foi exercitado em uso real. `enableSystem` está desligado de propósito para que ninguém caia nele sem pedir — só volta a ligar depois de validar as telas | 🟡 Média | [PRD](PRDs/design-system-unification.md) |
| 18 | 10 periodizações no banco com data inválida, incluindo ano de 5 dígitos (`12312-12-23`). A leitura agora aguenta, mas os registros seguem corrompidos | 🟢 Baixa | — |
| 19 | `CreateWorkoutModal` é o único modal com casca própria — tem dois modos (página/modal) e rodapé fixo, que o `Dialog` não oferece | 🟢 Baixa | — |
| 20 | Sparklines do dashboard não existem: `useDashboardStats` devolve só contagens do momento, sem série histórica | 🟢 Baixa | — |
| 21 | ~~**18 de 27 tabelas sem RLS**~~ — **resolvido** nas migrations `0016`–`0020`, com guarda no pre-commit e no CI contra recorrência | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 22 | ~~**Escalonamento por `student_specialists`**~~ — **resolvido**: a tabela perdeu INSERT e DELETE, e o vínculo só nasce pela RPC `link_student_by_code` | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 23 | ~~`workout_session_sets` tem RLS só do aluno~~ — **resolvido** na `0017` (`sets_specialist_read`) | ✅ | [PRD](PRDs/rls-security-hardening.md) |
| 24 | `body_scans` guarda URL de foto corporal. RLS na tabela não protege o arquivo no Storage se a URL vazar — o bucket dessas fotos ainda não é versionado | 🟡 Média | [PRD](PRDs/rls-security-hardening.md) |
| 25 | Produção ainda não recebeu as migrations — só entram no push para `main`. O preview passou a se verificar sozinho no deploy (`scripts/verify-rls.sql`) | 🔴 Crítica | [PRD](PRDs/rls-security-hardening.md) |
| 26 | Rota `/api/students/[id]` faz UPDATE em `physical_assessments` pelo `service_role`, contornando a imutabilidade que a RLS impõe ao cliente | 🟡 Média | — |
| 27 | ~~**IDOR nas rotas de IA do especialista**~~ — `studentId` vinha da URL e nenhuma checagem de vínculo; um token de aluno lia a anamnese de qualquer outro. **Resolvido** com `@/lib/api-auth` + guarda no CI | ✅ | [PRD](PRDs/api-security-hardening.md) |
| 28 | ~~Privilégio saindo de `user_metadata`~~ — `ensure-profile` e `getUserContextJWT` (web) liam o `account_type` de campo que o próprio usuário edita. **Resolvido**: sai de `profiles` | ✅ | [PRD](PRDs/api-security-hardening.md) |
| 29 | Nenhuma rota de IA tem rate limit. Cada chamada custa dinheiro e qualquer conta autenticada chama à vontade — abuso de custo, não vazamento | 🟡 Média | [PRD](PRDs/api-security-hardening.md) |
| 44 | ~~**Nenhum caminho grava `physical_assessments` corretamente**~~ — **Resolvido**: nomes alinhados nas duas plataformas, lista de campos única em `@elevapro/shared`, cast removido, erros propagados. Migration `0030` completou as sete circunferências que o web já coletava. Antes: — mobile e web usam nomes de coluna que não existem, e os dois desligam a checagem (`const { data }` sem `error`; `as unknown as AssessmentInsert`). A leitura devolve "sem avaliação" em vez de erro. Bloqueava a régua do body scan (`ADR-010`) | ✅ | [PRD](PRDs/physical-assessment-schema-drift.md) |
| 30 | Cadastro público cria especialista com `email_confirm: true` e `account_status: 'active'` — sem verificação de e-mail e pulando a aprovação que existe no `/admin` | 🟡 Média | [PRD](PRDs/api-security-hardening.md) |
| 41 | Os 44 alimentos de `foods` têm `category` NULL. Nenhuma busca por categoria funciona, e a curadoria nunca foi feita | 🟡 Média | [PRD](PRDs/ai-nutrition-coach.md) |
| 42 | ~~`DietDetailsHeader` derrubava a tela com plano sem período~~ — `format(new Date(""))` lança RangeError. **Resolvido**: utilitário de data + `0025` recusando nulo | ✅ | [PRD](PRDs/ai-nutrition-coach.md) |
| 43 | O cartão de refeições não soma calorias por refeição. O catálogo tem os macros; falta o cálculo por quantidade | 🟢 Baixa | [PRD](PRDs/ai-nutrition-coach.md) |
| 40 | O schema Drizzle está 4 colunas atrás do banco: `training_periodizations.level/duration_weeks` e `training_plans.duration_weeks/focus` vieram na `0004` e nunca entraram em `shared/src/database/schema/workouts.ts` | 🟡 Média | — |
| 35 | `useProgressionAnalysis` monta o objeto, itera e descarta o resultado (`void effectiveItem`) — a análise de progressão do treino nunca funcionou. `analyzeExerciseProgression` está pronta e testada; falta ligar o hook | 🟡 Média | [PRD](PRDs/workout-execution-consolidation.md) |
| 34 | ~~Especialista nascia sem `specialist_services`~~ — o cadastro reinseria o perfil que o trigger já criara, batia em chave duplicada e pulava os serviços; o autoconserto do `ensure-profile` falhava com 42P10 por falta de UNIQUE. **Resolvido** na `0022` + rota corrigida | ✅ | — |
| 31 | `students.service.ts` invoca a edge function `create-student`, que não existe em `supabase/functions/`. Ou o cadastro de aluno está quebrado, ou há código fora do controle de versão rodando com `service_role` | 🟡 Média | [PRD](PRDs/api-security-hardening.md) |
| 32 | ~~`loadStudentContext` faz `select("*")` na anamnese~~ — **resolvido**: lê só `responses` e usa seis campos nomeados | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 36 | ~~**O coach de IA prescreve às cegas**~~ — **resolvido**: a anamnese é lida de `responses`, a avaliação pelos nomes reais, e a leitura de periodizações pedia `goal` em vez de `objective` — três 42703 descartados no mesmo arquivo. Agora o erro sobe | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 37 | ~~`query_exercises` manda o modelo buscar `Ombros` e `Braços`~~ — **resolvido**: o parâmetro virou enum dos nove grupos reais, com normalização de acento e plural, e grupo desconhecido responde o que existe | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 38 | ~~`/api/ai/chat/[studentId]` não verifica `student_consents`~~ — **resolvido**: consentimento checado antes de o dado sair do banco, nome do titular fora do prompt, e a rota entrou no mapa da seção 10 | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 39 | ~~O estágio de criação de treino existe pela metade~~ — **resolvido**: `propose_workouts` guarda a proposta, o cartão renderiza e a aprovação salva a cópia guardada | ✅ | [PRD](PRDs/ai-coach-workout-stage.md) |
| 33 | ~~Gate do CI ficava verde com a suíte pulada~~ — `paths-filter` sem `pull-requests: read` falhava, os outputs saíam vazios e o `ci-success` lia "nada mudou". **Resolvido**: permissão + o gate exige que a detecção tenha passado | ✅ | [PRD](PRDs/api-security-hardening.md) |

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
