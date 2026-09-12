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
export const metrica = {
  passos: '158.1 64.4% 51.6%',
  calorias: '27 96% 61%',
  sono: '234.5 89.5% 73.9%',
  proteina: '158.1 64.4% 51.6%',
  carboidrato: '82.7 78% 55.5%',
  gordura: '43.3 96.4% 56.3%',
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
  onHeroTertiary: CorLiteral;
  heroChip: CorLiteral;
  heroChipBorder: CorLiteral;
  /**
   * A pilha de vidro. O kit aplica as sete juntas em todo cartão: um gradiente
   * de 160° do topo ao pé, a borda, e o brilho especular de cima e de baixo que
   * dá a espessura. `glassStrong` é o trilho de progresso e o fundo de ícone
   * neutro.
   *
   * Os dois temas são muito diferentes, e não inversos: no escuro o vidro é
   * quase transparente (7%), no claro é quase branco (86%).
   */
  glass: CorLiteral;
  glassStrong: CorLiteral;
  glassBorder: CorLiteral;
  glassTop: CorLiteral;
  glassBottom: CorLiteral;
  specular: CorLiteral;
  specularBottom: CorLiteral;
  /** Véu sobre a foto do hero, na parada do meio. */
  scrim: CorLiteral;
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
    background: '220 17.6% 3.3%',
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
    mutedForeground: 'rgba(235, 235, 245, 0.66)',
    placeholder: 'rgba(235, 235, 245, 0.34)',
    onHero: '#ffffff',
    onHeroSecondary: 'rgba(255, 255, 255, 0.82)',
    onHeroTertiary: 'rgba(255, 255, 255, 0.75)',
    heroChip: 'rgba(255, 255, 255, 0.16)',
    heroChipBorder: 'rgba(255, 255, 255, 0.28)',
    glass: 'rgba(255, 255, 255, 0.07)',
    glassStrong: 'rgba(255, 255, 255, 0.11)',
    glassBorder: 'rgba(255, 255, 255, 0.13)',
    glassTop: 'rgba(255, 255, 255, 0.13)',
    glassBottom: 'rgba(255, 255, 255, 0.035)',
    specular: 'rgba(255, 255, 255, 0.22)',
    specularBottom: 'rgba(0, 0, 0, 0.18)',
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
};

/**
 * No claro o lime puro não passa AA sobre fundo claro: `primary` escurece para
 * `84 65% 38%`, e texto ou ícone de marca usam `primaryText`. Mesma correção
 * que o web já aplicou — o valor atravessou, o seletor não.
 */
const claro: Paleta = {
  hsl: {
    background: '240 18.5% 94.7%',
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
    mutedForeground: 'rgba(60, 60, 67, 0.8)',
    placeholder: 'rgba(60, 60, 67, 0.45)',
    onHero: '#0b0b0f',
    onHeroSecondary: 'rgba(28, 28, 32, 0.82)',
    onHeroTertiary: 'rgba(28, 28, 32, 0.68)',
    heroChip: 'rgba(255, 255, 255, 0.72)',
    heroChipBorder: 'rgba(60, 60, 67, 0.16)',
    glass: 'rgba(255, 255, 255, 0.86)',
    glassStrong: 'rgba(118, 118, 128, 0.16)',
    glassBorder: 'rgba(60, 60, 67, 0.14)',
    glassTop: 'rgba(255, 255, 255, 0.98)',
    glassBottom: 'rgba(255, 255, 255, 0.78)',
    specular: 'rgba(255, 255, 255, 1)',
    specularBottom: 'rgba(0, 0, 0, 0.04)',
    scrim: 'rgba(255, 255, 255, 0.62)',
  },
};

export const paleta: Record<Tema, Paleta> = { claro, escuro };

/** Nome de cor de métrica como `useCores` a entrega: `metricaPassos`. */
type NomeDeMetrica = `metrica${Capitalize<keyof typeof metrica>}`;

/** Nome de token de cor, em qualquer um dos grupos. */
export type NomeDeCor = keyof TokensHsl | keyof TokensLiterais | NomeDeMetrica;

/**
 * Escalas que não dependem do tema.
 *
 * Espaço, raio e duração vêm de `design/tokens/`. A escala de **texto** não:
 * aquela é a do dashboard (14 de corpo), e as telas do mobile são iOS — corpo
 * 17, título de linha 16, legenda 13. Mesma divisão que já vale na cor: marca
 * e ritmo atravessam, métrica de superfície e de texto é por plataforma.
 */
export const escala = {
  espaco: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  raio: { sm: 8, md: 12, lg: 16, xl: 22, '2xl': 24, '3xl': 32, painel: 40, full: 9999 },
  texto: { display: 32, numero: 28, h1: 24, h2: 20, corpo: 17, rotulo: 16, legenda: 13, micro: 12 },
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
