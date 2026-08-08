# Decisions — Architecture Decision Records (ADRs)

> Registra **por que** cada decisão estrutural foi tomada.
> Não documenta o que foi construído (→ `modules/`) nem o que será construído (→ `PRDs/`).

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
| [ADR-002](002-flat-monorepo.md) | Flat Monorepo com /packages/ na raiz (sem Turborepo) | accepted |
| [ADR-003](003-environment-strategy.md) | Estratégia de ambientes Local → Preview → Production | accepted |
| [ADR-009](009-migration-strategy.md) | Migrations aplicadas pelo pipeline, não à mão | accepted |

### Arquitetura web

| ADR | Decisão | Status |
|---|---|---|
| [ADR-001](001-keep-nextjs.md) | Manter Next.js como BFF (não migrar para Vite) | accepted |

### Inteligência Artificial

| ADR | Decisão | Status |
|---|---|---|
| [ADR-004](004-ai-bff-pattern.md) | IA centralizada no BFF — nunca chamar Anthropic do mobile | accepted |
| [ADR-005](005-ai-model-selection.md) | Sonnet para orquestração, Haiku para tarefas estruturadas | accepted |

### Produto e negócio

| ADR | Decisão | Status |
|---|---|---|
| [ADR-006](006-product-rename-eleva-pro.md) | Renomear produto para Eleva Pro | accepted |
| [ADR-008](008-billing-model.md) | Modelo B2B (especialista paga) + B2C (aluno autônomo paga) com aluno gerenciado gratuito | accepted |

### Processo e documentação

| ADR | Decisão | Status |
|---|---|---|
| [ADR-007](007-documentation-structure.md) | Estrutura de documentação em 3 camadas (modules/ + PRDs/ + decisions/) | accepted |

---

## Template

Usar [_template.md](_template.md) para criar novos ADRs.

Convenção de nome: `NNN-descricao-curta.md` (NNN = número sequencial com zeros à esquerda).
