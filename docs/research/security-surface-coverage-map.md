# Mapa de cobertura de superfícies de segurança

> **Estado:** inventário de código em `2026-09-17`; não é uma certificação, um teste de intrusão nem uma declaração de que os controles estão ativos em preview ou produção.
>
> **Objetivo:** não perder uma superfície durante a futura auditoria defensiva. Cada linha identifica onde a evidência vive, o que foi observado no repositório e o que ainda precisa ser verificado fora dele. Não recomenda mudanças de implementação.

## Como controlar a cobertura

Este arquivo é o registro mestre da auditoria. Uma superfície só pode ser marcada como verificada quando houver:

1. evidência de código/configuração versionada;
2. evidência de comportamento no ambiente correspondente; e
3. um resultado, data, responsável e link para a execução anexados à issue de auditoria.

Legenda: **[E]** evidência versionada observada; **[?]** não verificável apenas pelo repositório; **[—]** ausente do escopo versionado ou não localizado. “Observado” não significa “eficaz em produção”.

Comandos-base (executar a partir da raiz, sem expor valores de ambiente):

```powershell
rg --files web/src/app | Select-String 'route\.ts$'
rg --files app/src/app | Select-String '(_layout|index|\+not-found)\.tsx$'
rg -n 'createClient|service_role|auth\.getUser|console\.|fetch\(' app web shared
npm run api:check-auth
npm run db:check-rls
npm run db:test-rls
```

## 1. Superfícies de cliente mobile (Expo/React Native)

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Aplicativo distribuído | `app/app.json`, `app/eas.json`, `app/index.js`, `app/src/app/**` | [E] Identificadores Android/iOS, esquema de deep link `elevapro`, builds development/preview/production e distribuição interna estão declarados. | [?] Configuração real de assinatura, canais EAS, versões publicadas, permissões efetivamente aprovadas nas lojas. `eas build:list --platform android`; consoles Apple/Google/EAS. |
| Rotas, navegação e telas | `app/src/app/_layout.tsx`, `app/src/app/(auth)/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(professional)/_layout.tsx`, `app/src/app/onboarding/_layout.tsx`, `app/src/app/+not-found.tsx` e demais `app/src/app/**/index.tsx` | [E] Há roteamento Expo Router e rotas por grupo. O inventário atual localiza 88 arquivos nessa árvore. | [?] Guardas de navegação em execução, retorno após deep link e se todas as telas protegem estado antes de renderizar. `rg -n 'router\.|Redirect|useAuth|accountType|ability' app/src/app`. |
| Sessão e credenciais no aparelho | `app/src/packages/supabase/client.ts`, `app/src/packages/supabase/getUserContextJWT.ts`, `app/src/modules/auth/**` | [E] Cliente Supabase persiste sessão em MMKV; `autoRefreshToken` e `persistSession` são habilitados no nativo. A justificativa no código registra que não é SecureStore. | [?] Criptografia efetiva de MMKV no APK, proteção contra dispositivo comprometido, limpeza no logout e rotação/revogação de sessão. Teste em aparelho e inspeção de configuração do módulo nativo. |
| Variáveis públicas do bundle | `app/.env.example`, `app/src/packages/supabase/client.ts`, `scripts/check-env-access.js`, `.github/workflows/release-app.yml` | [E] URL e chave anônima são lidas por nomes literais `EXPO_PUBLIC_*`; pipeline verifica presença/ambiente no EAS. | [?] Valores ativos no EAS e confirmação de que nenhum segredo foi marcado `EXPO_PUBLIC_*`. `eas env:list --environment production`; revisão do bundle somente em ambiente autorizado. |
| Permissões e dados do dispositivo | `app/app.json`, `app/src/shared/wearable/**`, `app/src/hooks/useHealthData.ts`, `app/src/services/healthSync.ts` | [E] Declara HealthKit/Health Connect, localização, atividade, microfone, câmera e notificações. Há limites de plausibilidade para medidas de saúde. | [?] Conjunto de permissões no binário publicado, solicitação just-in-time, revogação, tarefas de segundo plano e transmissão real. Capturar manifest/Info.plist do artefato e testes em dispositivo. |
| Câmera, fotos, voz, localização e WebView | `app/app.json`, `app/src/modules/body-scan/**`, `app/src/hooks/useVoiceInput.ts`, `app/src/**` que importam `expo-camera`, `expo-image-picker`, `expo-location`, `react-native-webview` | [E] Dependências e textos de permissão estão versionados; body scan e voz existem como superfícies de entrada. | [?] Toda origem de arquivo/URI, tamanho/MIME antes de upload, domínios permitidos no WebView e descarte de mídia local. `rg -n 'ImagePicker|Camera|WebView|Location|FileSystem|base64' app/src`. |
| Estado local não autenticado | `app/src/**/store/**`, `app/src/shared/design/temaStore.ts` | [E] Há Zustand persistido e MMKV, inclusive stores de nutrição e avaliação. | [?] Quais stores persistem PII/saúde, se são isolados por usuário e apagados no logout/troca de conta. `rg -n 'persist\(|createJSONStorage|createMMKV' app/src`. |
| Logging do cliente | `app/src/**` | [E] Há numerosas chamadas `console.log`, `console.warn` e `console.error`, inclusive em fluxos de autenticação, aluno, anamnese e avaliação. | [—] Nenhum redactor/telemetria estruturada central foi localizado nesta varredura. Inventariar payload por chamada e inspecionar logs de release. `rg -n 'console\.(log|warn|error)' app/src`. |

## 2. Aplicação web, renderização e borda Next.js

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Páginas expostas e Server Components | `web/src/app/**/page.tsx`, `web/src/app/layout.tsx`, `web/src/app/template.tsx`, `web/src/app/auth/**`, `web/src/app/dashboard/**`, `web/src/app/admin/**` | [E] App Router está em uso; há áreas auth, dashboard e admin. `createServerSupabaseClient` usa cookies. | [?] Matriz real de acesso para cada página/segmento e comportamento de URLs diretas. `rg --files web/src/app | Select-String 'page\.tsx$'`; testes autenticado/não autenticado por URL. |
| Middleware/proxy de borda | `web/middleware.ts`, `web/src/middleware.ts`, `web/src/proxy.ts` | [E] `web/src/proxy.ts` cria o cliente SSR e chama `supabase.auth.getUser()` para atualizar a sessão. | [?] Configuração de proxy/matcher e qualquer proteção fora do repositório; testar URL direta, sessão expirada e ambiente publicado. `rg --files web | Select-String 'middleware|proxy'`; painel Vercel. |
| Cabeçalhos HTTP, CSP, CORS, CSRF e cookies | `web/next.config.ts`, `web/vercel.json`, `web/src/lib/supabase/server.ts` | [E] `next.config.ts` restringe imagens remotas a `avatar.vercel.sh`; cliente SSR usa cookies do Next. | [—] Não foram localizados cabeçalhos de segurança, política CSP, configuração CORS ou defesa CSRF explícita nestes arquivos. Confirmar cabeçalhos reais por ambiente com `curl -I <URL>` e revisar cookies em navegador. |
| Cliente Supabase no browser | `web/src/packages/supabase/client.ts`, `web/src/lib/supabase/server.ts`, `web/src/shared/hooks/**` | [E] Há clientes browser/SSR com URL e chave anônima públicas; hooks consultam Supabase diretamente. | [?] RLS efetiva para cada consulta, cookies `Secure`/`HttpOnly`/`SameSite`, e diferença entre SSR/browser em produção. `rg -n 'from\(' web/src`; `npm run db:test-rls`. |
| Upload/download e exportações | `web/src/shared/utils/exportPeriodizationPDF.ts`, `web/src/shared/utils/exportDietPDF.ts`, `web/src/**` que referencia storage | [E] Exportação de PDF é uma superfície de cópia local de dados. Bucket `assessments` é definido em migration. | [?] Conteúdo dos PDFs, acesso a URLs assinadas e toda chamada de storage no browser. `rg -n 'storage\.from|getPublicUrl|createSignedUrl|jspdf' web app shared`. |
| Métricas de produto | `web/src/shared/hooks/useAnalytics.ts`, `web/src/app/admin/analytics/page.tsx` | [E] A tela admin calcula métricas diretamente de tabelas via cliente Supabase. | [?] RLS/capacidade admin real e se contagens revelam informação entre tenants. Não foi localizado SDK de telemetria externo nessa varredura. |
| Logging web | `web/src/app/api/**`, `web/src/**` | [E] Rotas usam `console.error`; algumas incluem identificador de especialista ou erro retornado pelo provedor. | [—] Não foi localizado logger central, redaction, tracing, correlação ou exportador de métricas. `rg -n 'console\.|Sentry|OpenTelemetry|otel|logger|trace' web/src`. |

## 3. Rotas HTTP do BFF (Next `/api`)

**Regra de inventário:** o repositório contém 27 `route.ts`. `scripts/check-api-auth.js` exige `@/lib/api-auth` para toda rota, exceto os dois cadastros explicitamente públicos; algumas rotas delegam para `web/src/modules/ai/services/rotaDeAprovacao.ts`. Isso prova presença de um padrão no código, não prova autorização correta em cada combinação de dados.

| Grupo de endpoints e caminhos | Observado no repositório | Estado/evidência a colher |
|---|---|---|
| Público: `web/src/app/api/auth/register/route.ts`; `web/src/app/api/auth/register/student/route.ts` | [E] POST sem autenticação, ambos chamam `supabaseAdmin.auth.admin.createUser`; validações manuais de campos, e senha mínima de 8 apenas na rota student. | [—] Nenhum rate limiter, anti-automação, validação de content type/schema, limite de tamanho ou proteção contra enumeração foi localizado nestas rotas. Testes HTTP de abuso devem registrar resultado e ambiente. |
| Perfil e alunos: `api/auth/ensure-profile/route.ts`; `api/students/route.ts`; `api/students/[id]/route.ts`; `api/students/[id]/assessments/route.ts`; `api/students/[id]/activities/route.ts` | [E] Há `authorizeUser`, `authorizeSpecialist` ou `authorizeLinkedSpecialist` e uso de `supabaseAdmin`; script e testes de auth existem. | [?] Cobertura de métodos HTTP, corpos inválidos, ownership de cada `id`, resposta de erro e rate limit por operação. `npm run api:check-auth`; `npm run api:test-auth` com ambiente de teste. |
| IA de treino: `api/ai/workout/negotiate/route.ts`; `api/ai/workout/batch/route.ts` | [E] Chamam `authorizeUser`; dependência Anthropic é server-side. | [—] Nenhum rate limiter/cota por usuário ou limite de custo localizado nesta varredura. Confirmar autenticação, payload e chamadas ao provedor em teste de rota. |
| IA nutricional: `api/ai/nutrition/recipe/route.ts`; `assistant/route.ts`; `adherence/route.ts`; `chat/[studentId]/route.ts`; `chat/[studentId]/save-plan/route.ts`; `chat/[studentId]/save-meals/route.ts` | [E] Há autorização por usuário/aluno com consentimento; rotas com `studentId` são superfície de autorização por objeto. | [?] Uso do esqueleto de aprovação, vínculo ativo para todo `studentId`, consentimento no dado de saída e logs enviados à Anthropic. `rg -n 'authorize|supabaseAdmin|Anthropic|console' web/src/app/api/ai/nutrition`. |
| IA coach/chat: `api/ai/chat/[studentId]/route.ts`; `sessions/route.ts`; `save-workouts/route.ts`; `save-periodization/route.ts`; `api/ai/student/coach/session/route.ts`; `message/route.ts`; `save-plan/route.ts`; `api/ai/student/nutribot/route.ts`; `sugestoes/route.ts` | [E] Comentários e `api-auth` reconhecem explicitamente que `service_role` ignora RLS; testes de rotas IA estão versionados. | [?] Restrições de sessão/idempotência, streaming, propriedade de `studentId`/`sessionId`, limites de payload e de frequência. `rg --files web/src/app/api/ai web/src/app/api/ai/__tests__`. |
| IA de imagem/corpo: `api/ai/body-scan/route.ts`; `eligibility/route.ts`; `api/ai/student/scan-food/route.ts` | [E] Usam `authorizeStudent` ou `authorizeStudentWithHealthConsent`; body scan exige ao menos uma imagem. | [?] Limites de bytes/decodificação, remoção da imagem após processamento, consentimento e transmissão de mídia a terceiro. `rg -n 'base64|image|consent|Anthropic|console' web/src/app/api/ai/body-scan web/src/app/api/ai/student/scan-food`. |
| Autorização comum | `web/src/lib/api-auth.ts`, `web/src/lib/supabase-admin.ts`, `web/src/lib/supabase-titular.ts`, `web/src/lib/__tests__/api-auth.test.ts`, `scripts/check-api-auth.js`, `scripts/test-api-auth.mjs` | [E] Bearer token é validado via Supabase; papel vem de `profiles`, vínculo ativo é consultado por `supabaseAdmin`, consentimento consulta como titular. `service_role` é deliberadamente criado sem sessão persistente. | [?] Chaves válidas, indisponibilidade do Auth/Supabase, cobertura de testes de cada rota e ausência de caminhos alternativos. |

## 4. Dados, Supabase e armazenamento

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Schema e migrations | `supabase/migrations/0000_wakeful_mimic.sql` até `0059_o_placar_da_semana.sql`; `shared/src/database/schema/**`; `shared/src/database/database.types.ts` | [E] Schema é versionado por migrations e tipos gerados; scripts conferem referências, colunas e tipos. | [?] Divergência entre migration, banco preview e banco produção; ownership/ACLs criadas fora da migration. `npx supabase migration list`; `npm run db:check-types`. |
| RLS e grants | `supabase/migrations/0013_nutrition_rls.sql`, `0016_rls_core_access.sql`–`0019_rls_gamification.sql`, `0020_api_role_grants.sql`, migrations posteriores; `scripts/check-rls.js`, `scripts/verify-rls.sql`, `scripts/test-rls-isolation.mjs` | [E] Migrations habilitam RLS/políticas; authenticated/service_role/anon grants estão explicitados; CI roda verificação real remota após migration. | [?] Políticas e grants efetivos nos projetos remotos, roles privilegiados, objetos não cobertos e bypass via RPC/function. `psql ... -f scripts/verify-rls.sql`; `npm run db:test-rls`. |
| Funções, triggers e SECURITY DEFINER | `supabase/migrations/**`, em particular `0021_signup_default_and_assessments_bucket.sql`; ADR `0014-rls-helpers-security-definer.md` | [E] Há funções/triggers SQL e ao menos `handle_new_user()` usa `SECURITY DEFINER` com `search_path = public`. | [?] Inventário completo de funções, ownership, grants `EXECUTE`, `search_path` e testes de escalada. `rg -n 'CREATE( OR REPLACE)? FUNCTION|SECURITY DEFINER|CREATE TRIGGER|GRANT EXECUTE' supabase/migrations`. |
| Dados sensíveis de saúde | `physical_assessments`, `student_anamnesis`, `workout_sessions`, `diet_logs`, `health_daily_metrics` em migrations/schema; `docs/LGPD_COMPLIANCE.md` | [E] O projeto identifica tabelas sensíveis, RLS e consentimentos em migrations/serviços. | [?] Inventário real de dados, retenção, exclusão/exportação, acesso administrativo e cópias em backup. A revisão LGPD deve registrar evidências separadamente. |
| Storage Supabase | `supabase/migrations/0021_signup_default_and_assessments_bucket.sql`; `shared/src/**` que referencia storage | [E] Bucket privado `assessments`, 10 MB e MIME JPEG/PNG/WebP; políticas usam primeiro segmento do caminho e vínculo especialista. | [?] Existência/configuração do bucket remoto, objetos legados, URLs assinadas, lifecycle/retention e demais buckets. `supabase storage ls` (ambiente autorizado); consulta às políticas `storage.objects`. |
| Auth Supabase | `supabase/config.toml`, migrations com `auth.users`, `app/src/packages/supabase/client.ts`, `web/src/lib/api-auth.ts` | [E] Config local tem refresh-token rotation, expiração JWT 3600, anon sign-in desativado; login/registro usam Supabase Auth. | [?] Configuração de produção: MFA, providers, SMTP, confirmação de e-mail, política de senha, redirect URLs e hooks. Não inferir produção do `config.toml` local. |
| Edge Functions e Realtime | `supabase/functions/`, `supabase/config.toml` | [—] Nenhum diretório `supabase/functions/` foi localizado; Realtime está habilitado no config local. | [?] Funções/realtime configurados exclusivamente no painel, canais publicados e políticas de replicação. `rg --files supabase`; inspeção de projeto Supabase. |
| Backups, PITR e restauração | arquivos de infra e documentação | [—] Não foi localizada configuração versionada nem evidência de exercício de restore. | [?] Plano/retensão de backup, RPO/RTO, último restore e acesso ao backup: somente painel e evidência operacional podem responder. |

## 5. Terceiros, saída de dados e integrações

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Anthropic | `web/package.json`, `web/src/modules/ai/providers/anthropic.provider.ts`, `web/src/modules/ai/ai.config.ts`, `web/src/app/api/ai/**`, `web/.env.example` | [E] SDK Anthropic e `ANTHROPIC_API_KEY` server-side estão declarados; várias rotas IA enviam entradas ao provedor. | [?] Projeto/chave ativos, retenção/uso contratual, dados e metadados efetivamente enviados, quotas e logs do provedor. |
| Supabase | `supabase/**`, `app/src/packages/supabase/**`, `web/src/lib/supabase*.ts`, `web/src/packages/supabase/**` | [E] Banco, Auth, Storage e API são integrações centrais. | [?] Organização, regiões, membros, MFA, chaves, logs, backups e configuração remota. |
| Saúde do dispositivo | `app/app.json`, `app/src/shared/wearable/healthKit.ts`, `healthConnect.ts`, `permissions.ts`, `refresh.ts` | [E] HealthKit e Health Connect são fontes de dados; há adaptação/validação local. | [?] Dados autorizados no sistema operacional, comportamento de background e caminho completo de transmissão. |
| EAS/Expo e lojas | `app/eas.json`, `.github/workflows/release-app.yml`, `app/app.json` | [E] EAS cria builds e submete Android internal track por tag. | [?] Controle de acesso a Expo/EAS/Play Console, credenciais de signing e histórico de releases. |
| Vercel | `web/vercel.json`, `.github/workflows/release-web.yml`, `web/next.config.ts` | [E] Web é configurado como Next.js; workflow consulta/deploya ambientes Vercel e separa variáveis públicas/segredos em comentários e validações. | [?] Projeto, domínio, RBAC, protection, logs, headers, ambiente e secrets reais. |
| Integrações comerciais/telemetria | `package.json`, `app/package.json`, `web/package.json`, `rg` de SDKs | [E] Não foram localizados SDKs de Stripe/Asaas/Sentry/PostHog/Plausible nesta varredura; `useAnalytics` é métrica interna via Supabase. | [?] Integrações configuradas fora do código, webhooks externos e contas conectadas. Verificar inventário de fornecedores/ambientes. |

## 6. Segredos, repositório e cadeia de entrega

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Arquivos de ambiente | `.env.example`, `app/.env.example`, `web/.env.example`, `.gitignore`, `scripts/sync-env.js` | [E] Exemplos são versionados; `.env.development`, `.env.preview`, `.env.production` e `*.local` são ignorados. `sync-env` mapeia variáveis públicas e server-side. | [?] Segredos presentes no histórico, estações de trabalho, CI, Vercel/EAS/Supabase e política de rotação. Não imprimir arquivos `.env*` locais em evidências. |
| Segredos server-side | `web/src/lib/supabase-admin.ts`, `web/.env.example`, `.github/workflows/release-web.yml` | [E] `SUPABASE_SERVICE_ROLE_KEY` e `ANTHROPIC_API_KEY` são esperados sem prefixo público; admin client alerta se valor faltar. | [?] Escopo, rotação, acesso mínimo e se logs/builds nunca recebem os valores. Revisar configurações de secrets na plataforma. |
| CI | `.github/workflows/ci.yml` | [E] CI roda lint, tipos, testes, checks de RLS/API auth/env, Supabase local e checks de banco. Artifact de cobertura do app retém 7 dias. | [?] Proteção de branch exigindo estes checks, permissões reais de `GITHUB_TOKEN`, execução em forks e retenção/acesso a artifacts/logs. |
| Deploy web | `.github/workflows/release-web.yml`, `web/vercel.json` | [E] Workflow de release e validações de variáveis foram localizados. | [?] Proteções de environment, aprovações de produção, domínio e trilha de deploys no GitHub/Vercel. |
| Deploy mobile | `.github/workflows/release-app.yml`, `app/eas.json` | [E] Workflow valida, cria preview/produção e envia por tag; usa `EXPO_TOKEN` em GitHub environment. | [?] Aprovações, RBAC EAS, credenciais Android e artefatos publicados. |
| Deploy de banco | `.github/workflows/supabase-migrations.yml`, `scripts/verify-rls.sql`, `supabase/seed.sql` | [E] Push forward-only usa environment preview/production, secret `SUPABASE_DB_URL`, serializa execuções e roda verificação de RLS remota. | [?] Revisão/aprovação do environment de produção, procedência da connection string e logs de cada migração. |
| Dependências | `package-lock.json`, `app/package-lock.json`, `web/package-lock.json`, `.github/dependabot.yml` | [E] Lockfiles existem; Dependabot cobre raiz, app e GitHub Actions. Configuração mostrada não possui entrada npm para `/web`. | [?] Alertas de vulnerabilidade, SCA/SBOM, resposta a CVE e dependências transitivas em produção. |
| Revisão e governança de código | `.github/CODEOWNERS`, `.github/pull_request_template.md`, `AGENTS.md`, `CLAUDE.md`, `docs/adr/**` | [E] CODEOWNERS aponta um responsável; processos e ADRs estão versionados. | [?] Branch protection, exigência real de aprovação, regras de merge, acesso de colaboradores e audit log GitHub. |

## 7. Observabilidade, auditoria operacional e resposta

| Cobertura | Caminhos exatos | Observado no repositório | Estado/evidência a colher |
|---|---|---|---|
| Logs de aplicação | `app/src/**`, `web/src/**`, `web/src/app/api/**` | [E] Logging ad hoc por `console.*` existe em mobile e web. | [—] Não foi localizado schema de evento, redaction, correlação, destino, retenção, acesso ou alerta. A revisão deve separar conteúdo de cada log de sua mera existência. |
| Eventos auditáveis append-only | `private.security_audit_events`, `public.record_security_audit_event`, `private.audit_student_consent_change`, `private.audit_student_specialist_link_change`, `private.audit_profile_authorization_change`, `private.purge_expired_security_audit_events`, `web/src/lib/security-audit.ts`, `web/src/lib/trace.ts`, `scripts/verify-rls.sql` | [E] A tabela privada tem RLS; o BFF só executa a RPC append-only com contrato mínimo e o verificador prova ausência de DML/leitura pelos papéis da aplicação. Cadastro, mudanças de consentimento, papel/status de conta e concessão/revogação de vínculo geram eventos; os últimos três nascem por trigger na mesma transação RLS. `pg_cron` remove os vencidos diariamente. Bloqueios de taxa continuam agregados no limitador, para não criar uma trilha amplificável por abuso. | [?] Leitor para encarregado/auditor, exportação independente, legal hold e amostra de investigação ainda não existem; a execução do job deve ser conferida em `cron.job_run_details` após deploy. |
| Métricas, traces e alertas | `web/src/shared/hooks/useAnalytics.ts`, `web/src/app/admin/analytics/page.tsx`, configs de deploy | [E] Métricas de produto internas existem. | [—] Nenhum exporter de métricas, tracing distribuído, regra de alerta, SLO ou dashboard operacional foi localizado. |
| Incidentes e recuperação | `docs/research/security-and-auditability-baseline.md`, `docs/LGPD_COMPLIANCE.md`, documentação operacional | [E] Há baseline/documentação de referência. | [?] Runbook executável, escalonamento, comunicação, simulação, evidência de exercício e prazos reais; procurar em repositório e ferramentas operacionais. |
| Evidências de auditoria | GitHub Actions, Supabase, Vercel, EAS, GitHub | [E] Workflows escrevem summaries e retêm ao menos cobertura do app por 7 dias. | [?] Centralização, integridade, retenção, controle de leitura e exportação das evidências. |

## 8. Itens fora do repositório que impedem uma conclusão

Os seguintes itens são superfícies do sistema, mas não podem ser avaliados pela leitura do Git:

- configurações, chaves, usuários, MFA, auditoria e logs dos projetos Supabase, Vercel, EAS/Expo, GitHub e lojas;
- DNS, TLS, WAF/CDN, domínio, e cabeçalhos efetivamente servidos;
- proteção de branch/environments, aprovação de produção e registros de deploy;
- configuração de Auth de produção (SMTP, redirect URLs, MFA, senha, provedores, hooks);
- dados existentes, objetos de storage, backups/PITR e evidência de restauração;
- artefatos APK/IPA publicados, assinatura, manifest final e comportamento em dispositivo;
- contratos, retenção e configurações de terceiros que recebem dados, especialmente Anthropic;
- registros reais de segurança, alertas, incidentes e prova de que nenhuma informação sensível chega aos logs.

## Critério de encerramento deste mapa

Este mapa está completo como **lista de superfícies identificadas no repositório** quando toda alteração que criar rota, permissão, tabela, função, bucket, integração, workflow, variável de ambiente ou saída de dado adicionar/atualizar sua linha. Ele só sustenta a afirmação de que um controle é auditável depois que a coluna “Estado/evidência a colher” tiver prova operacional anexada; até lá, cada “E” significa apenas “há código versionado”.
