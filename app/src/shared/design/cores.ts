import { useColorScheme } from 'nativewind';
import { hslParaHex, metrica, type NomeDeCor, paleta, type Tema } from './tokens';

/**
 * As cores do tema ativo já resolvidas em string que o React Native aceita.
 *
 * Serve o que não passa por `className`: `color` de ícone, `colors` de
 * `LinearGradient`, `tint` de `BlurView`, `placeholderTextColor`. Em qualquer
 * outro lugar a classe do NativeWind é o caminho — esta é a saída de exceção,
 * não um atalho para voltar a escrever cor à mão.
 */
export type Cores = Record<NomeDeCor, string>;

function resolver(tema: Tema): Cores {
  const { hsl, literais } = paleta[tema];
  const deHsl = Object.entries(hsl).map(([nome, triplete]) => [nome, hslParaHex(triplete)]);
  // Cor de métrica entra nos dois temas com o mesmo valor: ela identifica uma
  // grandeza, não uma superfície. Entra aqui porque o desenho pinta o ícone da
  // métrica com ela, e `color` de ícone não aceita classe.
  const deMetrica = Object.entries(metrica).map(([nome, triplete]) => [
    `metrica${nome[0].toUpperCase()}${nome.slice(1)}`,
    hslParaHex(triplete),
  ]);
  return Object.fromEntries([...deHsl, ...deMetrica, ...Object.entries(literais)]) as Cores;
}

/** Resolvido uma vez no import: são 24 conversões que nunca mudam em runtime. */
const CORES_POR_TEMA: Record<Tema, Cores> = {
  claro: resolver('claro'),
  escuro: resolver('escuro'),
};

const CANAL_CHEIO = 255;
const HEX_DE_SEIS = /^#[0-9a-f]{6}$/i;
const RGB = /^rgb\((.+)\)$/;

/**
 * Uma cor de token com opacidade, na forma que o React Native aceita.
 *
 * Os tokens chegam em duas formas — hexadecimal, dos triplos HSL, e `rgb(...)`,
 * dos literais — e quem compõe opacidade precisa das duas. Uma `rgba` já tem
 * alfa, e compor por cima dele é ambíguo: por isso é recusada, e não adivinhada.
 *
 * @example comOpacidade(cores.background, 0.55) // '#07080a8c'
 * @example comOpacidade(cores.sombra, 0.22)     // 'rgba(16, 18, 24, 0.22)'
 */
export function comOpacidade(cor: string, alfa: number): string {
  if (HEX_DE_SEIS.test(cor)) {
    const canal = Math.round(alfa * CANAL_CHEIO)
      .toString(16)
      .padStart(2, '0');
    return `${cor}${canal}`;
  }
  const rgb = RGB.exec(cor);
  if (rgb) return `rgba(${rgb[1]}, ${alfa})`;
  throw new Error(`comOpacidade: cor "${cor}" não é #rrggbb nem rgb(r, g, b)`);
}

/** Cores de um tema específico, para quem precisa das duas ao mesmo tempo. */
export function coresDoTema(tema: Tema): Cores {
  return CORES_POR_TEMA[tema];
}

/**
 * Cores do tema que está valendo agora.
 *
 * Lê o esquema do próprio NativeWind, e não a preferência salva, para que o
 * valor entregue aqui seja sempre o mesmo que as classes estão resolvendo.
 *
 * Esquema indefinido cai no claro de propósito: sem esquema resolvido nenhuma
 * classe `dark` é aplicada e o CSS fica na base `:root`, que é o tema claro.
 * Cair no escuro aqui devolveria hexadecimal de um tema que a tela não está
 * mostrando.
 *
 * @example
 * const cores = useCores();
 * <Ionicons name="flame" color={cores.primary} />
 */
export function useCores(): Cores {
  const { colorScheme } = useColorScheme();
  return CORES_POR_TEMA[colorScheme === 'dark' ? 'escuro' : 'claro'];
}
