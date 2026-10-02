import { renderHook } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomOffset } from '../useBottomOffset';

/**
 * A distância ao fundo da tela medida pelo aparelho, e não pelo iPhone do kit.
 *
 * O kit mede a partir do fundo de um telefone com 34 de indicador de início.
 * No Android essa faixa é o `inset` do sistema: ~48 com os três botões, ~16–24
 * com gestos, 0 em alguns aparelhos. O defeito da #351 era o espaço que não
 * acompanhava o inset, e o último cartão ficava atrás da tab bar.
 */

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

function comInset(bottom: number) {
  jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 0, right: 0, left: 0, bottom });
}

describe('useBottomOffset', () => {
  it('troca os 34 do indicador do kit pelo inset dos três botões', () => {
    comInset(48);

    const { result } = renderHook(() => useBottomOffset(122));

    expect(result.current).toBe(48 + 122 - 34);
  });

  it('não reserva faixa do sistema em aparelho sem inset', () => {
    comInset(0);

    const { result } = renderHook(() => useBottomOffset(122));

    expect(result.current).toBe(122 - 34);
  });

  it('cresce exatamente o que o inset cresce, sem ramo por modo de navegação', () => {
    comInset(16);
    const gestos = renderHook(() => useBottomOffset(184)).result.current;
    comInset(48);
    const botoes = renderHook(() => useBottomOffset(184)).result.current;

    expect(botoes - gestos).toBe(32);
  });
});
