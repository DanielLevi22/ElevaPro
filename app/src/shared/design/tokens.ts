/**
 * A cor do app, derivada do design em `design/` (ADR-0043). Os valores moram
 * na paleta do `@elevapro/shared`, que o web também lê. Aqui fica o que é só
 * do app: a ponte do tema, a matéria das ilustrações e as escalas.
 *
 * Da paleta saem duas coisas no app, e só duas:
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

import {
  brand,
  type ColorLiteral,
  type HslTokens,
  type HslTriplet,
  type LiteralTokens,
  metric,
  palette,
  type ThemePalette,
} from '@elevapro/shared';

// A paleta mora no `shared` desde a #459, para o web ler a mesma origem.
// Daqui o design do app reexporta, e tudo no app continua entrando por
// `@/shared/design`.
export { brand, metric };

/**
 * Os tons dos objetos-herói do kit (`hero-objects.js`): o metal escovado da
 * bicicleta e da esteira, o deque e a tela apagada do painel.
 *
 * Não é superfície nem grandeza: é a matéria de uma ilustração, e por isso é
 * **igual nos dois temas** — o alumínio da bicicleta não fica escuro no claro.
 * Entra como família para a cor morar aqui, e não como hexadecimal à mão no
 * desenho do palco.
 */
export const illustration = {
  metalHighlight: '#d7dbe1',
  metalLight: '#c9ced6',
  metalMid: '#8e949e',
  metalShade: '#6b7079',
  metalDark: '#5d636d',
  metalDeep: '#4a4f58',
  deckTop: '#3a3f47',
  deckBottom: '#15171b',
  screenLit: '#2b2f36',
  screenOff: '#0a0b0d',
  /** A caixa de aço do relógio, do brilho à sombra, e a coroa lateral. */
  steelBright: '#e8eaee',
  steelSoft: '#9ba1ab',
  steelDeep: '#5a606b',
  steelPale: '#c8cdd5',
  steelMuted: '#7a8089',
  crownLight: '#c3c8d0',
  crownShade: '#6e747e',
  crownDeep: '#666c76',
  /** O arco do cadeado: o topo que pega a luz e as laterais. */
  shackleTop: '#d8dce3',
  shackleSide: '#b7bcc5',
  /** Os extremos do `color-mix` que clareia e escurece a primária na esfera. */
  white: '#ffffff',
  black: '#000000',
  /** O preto da sombra de palco: a mesma nos dois temas, como no kit. */
  stageShadow: 'rgb(0, 0, 0)',
  /** O lado da roda que não recebe a luz: branco a 12%. */
  wheelUnlit: 'rgba(255, 255, 255, 0.12)',
} as const satisfies Record<string, ColorLiteral>;

export type Tema = 'claro' | 'escuro';

/**
 * A paleta indexada pelo tema do app. A preferência é gravada em português no
 * aparelho (`temaStore`), e a paleta compartilhada é chaveada em inglês — esta
 * ponte evita migrar o valor que já está salvo.
 */
export const paletteByTheme: Record<Tema, ThemePalette> = {
  claro: palette.light,
  escuro: palette.dark,
};

/** Nome de cor de métrica como `useCores` a entrega: `metricaPassos`. */
type NomeDeMetrica = `metrica${Capitalize<keyof typeof metric>}`;

/** Nome de token de cor, em qualquer um dos grupos. */
export type NomeDeCor = keyof HslTokens | keyof LiteralTokens | NomeDeMetrica;

/**
 * Escalas que não dependem do tema.
 *
 * Espaço, raio e duração vêm de `design/foundations/tokens/`. A escala de **texto** não:
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
export function hslParaHex(triplete: HslTriplet): string {
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
