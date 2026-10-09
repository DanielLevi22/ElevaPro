# O design mora no repo

**Status:** accepted. Issue #367.

O projeto "ElevaPro" do Claude Design (claude.ai/design) era a fonte do design e
`design/` guardava um espelho de 6 dos ~150 arquivos. A ferramenta só subia
arquivo, nada descia sozinho, e editar de um lado fazia os dois divergirem sem
aviso. Com o Claude Design avulso fechando em 2026-12-14, o design system foi
migrado para um artifact do claude.ai — e, no mesmo dia, copiado inteiro para
`design/`, byte a byte, que passa a ser a fonte.

O artifact migrado não serve de fonte: chega sem edição direta ("peça ao Claude
para mudar"), fora do controle de versão, e os agentes que escrevem o app só o
alcançam pela rede. No repo, mudança de design tem diff, PR e histórico, e
qualquer sessão lê a tela que vai implementar.

## Consequências

- Mudar o design é PR em `design/`. Um artifact no claude.ai, se existir, é
  publicado a partir do repo e nunca editado lá.
- `design/**` segue fora do Biome e de qualquer build; o produto continua lendo
  só `web/src/app/globals.css` e `app/src/shared/design/tokens.ts`.
- `_ds_bundle.js` é saída compilada dos `components/`, mas não há como
  recompilá-lo fora da ferramenta. Até existir esse build, mudar um componente
  de referência exige atualizar o bundle à mão ou aceitar que as telas mostrem a
  versão anterior.
