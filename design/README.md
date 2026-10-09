# design/ — fonte do design do Eleva Pro

Tokens, componentes de referência, guias e as telas desenhadas do app e do painel.
Até 2026-10-09 isto morava no projeto "ElevaPro" do Claude Design
(claude.ai/design), que fecha em 2026-12-14; desde então **o repo é a fonte**
(ver o [ADR-0043](../docs/adr/0043-o-design-mora-no-repo.md)).

Mudou o design? Muda aqui, por PR, como qualquer outro arquivo. Se alguém quiser
ver no claude.ai, o artifact é gerado a partir daqui — nunca o contrário.

## Isto não é código do produto

Nada aqui é importado pelo build do web ou do mobile. Quem manda em runtime é
`web/src/app/globals.css` e `app/src/shared/design/tokens.ts`; uma mudança de
token aqui só chega ao produto quando alguém a porta para lá.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `guide.md` | O guia do sistema: voz, cor, tipo, cantos, brilho, iconografia |
| `CHANGELOG.md` | O que mudou na reorganização de outubro de 2026 |
| `styles.css` | Só os `@import` dos tokens + reset de `body`/`a` |
| `foundations/tokens/` | Cor (`:root` = escuro, `.light` = claro), tipo, espaço, efeitos |
| `foundations/guidelines/` | 12 cards de specimen |
| `foundations/assets/` | Ilustração do body scan e 4 fotos de treino |
| `components/` | 12 componentes de referência (`.jsx` + `.d.ts` + uso em `.prompt.md`) e um card por grupo |
| `_ds_bundle.js` | Os componentes compilados. As telas carregam `../_ds_bundle.js` — apagar quebra todas |
| `mobile/index.html` | Índice das telas do mobile |
| `mobile/kit/` | Kit de vidro: `glass.css`, `kit.jsx`, `hero-objects.js` |
| `mobile/student/` | Telas do Student, de `00-login` a `09-ranking-perfil`, e `propostas/` em revisão |
| `mobile/especialista/` | Telas do Especialista |
| `web/dashboard.html` | Painel do especialista |
| `archive/` | Explorações superadas; as versões finais estão em `web/` e `mobile/` |

Para abrir uma tela, sirva a pasta (`npx serve design`) e abra o `.html`: elas
carregam React e Babel por CDN e o bundle por caminho relativo, o que não funciona
por `file://`.

## Fora do Biome, de propósito

`biome.json` desliga linter e formatador para `design/**`. São protótipos em
HTML com JSX transpilado no navegador, não código do produto; formatá-los só
produziria diff sem mudança de design.

## Atenção ao portar valores

A convenção de seletor é **invertida** entre os dois lados:

| | tema padrão no `:root` | sobrescrita |
|---|---|---|
| `design/foundations/tokens/colors.css` | escuro | `.light` |
| `web/src/app/globals.css` | claro | `.dark` |

O `globals.css` precisa continuar assim, porque o `@custom-variant dark` do
Tailwind depende dessa estrutura. Ao portar, o que atravessa é o **valor**,
nunca o seletor.

## Ficou de fora da migração

- `archive/uploads/` — screenshots e colagens de trabalho, dois deles duplicados.
- `SKILL.md` — instrução para o agente do Claude Design, que deixa de existir.
- `_ds_manifest.json`, `_adherence.oxlintrc.json`, `thumbnail.html` — gerados
  pela ferramenta para o painel dela.

Os caminhos citados dentro do `guide.md` (`tokens/`, `guidelines/`, `ui_kits/`)
são de antes da reorganização; a tabela acima é a que vale.
