import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FoodItem } from '../../types';
import FoodSearchScreen from '../FoodSearchScreen';

/**
 * A busca da troca de alimento: o fim da lista acompanha a faixa do sistema, e
 * escolher um alimento entrega a quantidade que acerta os macros do original.
 */

const FRANGO: FoodItem = {
  id: 'frango',
  name: 'Peito de frango',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.5,
  serving_size: 100,
  serving_unit: 'g',
};

jest.mock('../../store/nutritionStore', () => ({
  useNutritionStore: () => ({
    searchFoods: jest.fn().mockResolvedValue([]),
    foods: [FRANGO],
  }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

const ALVO = { calories: 330, protein: 62, carbs: 0, fat: 7 };

function comInset(bottom: number) {
  jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 0, right: 0, left: 0, bottom });
}

function abrir(onSelect = jest.fn()) {
  const tela = render(
    <FoodSearchScreen onClose={jest.fn()} onSelect={onSelect} substitutionTarget={ALVO} />
  );
  return { ...tela, onSelect };
}

function fimDaLista(insetDoSistema: number): number {
  comInset(insetDoSistema);
  const { UNSAFE_getByType, unmount } = abrir();
  const fim = UNSAFE_getByType(FlatList).props.contentContainerStyle.paddingBottom;
  unmount();
  return fim;
}

afterEach(() => jest.useRealTimers());

describe('FoodSearchScreen', () => {
  it('reserva no fim da lista a faixa dos três botões do Android', () => {
    expect(fimDaLista(48) - fimDaLista(0)).toBe(48);
  });

  it('entrega ao escolher a quantidade que acerta os macros do original', () => {
    comInset(0);
    jest.useFakeTimers();
    const { onSelect } = abrir();
    act(() => jest.runOnlyPendingTimers());

    fireEvent.press(screen.getByText('Peito de frango'));

    const [alimento, quantidade] = onSelect.mock.calls[0];
    expect(alimento).toBe(FRANGO);
    expect(quantidade).toBe(200);
  });
});
