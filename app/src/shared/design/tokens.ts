/**
 * Fonte única de cor do app, derivada do projeto Claude Design "ElevaPro"
 * (`design/tokens/` no repo espelha a nuvem).
 *
 * Daqui saem duas coisas, e só duas:
 *
 * 1. `src/global.css`, as variáveis que o NativeWind lê para resolver classe.
 * 2. Os valores que `useCores` entrega para prop que não aceita `className` —
 *    `color` de ícone, `colors` de `LinearGradient`, `tint` de `BlurView`,
 *    `placeholderTextColor`.
 *
 * As duas saídas precisam concordar, e é `tokens.test.ts` quem garante isso.
 * Foi a divergência silenciosa entre elas que deixou o app coral por um mês
 * com o token certo declarado logo ao lado — ver ADR-0025.
 *
 * @example
 * import { escala, useCores } from '@/shared/design';
 * const cores = useCores();
 * <Ionicons name="flame" color={cores.primary} size={escala.texto.h2} />
 */

/** Triplete HSL sem a função — a forma que o Tailwind exige para aceitar `/50`. */
export type TripleHsl = string;

/** Cor pronta para uso, com alfa embutido. Não aceita modificador de opacidade. */
export type CorLiteral = string;

/**
 * Cores de marca. Não mudam com o tema — é o que atravessa mobile e web.
 * Os três hexadecimais estão no `readme.md` do design e servem de gabarito
 * para `hslParaHex`.
 */
export const marca = {
  lime: '84 100% 50%',
  cyberBlue: '184 100% 50%',
  hotPink: '324 100% 50%',
} as const satisfies Record<string, TripleHsl>;

/**
 * Tokens que aceitam modificador de opacidade no Tailwind (`bg-primary/20`),
 * porque `hsl(var(--x) / <alpha-value>)` exige o triplete cru.
 */
type TokensHsl = {
  background: TripleHsl;
  foreground: TripleHsl;
  card: TripleHsl;
  cardForeground: TripleHsl;
  primary: TripleHsl;
  primaryForeground: TripleHsl;
  primaryText: TripleHsl;
  secondary: TripleHsl;
  secondaryForeground: TripleHsl;
  accent: TripleHsl;
  accentForeground: TripleHsl;
  destructive: TripleHsl;
  destructiveForeground: TripleHsl;
  success: TripleHsl;
  successForeground: TripleHsl;
  warning: TripleHsl;
  warningForeground: TripleHsl;
};

/**
 * Tokens que já carregam alfa e por isso entram no Tailwind como `var(--x)`
 * cru. Vêm da camada de superfície iOS do design, mapeados sobre os nomes que
 * o Tailwind e o app já usam — `border`, `muted`, `placeholder` — em vez de um
 * vocabulário paralelo com `--ios-` na frente.
 */
type TokensLiterais = {
  border: CorLiteral;
  muted: CorLiteral;
  mutedForeground: CorLiteral;
  placeholder: CorLiteral;
  onHero: CorLiteral;
  onHeroSecondary: CorLiteral;
  heroChip: CorLiteral;
};

export type Tema = 'claro' | 'escuro';

type Paleta = { hsl: TokensHsl; literais: TokensLiterais };

/**
 * A superfície do mobile é iOS, não zinc.
 *
 * O design do app foi encomendado com linguagem visual Apple — lista
 * grouped-inset, separador hairline, fundo preto puro em vez do `zinc-950` do
 * dashboard. Mobile e web compartilham marca, tipografia, raio e motion, e
 * deliberadamente **não** compartilham escala de superfície (ADR-0025).
 *
 * `card` é o grupo da lista (`#1C1C1E`) e `background` é o preto atrás dela.
 */
const escuro: Paleta = {
  hsl: {
    background: '0 0% 0%',
    foreground: '0 0% 100%',
    card: '240 3.4% 11.4%',
    cardForeground: '0 0% 100%',
    primary: marca.lime,
    primaryForeground: '0 0% 0%',
    primaryText: '84 90% 45%',
    secondary: marca.cyberBlue,
    secondaryForeground: '0 0% 0%',
    accent: marca.hotPink,
    accentForeground: '0 0% 100%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    success: '160 84% 39%',
    successForeground: '0 0% 100%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 0%',
  },
  literais: {
    border: 'rgba(84, 84, 88, 0.65)',
    muted: 'rgba(118, 118, 128, 0.24)',
    mutedForeground: 'rgba(235, 235, 245, 0.62)',
    placeholder: 'rgba(235, 235, 245, 0.32)',
    onHero: '#ffffff',
    onHeroSecondary: 'rgba(255, 255, 255, 0.88)',
    heroChip: 'rgba(255, 255, 255, 0.18)',
  },
};

/**
 * No claro o lime puro não passa AA sobre fundo claro: `primary` escurece para
 * `84 65% 38%`, e texto ou ícone de marca usam `primaryText`. Mesma correção
 * que o web já aplicou — o valor atravessou, o seletor não.
 */
const claro: Paleta = {
  hsl: {
    background: '240 23.8% 95.9%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    cardForeground: '0 0% 0%',
    primary: '84 65% 38%',
    primaryForeground: '0 0% 100%',
    primaryText: '88 65% 28%',
    secondary: marca.cyberBlue,
    secondaryForeground: '0 0% 0%',
    accent: marca.hotPink,
    accentForeground: '0 0% 100%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    success: '160 84% 39%',
    successForeground: '0 0% 100%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 0%',
  },
  literais: {
    border: 'rgba(60, 60, 67, 0.2)',
    muted: 'rgba(118, 118, 128, 0.12)',
    mutedForeground: 'rgba(60, 60, 67, 0.78)',
    placeholder: 'rgba(60, 60, 67, 0.42)',
    onHero: '#0b0b0f',
    onHeroSecondary: 'rgba(28, 28, 32, 0.82)',
    heroChip: 'rgba(255, 255, 255, 0.7)',
  },
};

export const paleta: Record<Tema, Paleta> = { claro, escuro };

/** Nome de token de cor, em qualquer um dos dois grupos. */
export type NomeDeCor = keyof TokensHsl | keyof TokensLiterais;

/** Escalas que não dependem do tema, espelhadas de `design/tokens/`. */
export const escala = {
  espaco: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  raio: { sm: 8, md: 12, lg: 16, xl: 22, '2xl': 24, '3xl': 32, painel: 40, full: 9999 },
  texto: { display: 32, h1: 24, h2: 20, h3: 16, corpo: 14, pequeno: 12, micro: 10 },
  entrelinha: { justa: 1.1, normal: 1.5 },
  duracao: { rapida: 150, padrao: 300 },
} as const;

const HEX_POR_CANAL = 255;

/**
 * Converte o triplete do design em hexadecimal, porque prop de React Native
 * quer cor concreta e não variável CSS.
 *
 * @example hslParaHex('84 100% 50%') // '#99ff00'
 */
export function hslParaHex(triplete: TripleHsl): string {
  const partes = triplete.trim().split(/\s+/);
  const [matiz, saturacao, luminosidade] = partes.map((parte) => Number.parseFloat(parte));
  if (partes.length !== 3 || [matiz, saturacao, luminosidade].some(Number.isNaN)) {
    throw new Error(`Triplete HSL inválido: "${triplete}". Esperado "H S% L%", ex "84 100% 50%".`);
  }
  const canais = canaisDeHsl(matiz, saturacao / 100, luminosidade / 100);
  return `#${canais.map(paraParDeHex).join('')}`;
}

/** HSL→RGB na forma sem ramificação: cada canal é o mesmo cálculo deslocado. */
function canaisDeHsl(matiz: number, saturacao: number, luminosidade: number): number[] {
  const amplitude = saturacao * Math.min(luminosidade, 1 - luminosidade);
  const canal = (deslocamento: number): number => {
    const posicao = (deslocamento + matiz / 30) % 12;
    return luminosidade - amplitude * Math.max(-1, Math.min(posicao - 3, 9 - posicao, 1));
  };
  return [canal(0), canal(8), canal(4)];
}

/** Minúscula porque é o que o formatador exige no CSS gerado, e assim a saída
 * daqui e a dos tokens literais têm a mesma cara. */
function paraParDeHex(canal: number): string {
  return Math.round(canal * HEX_POR_CANAL)
    .toString(16)
    .padStart(2, '0');
}
