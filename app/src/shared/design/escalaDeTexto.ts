import { rem } from 'nativewind';
import { Dimensions, useWindowDimensions } from 'react-native';

/**
 * Ajusta o tamanho do texto à largura do aparelho, mantendo a proporção do
 * desenho.
 *
 * ## O problema
 *
 * O kit do Claude Design foi desenhado num telefone de **390pt** de largura
 * (classe iPhone 15). Um aparelho Android comum tem 448dp — 1344 pixels a
 * densidade 3. Um título de `32` ali ocupa 7,1% da largura, contra 8,2% no
 * desenho: tudo aparece cerca de 15% menor **em relação à tela**, e foi assim
 * que a primeira versão destas telas ficou.
 *
 * ## Por que `rem`, e não um número por call site
 *
 * O NativeWind resolve `rem` a partir de um observável. A escala de texto do
 * `tailwind.config.js` está declarada em `rem`, então mexer na base aqui move
 * todo o texto do app de uma vez — nenhuma tela precisa saber que isso existe.
 *
 * ## Por que o teto
 *
 * Crescer sem limite é o erro oposto. Num tablet de 1024dp o fator seria 2,6 e
 * o título viria com 83 de altura — texto de cartaz. Aplicativo nativo em tela
 * grande mostra **mais conteúdo**, não conteúdo maior; o teto de 1,2 corrige a
 * diferença entre telefones e para antes de virar deformação.
 *
 * O piso é 1: em telefone menor que o desenho o texto não encolhe, porque aí a
 * legibilidade é que estaria em jogo, não a proporção.
 */

/** Largura, em pontos, do telefone em que o kit foi desenhado. */
const LARGURA_DO_DESENHO = 390;

/** Base de `rem`. Espelha a constante do mesmo nome no `tailwind.config.js`. */
export const REM_BASE = 16;

const FATOR_MINIMO = 1;
const FATOR_MAXIMO = 1.2;

export function fatorDaTela(largura: number): number {
  return Math.min(Math.max(largura / LARGURA_DO_DESENHO, FATOR_MINIMO), FATOR_MAXIMO);
}

function aplicar(largura: number): void {
  rem.set(REM_BASE * fatorDaTela(largura));
}

/**
 * Liga o ajuste e devolve como desligá-lo.
 *
 * Escuta mudança de dimensão porque rotação e aparelho dobrável trocam a
 * largura em runtime — sem isso, quem abre o app fechado e desdobra fica com a
 * escala do telefone pequeno.
 *
 * @example
 * useEffect(() => ajustarEscalaDeTexto(), []);
 */
export function ajustarEscalaDeTexto(): () => void {
  aplicar(Dimensions.get('window').width);

  const inscricao = Dimensions.addEventListener('change', ({ window }) => {
    aplicar(window.width);
  });

  return () => inscricao.remove();
}

/**
 * O mesmo fator, para o que chega como **número** e não como classe: `size` de
 * ícone, altura calculada, qualquer medida que uma prop exige crua.
 *
 * Classe do NativeWind resolve `rem` sozinha e não precisa disto. Isto é para a
 * borda onde não existe classe — e é hook, e não função solta, porque precisa
 * reagir a rotação e a aparelho dobrável como o resto.
 *
 * @example
 * const escalar = useEscala();
 * <Ionicons name="mail" size={escalar(19)} color={cores.mutedForeground} />
 */
export function useEscala(): (medida: number) => number {
  const { width } = useWindowDimensions();
  const fator = fatorDaTela(width);
  return (medida) => Math.round(medida * fator);
}
