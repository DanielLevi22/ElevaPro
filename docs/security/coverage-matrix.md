# Matriz de cobertura de segurança e auditabilidade

> Registro de controle da auditoria. A fonte de superfície e caminhos é
> [`../research/security-surface-coverage-map.md`](../research/security-surface-coverage-map.md).
> Status permitido: `não verificado` · `verificado` · `risco-aceito` · `fora-de-escopo`.
> Somente `verificado` precisa de evidência reexecutável; os demais precisam de motivo,
> dono e data de revisão.

## Como a matriz impede omissões

Uma rodada abre com todos os IDs abaixo em `não verificado`. Não se remove uma linha porque
o componente ainda não está em uso: use `fora-de-escopo`, com prova de ausência e data para
rever. Todo novo endpoint, bucket, segredo, integração, job, tabela ou cliente recebe ID
antes do merge. O responsável pela rodada confere que os totais do inventário correspondem
ao repositório antes de declarar cobertura.

| ID | Superfície / limite | Estado | Evidência exigida | Frequência |
| --- | --- | --- | --- | --- |
| IDN-01 | Cadastro, convite, login, recuperação, sessão e MFA | não verificado | configuração Auth + teste de abuso/sessão | por release e trimestral |
| IDN-02 | Papéis `admin`, `specialist`, `student`/legado `member` | não verificado | fonte da verdade, CASL, RLS e teste de escalada | por mudança |
| IDN-03 | Vínculo `student_specialists` e masquerade | não verificado | RLS + BFF + teste vinculado/não vinculado | por mudança |
| WEB-01 | Web pública, layout, proxy e cookies | não verificado | `web/src/proxy.ts`, headers/CSP/CORS e teste de sessão | por release |
| WEB-02 | Páginas autenticadas e Server Components | não verificado | `page-auth`, serviços e teste de acesso direto | por mudança |
| API-01 | As 27 rotas `web/src/app/api/**` | não verificado | inventário de rota, schema, autorização, rate limit e teste | por rota/mudança |
| API-02 | Rotas públicas de cadastro | não verificado | validação, anti-enumeração, limite e teste de abuso | por mudança |
| API-03 | Rotas com `service_role` | não verificado | `api-auth`, autorização específica e teste negativo | por rota/mudança |
| API-04 | SSE/streaming, erros e respostas | não verificado | limite, cancelamento, redaction e teste de payload | por mudança |
| MOB-01 | App Expo, armazenamento de sessão e deep links | não verificado | config, SecureStore/MMKV, build e teste em aparelho | por release |
| MOB-02 | Chamadas diretas Supabase e BFF | não verificado | cliente, token, pinagem/HTTPS aplicável e teste de isolamento | por mudança |
| MOB-03 | Câmera, Health Connect/HealthKit, localização e mídia local | não verificado | permissão, minimização e teste de ausência de persistência | por mudança |
| DB-01 | Oito domínios Drizzle: auth, students, workouts, nutrition, assessment, health, gamification, AI | não verificado | schema, migration, RLS, grants e `verify-rls.sql` | por migration |
| DB-02 | RPCs, triggers, views e funções `SECURITY DEFINER` | não verificado | proprietário, `search_path`, grants e teste de privilégio | por migration |
| DB-03 | PostgREST, Realtime e GraphQL expostos | não verificado | schemas expostos, grants e teste de acesso | por release |
| STO-01 | Buckets, objetos, URL assinada, upload e exclusão | não verificado | políticas Storage, tamanho/tipo e teste de outra conta | por mudança |
| AI-01 | Anthropic, prompts, respostas, sessão e propostas | não verificado | BFF, consentimento, minimização, retenção e teste de prompt/payload | por mudança |
| INT-01 | Health Connect, HealthKit e dados de dispositivo | não verificado | consentimento, capacidade, origem e descarte local | por mudança |
| INT-02 | E-mail, cobrança, webhooks e futuros operadores | não verificado | DPA, assinatura, idempotência, segredo e teste de replay | antes de ativar |
| SEC-01 | Segredos, variáveis, chaves de API e rotação | não verificado | `.env.example`, Vercel/EAS/GitHub, scan e simulação de revogação | por release |
| SEC-02 | Dependências, lockfiles, imagens e ações GitHub | não verificado | inventário/SBOM, versões fixadas e política de vulnerabilidade | semanal e por release |
| CICD-01 | CI, branch protection e artefatos | não verificado | workflows, permissões mínimas, required checks e retenção | mensal |
| CICD-02 | Deploy Vercel, migrations Supabase e build/submit EAS | não verificado | ambientes segregados, aprovação, smoke test e rollback | por release |
| OBS-01 | Logs de app, BFF, banco, mobile e crash reporting | não verificado | política de redaction + teste que proíbe dado sensível | por mudança |
| OBS-02 | Métricas, traces, alertas e SLOs | não verificado | catálogo, labels sem PII, alerta testado e `trace_id` | mensal |
| AUD-01 | Trilha append-only de segurança e privacidade | não verificado | contrato do evento, RLS, retenção e consulta de investigação | por release |
| GOV-01 | RoPA, consentimento, direitos do titular, retenção e RIPD | não verificado | `LGPD_COMPLIANCE`, registros e amostra de atendimento | trimestral |
| OPS-01 | Backup, restauração, DR e continuidade | não verificado | relatório de restore, RPO/RTO e acesso restrito | trimestral |
| OPS-02 | Incidente, contenção, notificação e pós-mortem | não verificado | runbook, exercício e registro de decisão | semestral |
| ADM-01 | Contas e permissões GitHub, Supabase, Vercel, EAS e Anthropic | não verificado | revisão de acesso privilegiado e MFA | trimestral |

## Rodada #322 — evidência coletada, revisão pendente

Data 2026-09-18, branch `feature/322-fundacao-de-seguranca-auditavel-limites-redactio`.
Nenhuma linha acima muda de estado: toda linha tocada ainda tem lacuna, e `verificado` exige
revisor humano, que está pendente. A evidência abaixo é reexecutável e fica anexada à
revisão. Os comandos do banco rodam contra o Supabase local ou, pelo workflow, contra
o preview.

| ID | Evidência reexecutável (positivo e negativo) | O que falta para `verificado` |
| --- | --- | --- |
| API-01 | As 20 rotas de `/api/ai/**` passam pelo `withAiRoute`: limite de corpo e rate limit durável antes do handler; usuário autenticado é limitado pelo pseudônimo do ator e tentativa anônima pela origem (`web/src/lib/__tests__/ai-route.test.ts`, `rate-limit.test.ts`, `request-body-limit.test.ts`) | As outras 7 rotas não têm limite; falta inventário de schema e autorização por rota |
| API-02 | Cadastro: corpo acima de 32 KiB → 413 antes do Auth e 6ª tentativa por origem → 429 (`web/src/app/api/auth/__tests__/register.test.ts`, `web/src/lib/__tests__/rate-limit.test.ts`); política de senha em `shared/src/auth/password-policy` | **Enumeração aberta:** a resposta diz que o e-mail já tem conta; o limite de 5/h só atenua. Decisão de UX pendente |
| API-04 | Erro de banco e de modelo sai do BFF só como `name`/`code` (`logger.test.ts`, "não deixa e-mail escapar pelo details") | Limites e cancelamento do SSE sem teste; CSP/HSTS ausentes em `web/next.config.ts` |
| DB-02 | `scripts/verify-rls.sql`: funções de trigger/event trigger sem `EXECUTE` para papéis da aplicação, `search_path` fixo e RPCs de limite/trilha só para `service_role` (`0060`, `0061`, `0066`, `0070`) | Inventário completo de funções e ownership |
| AUD-01 | `verify-rls.sql`: cliente não lê a trilha, BFF sem DML, retenção de 365 dias por `pg_cron`, eventos de consentimento/vínculo/papel nascem no banco, pseudônimo com chave do Vault e nenhum UUID de pessoa em `resource_id`. Prova negativa feita em 2026-09-18: hash sem chave, RPC aceitando UUID e trigger gravando UUID fazem o script falhar | Consulta de investigação documentada; eventos de MFA ficam no Auth Audit Log do Supabase (#323) |
| OBS-01 | `web/src/lib/logger.ts` redige credencial, e-mail em qualquer valor, medidas e corpo de erro do banco; as rotas da API não usam mais `console.*` (`logger.test.ts`) | Logs de `web/src` fora da API, mobile e crash reporting |
| OBS-02 | `rate_limit.decision` emite política, `allowed`/`denied`, saldo e `trace_id`, sem origem ou dados pessoais (`rate-limit.test.ts`) | Exportador/alerta operacional fora deste corte |

Não entraram neste corte e continuam abertos os demais IDs não verificados da matriz.

## Evidência mínima por estado

`verificado` exige caminho/URL interno, data, revisor, versão/commit e resultado de um teste
positivo e negativo quando houver autorização. `risco-aceito` exige ameaça, impacto,
compensação, dono e prazo. Nenhum desses textos pode trazer segredo, e-mail, token, IP ou
dado de saúde.

## Definição de concluído da primeira rodada

1. Confirmar contagem de rotas, tabelas, buckets, funções, jobs e integrações contra o
   inventário.
2. Converter toda linha não verificada em evidência ou issue priorizada.
3. Executar testes de isolamento, restauração e incidente controlado; registrar resultado.
4. Revisar a matriz por duas pessoas: engenharia e responsável por dados/segurança.
5. Publicar apenas o escopo, data e limitações da rodada — não o detalhe operacional.
