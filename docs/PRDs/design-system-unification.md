# PRD: design-system-unification

**Data de criação:** 2026-08-09
**Status:** approved
**Branch:** feature/design-system-unification
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Uma única fonte da verdade para as cores do Eleva Pro **no web**, derivada dos
tokens do projeto Claude Design, com o neon lime `#CCFF00` como primária, o tema
claro finalmente alcançável pelo usuário, e uma guarda de lint que impede cor
cravada na mão de voltar.

> **Reescopado em 2026-08-09:** o PRD original cobria web + mobile. A decisão é
> tratar só o web nesta rodada. O mobile continua com o bug do coral e vira PRD
> próprio — ver "Fora do escopo".

### Por quê?
Hoje web e mobile são dois produtos visualmente diferentes. O web usa lime, o
mobile usa coral. Pior: o mobile se contradiz sozinho — `app/src/global.css`
declara lime e `app/tailwind.config.js` sobrescreve com coral, então
`className="bg-primary"` e `var(--color-primary)` devolvem cores distintas na
mesma tela. Como `--primary-foreground` é preto (desenhado para o lime), o
resultado visível é texto preto sobre botão coral.

Um usuário que entra pelo app e depois abre o dashboard não reconhece o mesmo
produto. E cada tela nova nasce com a dúvida de qual cor usar, o que produziu as
873 cores cravadas na mão que existem hoje.

### Como saberemos que está pronto?
- [ ] Zero ocorrências de hex literal em `web/src`, fora do arquivo de tokens
- [ ] Um único arquivo define a paleta do web
- [ ] Lint falha ao encontrar hex literal em componente
- [ ] Contraste AA (4.5:1) verificado em todo par texto/fundo dos tokens,
      **nos dois temas**
- [x] O usuário consegue alternar claro/escuro e a preferência persiste
- [x] `npm run lint` e `tsc --noEmit` limpos no web
- [x] Testes existentes passando

---

## Contexto

Levantado em 2026-08-09, comparando os três lugares que hoje definem cor:

| Fonte | `primary` | Quem consome |
|---|---|---|
| `web/src/app/globals.css:18` | `#CCFF00` lime | web inteiro |
| `app/src/global.css:20` | `#CCFF00` lime | `var(--color-primary)` no mobile |
| `app/src/constants/colors.ts:87` via `app/tailwind.config.js` | `#FF4D5A` coral | classes NativeWind do mobile |

O `colors.ts` documenta a paleta como "Energy Gradient — Mobile-only color
palette", ou seja, a divergência foi deliberada em algum momento. A decisão de
2026-08-09 é que ela deixa de existir: o produto tem uma marca só, o lime.

### Tamanho do problema

| | Arquivos | Ocorrências de hex |
|---|---|---|
| `app/src` | 111 | 873 |
| `web/src` | — | 67 |

As mais frequentes no mobile: `#FF6B35` (109×, o coral), `#52525B` (98×),
`#FFFFFF` (64×), `#71717A` (57×), `#A1A1AA` (48×), `#FF2E63` (39×). Fora as
cores de status cravadas fora de qualquer escala — `#F97316` e `#00C9A7` em
`RestTimer.tsx`, `#34D399` e `#10B981` espalhados.

---

## Escopo

### Incluído

**Fase 1 — tema claro alcançável** *(prioridade)*
- Remover o `dark` cravado no `<body>` de [`web/src/app/layout.tsx:31`](../../web/src/app/layout.tsx)
- Provider de tema com persistência e respeito a `prefers-color-scheme`
- Alternador claro/escuro na UI
- Portar os valores do bloco `.light` de `design/tokens/colors.css` para o
  `:root` de `globals.css` — em especial o lime escurecido para texto e botão

**Fase 2 — tokens que faltam**
- Trazer para `globals.css` o que só existe no Claude Design hoje: `--success`,
  `--warning`, `--primary-text`, escala de `--overlay-*`, `--glass-*`,
  `--panel-bg`, sombras/glow, escala de espaçamento e de raio

**Fase 3 — ajustes de tela**
- Aplicar nas telas reais os ajustes feitos nas explorations do Claude Design,
  usando `design/explorations/` como referência

**Fase 4 — erradicar hex cravado**
- Substituir as 67 ocorrências do web por token

**Fase 5 — guarda**
- Regra de lint que falha ao encontrar `#rrggbb` em componente
- O arquivo de tokens é a única exceção

### Fora do escopo (explicitamente)
- **O mobile inteiro.** Reescopado em 2026-08-09. O bug do coral
  (`app/tailwind.config.js` sobrescrevendo o lime do `app/src/global.css`) e as
  873 ocorrências de hex continuam de pé, sem correção nesta rodada. Vira PRD
  próprio. Consequência aceita e conhecida: até lá, web e mobile seguem
  visualmente divergentes — que era exatamente o problema que este PRD nasceu
  para resolver.
- Fonte única em `shared/src/theme/`. Sem o mobile como segundo consumidor, um
  pacote compartilhado não se paga; `globals.css` é a fonte da verdade do web.
- Componentes React Native no Claude Design. Ele renderiza HTML; os 12
  componentes de `app/src/components/ui` não são HTML.
- Tipografia como decisão de marca. As famílias já declaradas (Inter, Outfit,
  JetBrains Mono) ficam; escolher fonte nova é outro assunto.

---

## Fluxo de dados

```
Claude Design (projeto ElevaPro)   ← onde a paleta é desenhada e revisada
  ↓ DesignSync get_file (manual, um arquivo por vez)
design/tokens/*.css                ← cópia versionada no repo
  ↓ port manual dos valores
web/src/app/globals.css            ← fonte da verdade em runtime
  → :root  (claro)  /  .dark  (escuro)
  → @theme inline → classes Tailwind
  → componentes                    (className, nunca literal)
```

> Atenção à inversão de convenção: no `design/tokens/colors.css` o `:root` é o
> tema **escuro** e `.light` sobrescreve. No `globals.css` é o contrário —
> `:root` é claro e `.dark` sobrescreve, porque o `@custom-variant dark` do
> Tailwind depende disso. Ao portar valores, o que atravessa é o valor, nunca a
> estrutura do seletor.

## Tabelas do banco envolvidas

Nenhuma. Mudança puramente de apresentação — sem campo novo, sem dado pessoal,
sem acesso a dado de saúde. `/lgpd-check` não se aplica.

## Impacto em outros módulos

Todos os módulos com UI **do web**: `workout`, `nutrition`, `students`,
`assessment`, `gamification`, `auth`. O impacto é amplo mas raso — troca de
constante de cor, sem mudança de comportamento.

O risco real muda de natureza ao destravar o tema claro: cada tela do web nunca
foi renderizada em claro na prática, porque o `dark` estava cravado no `<body>`.
Qualquer lugar que usa `white/10`, `bg-zinc-900` ou glow cravado na mão vai
parecer quebrado no claro. Por isso a fase 4 (erradicar hex) vem depois da 1 —
até lá, o alternador deve ser tratado como recurso em validação, não como
pronto.

---

## Decisões técnicas

**Lime, não coral.** Decisão de 2026-08-09. Pesa a favor: é o que o web inteiro
já usa, é o que o próprio `global.css` do mobile já declara, e é o par correto
do `--primary-foreground: 0 0% 0%`. Segue valendo como decisão de marca, mesmo
com o mobile fora do escopo desta rodada.

**O lime do tema claro não é o mesmo lime.** No escuro, `#CCFF00` puro sobre
quase-preto funciona. No claro ele falha: é uma cor de luminância altíssima, e
como texto sobre branco não chega perto de 4.5:1. O projeto no Claude Design já
resolveu isso com dois tokens separados — `--primary: 84 65% 38%` com foreground
branco para superfície, e `--primary-text` mais escuro ainda para texto. É por
isso que a fase 1 não é só apagar a classe `dark`: sem esses valores, o tema
claro nasce ilegível.

**Token em HSL, não hex.** O `globals.css` já guarda HSL sem função
(`84 100% 50%`) para poder derivar variações com `hsl(var(--x) / alpha)`.

**A guarda antes da limpeza em massa.** Mesma lição do
[schema-drift-alignment](schema-drift-alignment.md): sem a regra de lint, a
fase 2 conserta 940 ocorrências e nada impede a 941ª. A guarda entra primeiro em
modo de aviso, e vira erro quando a contagem chega a zero.

**Claude Design cobre o web, não o mobile.** Ele sincroniza uma biblioteca local
de componentes com previews renderizados. React Native não renderiza lá. Fingir
que cobre os dois produziria uma biblioteca que mente sobre metade do produto.

**O `design/` é cópia, não fonte.** O `DesignSync` é via única — existe
`write_files` para subir, não existe pull. Trazer de volta é `get_file` arquivo
por arquivo, manual. Então `design/` é um espelho versionado do que estava na
nuvem no momento da cópia, e diverge silenciosamente assim que alguém editar de
um lado só. Quem manda em runtime é `globals.css`.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/design-system-unification.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado
