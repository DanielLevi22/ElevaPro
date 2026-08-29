# Issue tracker: GitHub

As issues e specs deste repo vivem como GitHub issues em `DanielLevi22/ElevaPro`.
Use o CLI `gh` para todas as operações.

> **A issue é o contrato.** Nenhuma feature começa sem uma issue `ready-for-agent`
> (ver `CLAUDE.md` e o [ADR-0013](../adr/0013-specs-vivem-no-issue-tracker.md)).
> Spec não vira arquivo em `docs/` — o `/to-spec` publica direto aqui.

## Convenções

- **Criar issue**: `gh issue create --title "..." --body "..."`. Use heredoc para corpo multilinha.
- **Ler issue**: `gh issue view <number> --comments`, filtrando comentários com `jq` e buscando também os labels.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros `--label` e `--state` adequados.
- **Comentar**: `gh issue comment <number> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Fechar**: `gh issue close <number> --comment "..."`

O repo é inferido de `git remote -v`; o `gh` faz isso sozinho dentro do clone.

## Pull requests como superfície de triagem

**PRs como superfície de requisição: não.** _(Mude para `sim` se este repo tratar PRs externos como pedido de feature; `/triage` lê esta flag.)_

Quando `sim`, PRs passam pelos mesmos labels e estados das issues, usando os equivalentes `gh pr`:

- **Ler um PR**: `gh pr view <number> --comments` e `gh pr diff <number>` para o diff.
- **Listar PRs externos para triagem**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` e manter só `authorAssociation` de `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE` (descartar `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comentar / rotular / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

O GitHub compartilha um único espaço de numeração entre issues e PRs, então `#42` pode ser qualquer um dos dois: resolva com `gh pr view 42` e caia para `gh issue view 42`.

## Quando uma skill diz "publicar no issue tracker"

Crie uma GitHub issue.

## Quando uma skill diz "buscar o ticket relevante"

Rode `gh issue view <number> --comments`.

## Operações de wayfinding

Usadas pelo `/wayfinder`. O **mapa** é uma única issue com issues **filhas** como tickets.

- **Mapa**: uma issue com label `wayfinder:map`, contendo o corpo Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Ticket filho**: issue ligada ao mapa como sub-issue do GitHub (`gh api` no endpoint de sub-issues). Onde sub-issues não estiverem habilitadas, adicione o filho a uma task list no corpo do mapa e ponha `Part of #<map>` no topo do corpo do filho. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Uma vez reivindicado, o ticket é atribuído ao dev que o dirige.
- **Bloqueio**: **dependências nativas de issue** do GitHub, a representação canônica e visível na UI. Adicione uma aresta com `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, onde `<blocker-db-id>` é o **id numérico de banco** do bloqueador (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _não_ o `#number` nem o `node_id`). O GitHub reporta `issue_dependencies_summary.blocked_by` (só bloqueadores abertos, o gate real). Onde dependências não estiverem disponíveis, caia para uma linha `Blocked by: #<n>, #<n>` no topo do corpo do filho. Um ticket está desbloqueado quando todo bloqueador está fechado.
- **Frontier query**: liste os filhos abertos do mapa (`gh issue list --state open`, escopado às sub-issues / task list do mapa), descarte os que têm bloqueador aberto (`issue_dependencies_summary.blocked_by > 0`, ou uma issue aberta na linha `Blocked by`) ou assignee; o primeiro na ordem do mapa vence.
- **Claim**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, depois `gh issue close <n>`, depois adicione um ponteiro de contexto (gist + link) ao Decisions-so-far do mapa.
