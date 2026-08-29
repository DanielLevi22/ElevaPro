# ADRs passam a viver em `docs/adr/` com numeração de quatro dígitos

**Status:** accepted — substitui em parte o [ADR-0007](0007-documentation-structure.md)
**Data:** 2026-08-29

As engineering skills do plugin `mattpocock-skills` têm o caminho `docs/adr/` e o
formato `0001-slug.md` escritos no próprio corpo — `domain-modeling/ADR-FORMAT.md`
diz "ADRs live in `docs/adr/`" e manda criar o diretório preguiçosamente quando o
primeiro ADR for necessário. Nenhuma delas lê `docs/agents/domain.md`, então apontar
aquele arquivo para `docs/decisions/` não impediria a skill de criar um segundo
diretório de ADR na primeira decisão registrada. Adotamos o caminho e a numeração
da skill para não terminar com duas árvores de decisão no mesmo repositório.

## Consequências

- `docs/decisions/` virou `docs/adr/` (via `git mv`, histórico preservado) e os
  arquivos foram para `0001-…` a `0011-…`.
- **Colisão de número resolvida:** existiam dois ADR-003 — `003-environment-strategy`
  e `ADR-003-ai-architecture`. O de ambientes ficou com `0003`; o de arquitetura de IA
  foi renumerado para **`0011`**, e as quatro referências a ele nos PRDs de IA foram
  atualizadas. Uma referência antiga a "ADR-003" no contexto de IA aponta hoje para
  `0011-ai-architecture.md`.
- A camada `decisions/` descrita no ADR-0007 deixa de existir com esse nome; as outras
  três camadas daquele ADR (`modules/`, `PRDs/`, `README.md`) continuam valendo.
- O `_template.md` foi reduzido ao formato da skill: título e um parágrafo. As seções
  pesadas viraram opcionais, porque o valor está em registrar *que* a decisão foi
  tomada e *por quê*, não em preencher formulário.
