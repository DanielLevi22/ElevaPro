# Domain Docs

Como as engineering skills consomem a documentação de domínio deste repo.

**Layout: single-context.** Um `CONTEXT.md` na raiz e `docs/adr/` — o padrão que as
skills esperam encontrar. `app/`, `web/` e `shared/` convivem no mesmo repositório
(ver [ADR-0002](../adr/0002-flat-monorepo.md)), mas o domínio é um só, então não há
`CONTEXT-MAP.md` nem ADR por contexto.

## Antes de explorar, leia

- **`CONTEXT.md`** na raiz — a linguagem ubíqua do projeto.
- **`docs/adr/`** — leia os ADRs que tocam a área em que você vai mexer. Índice em
  [`docs/adr/README.md`](../adr/README.md), formato em
  [`docs/adr/_template.md`](../adr/_template.md).

Se algum desses arquivos não existir, **siga em silêncio**. Não sinalize a ausência
nem sugira criá-los de antemão. O `/domain-modeling` (alcançado via `/grill-with-docs`
e `/improve-codebase-architecture`) os cria de forma preguiçosa, quando um termo ou
uma decisão de fato precisar ser resolvida.

## Estrutura de arquivos

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-keep-nextjs.md
│   └── 0002-flat-monorepo.md
└── src/
```

## Também obrigatórios neste repo

Estes não fazem parte do padrão das skills, mas são bloqueadores do projeto e valem
por cima delas (ver `CLAUDE.md`):

- **`docs/LGPD_COMPLIANCE.md`** e o skill `/lgpd-check` — antes de qualquer campo novo,
  tabela nova ou acesso a dado de saúde.
- **Uma issue `ready-for-agent`** — nenhuma feature começa sem ela (ADR-0013).
- **`docs/schema/<modulo>.md`** — por que o schema é assim e o que foi rejeitado.
  O DDL em si é `shared/src/database/schema/*.ts`, que é a fonte da verdade.

## Use o vocabulário do CONTEXT.md

Quando a sua saída nomear um conceito de domínio (título de issue, proposta de refactor,
hipótese, nome de teste), use o termo como definido no `CONTEXT.md` — e não os que
estão listados sob `_Avoid_`. Vale também para as convenções do `CLAUDE.md`: pastas
`lowercase`, componentes `PascalCase`, hooks `useXxx`, stores `xxxStore`, services
`XxxService`.

Se o conceito que você precisa ainda não estiver lá, isso é sinal: ou você está
inventando linguagem que o projeto não usa (reconsidere), ou existe uma lacuna real
(anote para o `/domain-modeling`).

## Sinalize conflito com ADR

Se a sua saída contradiz um ADR existente, traga isso à tona em vez de sobrescrever
em silêncio:

> _Contradiz o [ADR-0002](../adr/0002-flat-monorepo.md) (flat monorepo), mas vale
> reabrir porque…_
