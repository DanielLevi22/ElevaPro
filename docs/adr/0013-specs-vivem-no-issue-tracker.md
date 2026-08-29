# Specs e PRDs vivem no issue tracker, não em `docs/`

O repo acumulou 62 PRDs e 24 specs pós-implementação em `docs/`, com 23 features
descritas duas vezes — uma antes e uma depois de construir. Arquivo não fecha:
enquanto uma issue sai da frente quando o trabalho termina, um `.md` fica e alguém
precisa lembrar que ele morreu. Passamos a publicar spec no GitHub Issues, que é
onde o `/to-spec`, o `/triage` e o `/implement` esperam encontrá-la.

## Consequências

- Os PRDs vivos viraram as issues #120–#165, com `ready-for-agent` (era `approved`)
  ou `needs-triage` (era `draft`). `docs/PRDs/` deixou de existir.
- `docs/features/` também saiu. Aquelas specs descreviam código já escrito — cache
  do que se lê na fonte. Uma amostragem confirmou que as armadilhas locais já viviam
  como comentário no código, palavra por palavra. O que era decisão de arquitetura
  virou os ADRs 0014 a 0019.
- Os bloqueadores do `CLAUDE.md` mudaram junto: o contrato para começar uma feature
  é uma issue `ready-for-agent`, não um arquivo com `Status: approved`. Ao terminar,
  registra-se ADR se houve decisão difícil de reverter — e nada, se não houve.
- O que sobra em `docs/` é o que o código não consegue contar: os ADRs, o
  `CONTEXT.md`, o `LGPD_COMPLIANCE.md` e o `HOW_WE_WORK.md`.
- **Custo aceito:** o histórico de discussão dos PRDs `done` sai do working tree.
  Continua no git, recuperável por `git log --diff-filter=D`.
