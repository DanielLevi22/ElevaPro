import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEscala } from './escalaDeTexto';

/**
 * O fim da rolagem de uma tela com tab bar, do fundo da tela no kit: a barra e
 * o respiro para o último cartão não encostar no "+" central.
 */
export const ABOVE_TAB_BAR = 122;

/** O indicador de início do iPhone em que o kit foi desenhado. */
const KIT_HOME_INDICATOR = 34;

/**
 * Uma medida do kit tomada a partir do fundo da tela, já no aparelho.
 *
 * O kit mede do fundo de um iPhone, com os 34 do indicador de início dentro da
 * conta. Aqui essa faixa é o `inset` do sistema, e ele muda: ~48 no Android com
 * os três botões, ~16–24 com gestos, 0 em alguns aparelhos, e muda de novo se a
 * pessoa troca o modo com o app aberto. Embutir os 34 num número fixo deixava o
 * fim das telas atrás da tab bar com os três botões (#351).
 *
 * @example
 * const fimDaRolagem = useBottomOffset(122); // a tab bar e o respiro do kit
 * <ScrollView contentContainerStyle={{ paddingBottom: fimDaRolagem }} />
 */
export function useBottomOffset(kitMeasure: number): number {
  const insets = useSafeAreaInsets();
  const escalar = useEscala();
  return insets.bottom + escalar(kitMeasure - KIT_HOME_INDICATOR);
}
