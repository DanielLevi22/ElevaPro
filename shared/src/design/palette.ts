/**
 * A paleta do Eleva Pro: a origem única de cor do app e do web (issue #459).
 *
 * Aqui mora só **valor**. Como cada plataforma o consome fica com ela: o app
 * gera o CSS do NativeWind e resolve hexadecimal para prop que não aceita
 * classe; o web gera o bloco de variáveis do `globals.css`. Os dois lados têm
 * teste que falha quando o CSS em disco anda separado daqui — foi a cópia à mão
 * entre plataformas que deixou o app coral por um mês (ADR-0025).
 *
 * Os nomes de token seguem os do app, em português, porque viram classe do
 * NativeWind em centenas de telas; renomeá-los é outra mudança.
 *
 * @example
 * import { palette } from "@elevapro/shared";
 * palette.dark.literais.glass // "rgba(255, 255, 255, 0.07)"
 */

/** Triplete HSL sem a função — a forma que o Tailwind exige para aceitar `/50`. */
export type HslTriplet = string;

/** Cor pronta para uso, com alfa embutido. Não aceita modificador de opacidade. */
export type ColorLiteral = string;

/**
 * Cores de marca. Não mudam com o tema — é o que atravessa mobile e web.
 * Os três hexadecimais estão no `readme.md` do design e servem de gabarito
 * para o `hslParaHex` do app.
 */
export const brand = {
  lime: "84 100% 50%",
  cyberBlue: "184 100% 50%",
  hotPink: "324 100% 50%",
} as const satisfies Record<string, HslTriplet>;

/**
 * Cor por métrica. Não é marca e não é estado: é identidade de uma grandeza.
 *
 * O kit de vidro dá cor própria a passos, calorias, sono e a cada macro, e usa
 * a mesma cor no ícone, no anel e na barra daquela grandeza — é assim que a
 * pessoa reconhece "calorias" sem ler o rótulo. Vira família de token pelo
 * mesmo critério que promoveu a camada de superfície iOS na #281: está no
 * desenho, é usada consistentemente, e sem token volta como hexadecimal à mão
 * na primeira tela de nutrição.
 *
 * Em triplete porque o desenho pinta o fundo do ícone com a mesma cor a 18%.
 * Passos e proteína compartilham o verde no desenho; ficam nomeadas em separado
 * porque o papel é que dá o nome, e uma pode divergir da outra depois.
 */
export const metric = {
  passos: "158.1 64.4% 51.6%",
  calorias: "27 96% 61%",
  sono: "234.5 89.5% 73.9%",
  proteina: "158.1 64.4% 51.6%",
  carboidrato: "82.7 78% 55.5%",
  gordura: "43.3 96.4% 56.3%",
  // Do fluxo de cardio (issue #304): batimento, ritmo e cadência têm cor própria
  // no ícone, no bloco e na zona de esforço, pelo mesmo critério das outras.
  batimento: "0 90.6% 70.8%",
  ritmo: "198.4 93.2% 59.6%",
  cadencia: "270 95.2% 75.3%",
} as const satisfies Record<string, HslTriplet>;

/**
 * Tokens que aceitam modificador de opacidade no Tailwind (`bg-primary/20`),
 * porque `hsl(var(--x) / <alpha-value>)` exige o triplete cru.
 */
export type HslTokens = {
  background: HslTriplet;
  foreground: HslTriplet;
  card: HslTriplet;
  cardForeground: HslTriplet;
  primary: HslTriplet;
  primaryForeground: HslTriplet;
  primaryText: HslTriplet;
  secondary: HslTriplet;
  secondaryForeground: HslTriplet;
  accent: HslTriplet;
  accentForeground: HslTriplet;
  destructive: HslTriplet;
  destructiveForeground: HslTriplet;
  success: HslTriplet;
  successForeground: HslTriplet;
  warning: HslTriplet;
  warningForeground: HslTriplet;
};

/**
 * Tokens que já carregam alfa e por isso entram no Tailwind como `var(--x)`
 * cru. Vêm da camada de superfície iOS do design, mapeados sobre os nomes que
 * o Tailwind e o app já usam — `border`, `muted`, `placeholder` — em vez de um
 * vocabulário paralelo com `--ios-` na frente.
 */
export type LiteralTokens = {
  border: ColorLiteral;
  muted: ColorLiteral;
  mutedForeground: ColorLiteral;
  placeholder: ColorLiteral;
  onHero: ColorLiteral;
  onHeroSecondary: ColorLiteral;
  onHeroTertiary: ColorLiteral;
  heroChip: ColorLiteral;
  heroChipBorder: ColorLiteral;
  /**
   * A pilha de vidro. O kit aplica as sete juntas em todo cartão: um gradiente
   * do topo ao pé (vertical aqui, 160° no kit — ver `Vidro.tsx`), a borda, e o
   * brilho especular de cima e de baixo que dá a espessura. `glassStrong` é o
   * trilho de progresso e o fundo de ícone neutro.
   *
   * Os dois temas são muito diferentes, e não inversos: no escuro o vidro é
   * quase transparente (7%), no claro é quase branco (86%).
   */
  glass: ColorLiteral;
  glassStrong: ColorLiteral;
  glassBorder: ColorLiteral;
  glassTop: ColorLiteral;
  glassBottom: ColorLiteral;
  specular: ColorLiteral;
  specularBottom: ColorLiteral;
  /**
   * Cor da sombra do vidro. Muda de cor, e não só de força, entre os temas: no
   * claro ela é azulada, porque sombra preta sob objeto claro lê como sujeira.
   */
  sombra: ColorLiteral;
  /**
   * Legenda sobre fotografia com véu preto — o cartão do treino do dia.
   *
   * **Iguais nos dois temas**, e é por isso que não são o `onHero`: o hero se
   * funde à tela e inverte no claro; o cartão é imagem com legenda, e o véu é
   * preto sempre. O kit escreve `#fff` e `rgba(255,255,255,.85)` à mão.
   */
  sobreImagem: ColorLiteral;
  sobreImagemSecundario: ColorLiteral;
  /** As pontas do `linear-gradient(rgba(0,0,0,.1), rgba(0,0,0,.82))` do kit. */
  veuDaImagemTopo: ColorLiteral;
  veuDaImagemBase: ColorLiteral;
  /**
   * O quadro da câmera do body scan: longe, quase e pronto. **Iguais nos dois
   * temas e saturadas de propósito**: a câmera é sempre escura, e o aluno lê o
   * quadro a três metros, onde tom pastel some. O redesenho da #316 trocou por
   * tokens do tema a 18% e o quadro deixou de ser visto de longe.
   */
  enquadramentoLonge: ColorLiteral;
  enquadramentoQuase: ColorLiteral;
  enquadramentoPronto: ColorLiteral;
  /**
   * O fundo da tab bar (`--tab-bg` do kit): quase opaco, porque o blur de 24
   * sozinho não segura ícone e rótulo legíveis sobre a foto que passa por baixo.
   */
  barraDeAbas: ColorLiteral;
  /**
   * Texto de macro — o percentual sob o anel, a diferença de uma troca.
   *
   * O anel usa a cor de métrica nos dois temas, mas a mesma cor como **texto**
   * não passa AA sobre o vidro claro: o kit troca por um tom escuro só no claro
   * (`--mp-t`, `--mc-t`, `--mf-t`). No escuro é a própria cor de métrica.
   */
  textoProteina: ColorLiteral;
  textoCarboidrato: ColorLiteral;
  textoGordura: ColorLiteral;
  /**
   * Texto de batimento, ritmo e cadência no cardio. Mesmo motivo do texto de
   * macro: a cor de métrica não passa AA como texto sobre o vidro claro, e o kit
   * troca por um tom escuro só no claro (`--hr-t`, `--pace-t`, `--cad-t`).
   */
  textoBatimento: ColorLiteral;
  textoRitmo: ColorLiteral;
  textoCadencia: ColorLiteral;
  /**
   * Texto de sono, passos e calorias na Saúde do dia: a diferença para a média é
   * escrita na cor da métrica, e no claro ela troca pelo tom escuro, como o kit faz
   * com `--sleep-t`, `--steps-t` e `--kcal-t`.
   */
  textoSono: ColorLiteral;
  textoPassos: ColorLiteral;
  textoCalorias: ColorLiteral;
  /**
   * O check sobre a cor de métrica — refeição feita, item comprado. **Igual nos
   * dois temas**, como o `sobreImagem`: o verde não muda de tema, então o que
   * fica em cima dele também não. O kit escreve `#06281a` à mão.
   */
  sobreMetrica: ColorLiteral;
  /**
   * O perigo do kit de saúde (`--danger`): o cadeado e o botão de retirar uma
   * autorização. Rosa, e não o `destructive`: é a cor que o desenho dá à ação que
   * interrompe um tratamento, e o vermelho do `destructive` não passa AA como
   * texto pequeno sobre o vidro claro. Como no texto de métrica, `textoPerigo`
   * escurece só no claro (`--danger-t`), e `sobrePerigo` é o texto do botão,
   * igual nos dois temas.
   */
  perigo: ColorLiteral;
  textoPerigo: ColorLiteral;
  sobrePerigo: ColorLiteral;
  /**
   * O véu atrás de uma folha (`--sheet-scrim`). No escuro é preto a 80%; no claro
   * é o cinza do texto a 45%, porque preto sobre a tela clara lê como apagão.
   */
  veuDaFolha: ColorLiteral;
};

export type ThemeName = "light" | "dark";

export type ThemePalette = { hsl: HslTokens; literais: LiteralTokens };

/**
 * A superfície do mobile é iOS, não zinc.
 *
 * O design do app foi encomendado com linguagem visual Apple — lista
 * grouped-inset, separador hairline, fundo preto puro em vez do `zinc-950` do
 * dashboard. Mobile e web compartilham marca, tipografia, raio e motion, e o
 * web usa esta superfície dentro da classe `material-glass`, na raiz do
 * dashboard e do admin (ADR-0048).
 *
 * `card` é o grupo da lista (`#1C1C1E`) e `background` é o preto atrás dela.
 */
const dark: ThemePalette = {
  hsl: {
    background: "220 17.6% 3.3%",
    foreground: "0 0% 100%",
    card: "240 3.4% 11.4%",
    cardForeground: "0 0% 100%",
    primary: brand.lime,
    primaryForeground: "0 0% 0%",
    primaryText: "84 90% 45%",
    secondary: brand.cyberBlue,
    secondaryForeground: "0 0% 0%",
    accent: brand.hotPink,
    accentForeground: "0 0% 100%",
    destructive: "0 84% 60%",
    destructiveForeground: "0 0% 98%",
    success: "160 84% 39%",
    successForeground: "0 0% 100%",
    warning: "38 92% 50%",
    warningForeground: "0 0% 0%",
  },
  literais: {
    border: "rgba(84, 84, 88, 0.65)",
    muted: "rgba(118, 118, 128, 0.24)",
    mutedForeground: "rgba(235, 235, 245, 0.66)",
    placeholder: "rgba(235, 235, 245, 0.34)",
    onHero: "#ffffff",
    onHeroSecondary: "rgba(255, 255, 255, 0.82)",
    onHeroTertiary: "rgba(255, 255, 255, 0.75)",
    heroChip: "rgba(255, 255, 255, 0.16)",
    heroChipBorder: "rgba(255, 255, 255, 0.28)",
    glass: "rgba(255, 255, 255, 0.07)",
    glassStrong: "rgba(255, 255, 255, 0.11)",
    glassBorder: "rgba(255, 255, 255, 0.13)",
    glassTop: "rgba(255, 255, 255, 0.13)",
    glassBottom: "rgba(255, 255, 255, 0.035)",
    specular: "rgba(255, 255, 255, 0.22)",
    specularBottom: "rgba(0, 0, 0, 0.18)",
    sombra: "rgb(0, 0, 0)",
    sobreImagem: "#ffffff",
    sobreImagemSecundario: "rgba(255, 255, 255, 0.85)",
    veuDaImagemTopo: "rgba(0, 0, 0, 0.1)",
    veuDaImagemBase: "rgba(0, 0, 0, 0.82)",
    enquadramentoLonge: "#ff1744",
    enquadramentoQuase: "#ffd600",
    enquadramentoPronto: "#00e676",
    barraDeAbas: "rgba(18, 19, 22, 0.72)",
    textoProteina: "#34d399",
    textoCarboidrato: "#a3e635",
    textoGordura: "#fbbf24",
    textoBatimento: "#f87171",
    textoRitmo: "#38bdf8",
    textoCadencia: "#c084fc",
    textoSono: "#818cf8",
    textoPassos: "#34d399",
    textoCalorias: "#fb923c",
    sobreMetrica: "#06281a",
    perigo: "#fb7185",
    textoPerigo: "#fb7185",
    sobrePerigo: "#2a0410",
    veuDaFolha: "rgba(0, 0, 0, 0.8)",
  },
};

/**
 * No claro o lime puro não passa AA sobre fundo claro: `primary` escurece para
 * `84 65% 38%`, e texto ou ícone de marca usam `primaryText`. Mesma correção
 * que o web já aplicou — o valor atravessou, o seletor não.
 */
const light: ThemePalette = {
  hsl: {
    background: "240 18.5% 94.7%",
    foreground: "0 0% 0%",
    card: "0 0% 100%",
    cardForeground: "0 0% 0%",
    primary: "84 65% 38%",
    primaryForeground: "0 0% 100%",
    primaryText: "88 65% 28%",
    secondary: brand.cyberBlue,
    secondaryForeground: "0 0% 0%",
    accent: brand.hotPink,
    accentForeground: "0 0% 100%",
    destructive: "0 84% 60%",
    destructiveForeground: "0 0% 98%",
    success: "160 84% 39%",
    successForeground: "0 0% 100%",
    warning: "38 92% 50%",
    warningForeground: "0 0% 0%",
  },
  literais: {
    border: "rgba(60, 60, 67, 0.2)",
    muted: "rgba(118, 118, 128, 0.12)",
    mutedForeground: "rgba(60, 60, 67, 0.8)",
    placeholder: "rgba(60, 60, 67, 0.45)",
    onHero: "#0b0b0f",
    onHeroSecondary: "rgba(28, 28, 32, 0.82)",
    onHeroTertiary: "rgba(28, 28, 32, 0.68)",
    heroChip: "rgba(255, 255, 255, 0.72)",
    heroChipBorder: "rgba(60, 60, 67, 0.16)",
    glass: "rgba(255, 255, 255, 0.86)",
    glassStrong: "rgba(118, 118, 128, 0.16)",
    glassBorder: "rgba(60, 60, 67, 0.14)",
    glassTop: "rgba(255, 255, 255, 0.98)",
    glassBottom: "rgba(255, 255, 255, 0.78)",
    specular: "rgba(255, 255, 255, 1)",
    specularBottom: "rgba(0, 0, 0, 0.04)",
    sombra: "rgb(16, 18, 24)",
    sobreImagem: "#ffffff",
    sobreImagemSecundario: "rgba(255, 255, 255, 0.85)",
    veuDaImagemTopo: "rgba(0, 0, 0, 0.1)",
    veuDaImagemBase: "rgba(0, 0, 0, 0.82)",
    enquadramentoLonge: "#ff1744",
    enquadramentoQuase: "#ffd600",
    enquadramentoPronto: "#00e676",
    barraDeAbas: "rgba(255, 255, 255, 0.9)",
    textoProteina: "#0b7a52",
    textoCarboidrato: "#4e7a0b",
    textoGordura: "#8a5e03",
    textoBatimento: "#b91c1c",
    textoRitmo: "#0369a1",
    textoCadencia: "#7e22ce",
    textoSono: "#4338ca",
    textoPassos: "#0b7a52",
    textoCalorias: "#c2410c",
    sobreMetrica: "#06281a",
    perigo: "#fb7185",
    textoPerigo: "#be123c",
    sobrePerigo: "#2a0410",
    veuDaFolha: "rgba(60, 60, 67, 0.45)",
  },
};

export const palette: Record<ThemeName, ThemePalette> = { light, dark };
