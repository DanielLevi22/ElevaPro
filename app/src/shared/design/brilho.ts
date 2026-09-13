import { useCallback } from 'react';
import type { BoxShadowValue } from 'react-native';
import { comOpacidade, useCores } from './cores';
import { useEscala } from './escalaDeTexto';

/**
 * O brilho de uma cor em volta de um elemento — o `box-shadow` colorido que o
 * kit põe no botão principal, no play, no ícone do pré-início e na série atual.
 *
 * Era montado à mão em sete lugares, cada um com a escala, a cor e a opacidade
 * escritas de novo. As medidas vêm do desenho e são escaladas aqui.
 */
export interface MedidaDoBrilho {
  /** Deslocamento vertical, no desenho. */
  y?: number;
  blur: number;
  espalhamento?: number;
}

type Brilho = (
  medida: MedidaDoBrilho,
  opcoes?: { alfa?: number; cor?: string }
) => BoxShadowValue[];

/**
 * @example
 * const brilho = useBrilho();
 * <View style={{ boxShadow: brilho({ y: 10, blur: 26, espalhamento: -8 }) }} />
 * <View style={{ boxShadow: brilho({ blur: 0, espalhamento: 3 }, { alfa: 0.25 }) }} />
 */
export function useBrilho(): Brilho {
  const cores = useCores();
  const escalar = useEscala();

  return useCallback<Brilho>(
    ({ y = 0, blur, espalhamento = 0 }, { alfa = 1, cor = cores.primary } = {}) => [
      {
        offsetX: 0,
        offsetY: escalar(y),
        blurRadius: escalar(blur),
        spreadDistance: escalar(espalhamento),
        color: alfa === 1 ? cor : comOpacidade(cor, alfa),
      },
    ],
    [cores.primary, escalar]
  );
}
