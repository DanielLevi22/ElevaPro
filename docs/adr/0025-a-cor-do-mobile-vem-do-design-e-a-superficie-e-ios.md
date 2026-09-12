# A cor do mobile vem do design, e a superfície é iOS

O app mobile passa a derivar toda a cor do projeto Claude Design, abandonando a
paleta "Energy Gradient" (laranja → rosa). É a terceira vez que essa cor muda de
direção, e a segunda decisão foi deliberada e tinha teste guardando — por isso
este registro existe. Junto vai uma divergência de propósito: mobile e web
compartilham a marca, mas **não** a escala de superfície.

**Status:** accepted

## Por que a reversão da reversão

O histórico, em ordem:

1. O `global.css` do mobile sempre declarou o lime do design.
2. O `tailwind.config.js` sobrescrevia esses tokens com a paleta laranja de
   `constants/colors.ts`, então toda tela nascia coral apesar do token correto
   estar declarado logo ao lado.
3. Em 2026-08-28 o commit `ec2df72` alinhou a paleta ao lime.
4. Essa troca foi **revertida de propósito** — "as duas plataformas mantêm
   paletas próprias" — e ganhou um teste que travava o coral e falhava se
   qualquer cor do design aparecesse.
5. Agora ela volta, e aquele teste é deletado.

O que mudou entre 4 e 5 não é opinião de cor: é que o app inteiro vai ser
reconstruído a partir das telas desenhadas no Claude Design, e essas telas são
lime. Manter a paleta própria significaria implementar um desenho e pintá-lo de
outra cor — o pior dos dois mundos, porque nem é o desenho nem é uma decisão
tomada olhando para uma tela.

O teste que travava o coral era a coisa certa a fazer em agosto, e é por causa
dele que esta mudança não passou despercebida. Ele foi substituído por outro que
trava o inverso, para que a próxima reversão também precise ser explícita.

## Por que a superfície diverge do web

O design do mobile foi encomendado com linguagem visual Apple: lista
grouped-inset, separador hairline, fundo preto puro em vez do `zinc-950` do
dashboard, grupo em `#1c1c1e`. As telas do kit mostram isso, e não uma versão
reduzida do dashboard.

Então a divisão é:

| atravessa as duas plataformas | é de cada plataforma |
|---|---|
| marca (lime, cyber blue, hot pink) | fundo, grupo, separador |
| raio, motion, duração | escala de texto |

A escala de texto entra na coluna da direita pela mesma razão: `typography.css`
tem 14 de corpo, que é medida de dashboard; as telas do mobile usam 17, que é
medida de iOS.

O custo aceito é que "igual ao web" deixa de ser um critério de revisão do
mobile. Quem comparar as duas telas lado a lado vai ver superfícies diferentes,
e isso é o esperado.

## O triplete manda, não o rótulo

`design/tokens/colors.css` declara cada cor de marca duas vezes, e duas das três
discordam:

| marca | triplete | renderiza | rótulo ao lado |
|---|---|---|---|
| lime | `84 100% 50%` | `#99ff00` | `#ccff00` (matiz 72) |
| cyber blue | `184 100% 50%` | `#00eeff` | `#00f0ff` (matiz 183,5) |
| hot pink | `324 100% 50%` | `#ff0099` | `#ff0099` ✔ |

Vale o triplete, porque é o que renderiza: os rótulos `-hex` não são
referenciados em lugar nenhum do design, e o `globals.css` do web usa
`--primary: 84 100% 50%`. O dashboard em produção já mostra `#99ff00` desde
sempre; "#CCFF00" é um rótulo que atravessou comentários e documentação sem
nunca ter sido pixel.

Um teste trava essa leitura, para que ninguém "corrija" o triplete para casar
com o rótulo e mude a cor de marca das duas plataformas sem perceber.

## Consequências

- `src/shared/design/tokens.ts` é a origem única. Dele saem `global.css`, que o
  NativeWind lê, e `useCores()`, para prop que não aceita `className`. Um teste
  falha quando as duas saídas divergem — foi essa divergência silenciosa que
  produziu o coral.
- `constants/colors.ts` continua existindo como ponte `@deprecated`, congelada
  no tema escuro, porque 10 dos 47 arquivos que a importam leem cor em escopo de
  módulo, onde um hook não pode ser chamado. Morre com o último call site.
- O tema claro passa a funcionar. Ele nunca funcionou: o
  `react-native-css-interop` só reconhece `:root` e `.dark:root` como seletor de
  variável, e o bloco `.light` que existia era descartado em silêncio. Ao portar
  do design, o que atravessa é o **valor**, nunca o seletor.
- Cor hexadecimal escrita à mão passa a falhar no pre-commit, no arquivo que o
  commit tocar. A regra já existia no `CLAUDE.md` e tinha sido ignorada 685
  vezes.
