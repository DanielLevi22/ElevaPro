# design/ — espelho local do projeto Claude Design "ElevaPro"

Cópia versionada do projeto `ea5fe872-8cb8-4c6c-b771-55b973916907` em
claude.ai/design, baixada em 2026-08-09.

## Isto é uma cópia, não a fonte

O `DesignSync` é via única: sobe (`finalize_plan` → `write_files`), não desce.
O que existe para trazer de volta é `get_file`, um arquivo por vez, manual.
Consequências práticas:

- Este diretório reflete o estado da nuvem **no momento da cópia**. Editar de um
  lado só faz os dois divergirem em silêncio, sem aviso e sem conflito.
- Quem manda em runtime é `web/src/app/globals.css`. Nada aqui é importado pelo
  build do web ou do mobile.
- Os 6 binários do projeto (`assets/**.png`, `assets/**.jpg`,
  `uploads/*.png`) **não foram baixados** — voltariam como base64.

## Fora do Biome, de propósito

`biome.json` desliga linter e formatador para `design/**`. Estes arquivos são
cópia byte-a-byte da nuvem: formatá-los tornaria ilegível o diff contra o
projeto remoto, que é a única razão de o espelho existir. O `.html` também não
passa no `useHtmlLang` — é preview gerado, não página do produto.

## O que foi baixado

| Caminho | Conteúdo |
|---|---|
| `tokens/colors.css` | Paleta completa. `:root` = escuro, `.light` = claro |
| `tokens/typography.css` | Inter / Outfit / JetBrains Mono + escala |
| `tokens/spacing.css` | Escala de espaço e de raio |
| `tokens/effects.css` | Sombras, glow, blur, easing, durações |
| `styles.css` | Só os `@import` dos tokens + reset de `body`/`a` |
| `explorations/specialist-panel-light.html` | Painel do especialista em tema claro, com alternador |

## Não baixado ainda

`components/` (core, data, feedback, forms, navigation), `guidelines/` (12 cards
de specimen), `ui_kits/web-dashboard`, `ui_kits/mobile-app`, as outras 6
explorations, `SKILL.md`, `github.md`.

## Atenção ao portar valores

A convenção de seletor é **invertida** entre os dois lados:

| | tema padrão no `:root` | sobrescrita |
|---|---|---|
| `design/tokens/colors.css` | escuro | `.light` |
| `web/src/app/globals.css` | claro | `.dark` |

O `globals.css` precisa continuar assim, porque o `@custom-variant dark` do
Tailwind depende dessa estrutura. Ao portar, o que atravessa é o **valor**,
nunca o seletor.

Ver a issue [#131](https://github.com/DanielLevi22/ElevaPro/issues/131).
