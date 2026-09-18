# Segurança e auditabilidade: baseline para o Eleva Pro

> Pesquisa feita em 17/09/2026 para orientar ADRs e backlog. O Eleva Pro trata dados de saúde e deve ser projetado como SaaS de bem-estar **com dado pessoal sensível**, não como prontuário nem sistema de diagnóstico. Isto é uma base técnica e de governança, não parecer jurídico nem certificação.

## Conclusão executiva

O produto precisa demonstrar, e não só alegar, que cada acesso e tratamento de dado tem finalidade, base legal, autorização mínima e evidência preservada. Para isso, a arquitetura deve combinar: (1) inventário e ciclo de vida do dado; (2) autenticação forte e autorização no banco; (3) proteção de segredos e das superfícies web/mobile; (4) trilha de auditoria de negócio, autenticação e operação; e (5) resposta testada a incidentes.

Dados de avaliações físicas, anamnese, sessões de treino, dieta e métricas de saúde são dados pessoais sensíveis por se referirem à saúde. A LGPD exige base do art. 11; para consentimento, ele precisa ser específico e destacado para finalidades específicas. Não presumir que a hipótese de "tutela da saúde" se aplique a todo produto de personal trainer: ela é restrita pela lei a profissionais/serviços de saúde/autoridade sanitária. [Lei nº 13.709/2018, arts. 5º, II; 11](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

## Obrigações e evidências LGPD

| Controle | Regra operacional e evidência auditável |
| --- | --- |
| Finalidade e minimização | Manter inventário por dado: finalidade, titular, base legal, origem, destinatários, retenção e responsável. Coletar somente o necessário; qualquer nova finalidade ou compartilhamento exige revisão. A LGPD determina finalidade, necessidade, transparência, segurança, prevenção e prestação de contas. [LGPD, art. 6º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Base legal e consentimento | Registrar versão do aviso, finalidade granular, instante, ator, canal e revogação. Consentimento genérico é nulo; o controlador deve provar que o obteve. [LGPD, art. 8º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Registro de tratamento | Manter o ROPA/inventário e responsáveis controlador, operadores e encarregado; publicar o canal de contato do encarregado quando aplicável. Controlador e operador devem manter registro das operações. [LGPD, arts. 37–41](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Direitos do titular | Fluxo autenticado para acesso/exportação, correção, eliminação/bloqueio e revogação; fila de solicitações com prazo, decisão e prova de atendimento. A declaração completa de acesso tem prazo de até 15 dias e deve informar origem, critérios e finalidade. [LGPD, arts. 18–19](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Retenção e descarte | Definir prazo por categoria e executar eliminação verificável ao terminar o tratamento, salvo exceções legais do art. 16. Backups, logs e cópias de suporte devem ter prazo próprio e restauração controlada. [LGPD, art. 16](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Privacidade desde o desenho | Avaliação de risco/LGPD antes de nova tabela, integração, IA, dado de saúde ou transferência internacional; produzir RIPD quando o risco justificar ou a ANPD requisitar. As medidas técnicas e administrativas valem desde a concepção até a execução. [LGPD, arts. 46 e 49](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| Incidentes | Runbook 24/7: detectar, conter, preservar evidências, avaliar risco, comunicar e corrigir. Incidente confirmado com dados pessoais e risco/dano relevante deve ser comunicado pelo controlador à ANPD e titulares em **3 dias úteis**; o operador informa sem demora injustificada e fornece os elementos. Manter registro dos incidentes por pelo menos cinco anos. [ANPD, Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis) |

## Baseline técnico de segurança

Adotar o [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) como catálogo verificável para web/API e atingir ao menos o nível 2 para funcionalidades autenticadas e dados sensíveis. O requisito entra na definição de pronto: ameaça relevante, teste automatizável quando possível e evidência de revisão.

1. **Identidade.** Convite por e-mail de uso único e duração curta; o aluno define a senha. Confirmar e-mail, proteger recuperação de conta, limitar tentativas e registrar êxitos/falhas sem registrar senha, token, cookie ou código MFA. Exigir MFA para `admin`, para especialistas que veem dados de alunos e para ações sensíveis (alterar e-mail, exportar, apagar, mudar cobrança ou papel). Supabase expõe `aal` no JWT para que regras de frontend, backend e RLS exijam `aal2`. [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
2. **Autorização em profundidade.** CASL melhora a UI, mas não autoriza dado. Habilitar RLS e configurar *grants* mínimos em **toda** tabela exposta; testar explicitamente que aluno, especialista e admin não leem/escrevem linhas alheias. RLS é avaliado em cada acesso; `service_role` a ignora e fica exclusivamente em ambiente servidor. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
3. **Dados e segredos.** Nunca expor `service_role`, chaves Stripe/Asaas, segredos de webhook ou tokens de terceiros no app, web ou logs. Usar variáveis de ambiente do servidor/segredo gerenciado, rotação, menor privilégio e revogação. Criptografar tráfego (TLS) e usar armazenamento seguro do sistema operacional para tokens no mobile; não pôr dados de saúde em analytics, URL, crash reports ou texto de log.
4. **Web, API e integrações.** Validar autorização e esquema no servidor para cada mutação; proteção contra CSRF onde há cookie, *allowlist* de redirects, CORS mínimo, cabeçalhos de segurança/CSP, rate limit e idempotência para webhooks. Validar assinatura e período de tolerância de cada webhook antes de persistir; separar chaves/ambientes e registrar apenas identificadores não sensíveis.
5. **Entrega e operação.** Revisão de dependências e segredos em CI, correção por severidade/SLA, branch protegida, revisão humana para migração/RLS e *rollback* testado. Backups criptografados, teste periódico de restauração e acesso administrativo separado. O guia da ANPD recomenda que boas práticas sejam complementadas conforme o risco, não tratadas como teto. [Guia de Segurança da Informação da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf)

## Regras da trilha de auditoria

"Log técnico" não substitui "evento de auditoria". Criar uma trilha de negócio append-only para ações de alto impacto e correlacioná-la com logs técnicos.

### Eventos obrigatórios

- autenticação: convite emitido/aceito/expirado, login/erro, reset de senha, sessão revogada, MFA inscrito/desinscrito/desafiado;
- autorização: concessão/revogação de papel, vínculo especialista–aluno, elevação administrativa e negação de acesso relevante;
- dado sensível: criação, leitura/exportação, alteração, exclusão/anonimização, compartilhamento e mudança de consentimento/finalidade;
- administração: alteração de RLS/migração, configuração de integração, segredo rotacionado (sem o valor), configuração de retenção e mudança de auditoria;
- segurança: webhook inválido, anomalia de taxa, alteração de dispositivo, suspeita/confirmada violação e todas as decisões do runbook.

### Contrato mínimo do evento

Cada evento contém `event_id` imutável, `occurred_at` em UTC, `event_type` versionado, resultado, ator (usuário ou serviço), papel/sessão, titular afetado quando distinto, recurso e identificador, ação, motivo/correlação, origem (app/web/API/job), IP/cliente somente quando proporcional, `trace_id` e uma referência de versão da política/consentimento. Guardar **metadados e diffs mínimos**, nunca a anamnese, métricas de saúde, senha, token, cabeçalho `Authorization` ou corpo inteiro de requisição.

O modelo de logs do OpenTelemetry prevê timestamp, severidade, corpo, atributos e correlação por `TraceId`/`SpanId`; o padrão W3C define `traceparent` com versão, trace-id, parent-id e flags. [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) · [W3C Trace Context](https://www.w3.org/TR/trace-context/)

### Integridade, acesso e revisão

- Proibir `UPDATE` e `DELETE` da trilha para papéis da aplicação; inserir somente via função controlada, com `SECURITY DEFINER` cuidadosamente limitada, ou serviço de auditoria. Administradores comuns não podem apagar a própria evidência.
- Exportar/replicar eventos para destino com retenção e controles independentes do banco transacional; restringir leitura a segurança/encarregado e auditar a própria leitura.
- Registrar o relógio do servidor; usar IDs ordenáveis e correlação para reconstruir sequência, sem confiar no horário do cliente.
- Definir retenção justificada, *legal hold*, destruição verificável e revisão periódica de acessos à trilha. Todo requisito de auditoria precisa de dono, teste de consulta e amostra de evidência revisada.

## Uso correto dos recursos Supabase

Supabase Auth Audit Logs cobre eventos de autenticação, inclusive login, recuperação, senha, token e MFA, e pode ser armazenado em `auth.audit_log_entries`; isso não cobre as ações de negócio acima. [Supabase Auth Audit Logs](https://supabase.com/docs/guides/auth/audit-logs) Platform Audit Logs registram ações no dashboard/API da organização e podem ser enviados por *drain*, mas dependem de plano e não substituem a trilha do produto. [Supabase Platform Audit Logs](https://supabase.com/docs/guides/security/platform-audit-logs)

Habilitar e reter, conforme política, logs de Auth, API, Storage, Edge Functions e Postgres. Para evidência de acesso ao banco, ativar `pgAudit` seletivamente por objeto/papel e evitar capturar todas as instruções, pois elas podem conter valores sensíveis e gerar ruído. [Supabase Configure Logging](https://supabase.com/docs/guides/observability/configure-logging) Para cada tabela com RLS, a mudança inclui teste negativo e positivo no `supabase test db`, como orienta a documentação. [Supabase RLS testing](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Ordem recomendada para os ADRs/backlog

1. Aprovar modelo de dados/classificação, bases legais, retenção, DPA de operadores e fluxo de direitos/incidentes.
2. Fechar superfície de acesso: convite, confirmação, MFA/`aal2`, RLS+grants e testes de isolamento.
3. Implementar contrato append-only de auditoria e exportação/retenção; habilitar os logs Supabase necessários.
4. Implantar observabilidade correlacionada, alertas e exercícios de incidente/restauração.
5. Tornar ASVS, revisão LGPD e teste de RLS gates obrigatórios de entrega.

## Fontes primárias

- [Lei nº 13.709/2018 — LGPD (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Regulamento e orientações de comunicação de incidente](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- [ANPD — Guia Orientativo sobre Segurança da Informação](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Auth Audit Logs](https://supabase.com/docs/guides/auth/audit-logs), [Platform Audit Logs](https://supabase.com/docs/guides/security/platform-audit-logs) e [Configure logging](https://supabase.com/docs/guides/observability/configure-logging)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) e [W3C Trace Context](https://www.w3.org/TR/trace-context/)
