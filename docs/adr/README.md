# Decisions — Architecture Decision Records (ADRs)

> Registra **por que** cada decisão estrutural foi tomada.
> Não documenta o que foi construído (→ o código) nem o que será construído
> (→ as issues do GitHub, ver [ADR-0013](0013-specs-vivem-no-issue-tracker.md)).

---

## Como usar

- **Antes de questionar uma decisão**, leia o ADR — provavelmente o motivo está lá.
- **Ao tomar nova decisão estrutural**, crie um ADR usando o `_template.md`.
- **Status possíveis:** `accepted` · `superseded` · `deprecated` · `proposed`

---

## Índice

### Infraestrutura e ambiente

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0002](0002-flat-monorepo.md) | Flat Monorepo com /packages/ na raiz (sem Turborepo) | accepted |
| [ADR-0003](0003-environment-strategy.md) | Estratégia de ambientes Local → Preview → Production | accepted |
| [ADR-0009](0009-migration-strategy.md) | Migrations aplicadas pelo pipeline, não à mão | accepted |
| [ADR-0019](0019-coluna-substituida-sai-na-mesma-migration.md) | Coluna substituída sai na mesma migration, não é deprecada | accepted |

### Arquitetura web

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0001](0001-keep-nextjs.md) | Manter Next.js como BFF (não migrar para Vite) | accepted |
| [ADR-0017](0017-web-informa-mobile-executa.md) | Web informa, mobile executa | accepted |
| [ADR-0026](0026-o-cardio-e-atividade-e-o-relogio-e-uma-fonte-so.md) | O cardio é atividade, a prescrição é opcional, e o relógio é uma fonte só | proposed |
| [ADR-0029](0029-a-prontidao-e-gravada-com-a-versao-da-regra.md) | A prontidão do dia é gravada, com a versão da regra que a calculou | accepted |
| [ADR-0030](0030-a-medida-declarada-mora-na-mesma-tabela-com-a-origem.md) | A medida declarada mora na mesma tabela da avaliação, com a origem ao lado | accepted |
| [ADR-0025](0025-a-cor-do-mobile-vem-do-design-e-a-superficie-e-ios.md) | A cor do mobile vem do design, e a superfície é iOS | accepted |

### Segurança e acesso

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0014](0014-rls-helpers-security-definer.md) | Helpers de RLS `SECURITY DEFINER` no schema `private` | accepted |
| [ADR-0015](0015-autorizacao-do-bff-devolve-resultado.md) | A autorização do BFF devolve resultado, não exceção | accepted |
| [ADR-0018](0018-metrica-de-saude-so-agregada-por-dia.md) | Métrica de saúde entra agregada por dia, nunca a série bruta | accepted |
| [ADR-0021](0021-onde-cada-segredo-vive.md) | Cada variável mora onde é lida; credencial por ambiente | accepted |

### Avaliação física

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0010](0010-body-scan-calibrado.md) | Análise corporal calibrada pela altura do aluno | accepted |
| [ADR-0022](0022-o-aparelho-mede-o-modelo-interpreta.md) | O aparelho mede a geometria; o modelo interpreta | accepted |
| [ADR-0023](0023-a-tecnica-se-julga-por-regra-e-nao-se-guarda.md) | A técnica se julga por regra geométrica, e não se guarda | accepted |
| [ADR-0024](0024-a-corrida-se-mede-e-o-caminho-nao-se-guarda.md) | A corrida se mede, e o caminho não se guarda | accepted |

### Inteligência Artificial

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0004](0004-ai-bff-pattern.md) | IA centralizada no BFF — nunca chamar Anthropic do mobile | accepted |
| [ADR-0005](0005-ai-model-selection.md) | Sonnet para orquestração, Haiku para tarefas estruturadas | accepted |
| [ADR-0011](0011-ai-architecture.md) | Abstração de provider e hierarquia de orquestradores | accepted |
| [ADR-0016](0016-chat-de-ia-em-sse-com-estado-em-jsonb.md) | Chat de IA em SSE com estado da sessão em JSONB | accepted |

### Produto e negócio

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0006](0006-product-rename-eleva-pro.md) | Renomear produto para Eleva Pro | accepted |
| [ADR-0008](0008-billing-model.md) | Modelo B2B (especialista paga) + B2C (aluno autônomo paga) com aluno gerenciado gratuito | accepted, prioridade substituída pelo ADR-0028 |
| [ADR-0028](0028-o-praticante-vem-primeiro.md) | O Praticante vem primeiro, e quem orienta o Student é estado do vínculo | accepted |

### Processo e documentação

| ADR | Decisão | Status |
|---|---|---|
| [ADR-0007](0007-documentation-structure.md) | Estrutura de documentação em 3 camadas (modules/ + PRDs/ + decisions/) | superseded em parte pelo ADR-0012 |
| [ADR-0012](0012-adr-layout-padrao-das-skills.md) | ADRs em `docs/adr/` com numeração de quatro dígitos | accepted |
| [ADR-0013](0013-specs-vivem-no-issue-tracker.md) | Specs e PRDs vivem no issue tracker, não em `docs/` | accepted |
| [ADR-0027](0027-o-codigo-fala-ingles-e-as-pessoas-portugues.md) | O código fala inglês, e as pessoas conversam em português | accepted |

---

## Template

Usar [_template.md](_template.md) para criar novos ADRs.

Convenção de nome: `NNNN-descricao-curta.md` — quatro dígitos, o maior número
existente mais um. É o formato que as engineering skills esperam encontrar
(ver [ADR-0012](0012-adr-layout-padrao-das-skills.md)).
