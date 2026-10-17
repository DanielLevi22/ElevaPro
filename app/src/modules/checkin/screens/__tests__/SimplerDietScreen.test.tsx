import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SimplerDietScreen } from '../SimplerDietScreen';

const mockReplace = jest.fn();
const mockBuild = jest.fn();
const mockApprove = jest.fn();
const mockAlert = jest.fn();
let mockBuilt: unknown;
let mockBuildFailed: boolean;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ checkInId: 'c1' }),
}));
jest.mock('@/components/ui/appAlert', () => ({
  showAlert: (alert: unknown) => mockAlert(alert),
}));
jest.mock('@/shared/bff', () => ({ mensagemDeErroBff: () => 'Tente de novo.' }));
jest.mock('../../hooks/useWeeklyCheckIn', () => ({
  useSimplerDiet: () => ({
    build: {
      mutate: mockBuild,
      data: mockBuilt,
      isError: mockBuildFailed,
      error: null,
    },
    approve: { mutateAsync: mockApprove, isPending: false },
  }),
}));

const DIET = {
  checkInId: 'c1',
  mealsBefore: 5,
  mealsAfter: 4,
  plan: {
    proposal: {
      meals: [
        { name: 'Café', meal_time: '08:00', items: [{ food_name: 'Ovo', quantity: 2 }] },
        { name: 'Almoço', meal_time: '12:00', items: [{ food_name: 'Arroz', quantity: 100 }] },
      ],
    },
    mealCalories: [400, 700],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBuilt = undefined;
  mockBuildFailed = false;
});

describe('SimplerDietScreen (A5c)', () => {
  // Cada pedido é uma geração de IA paga: uma vez por abertura.
  it('monta o cardápio uma vez ao abrir, pelo check-in', () => {
    const { rerender } = render(<SimplerDietScreen />);
    rerender(<SimplerDietScreen />);
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockBuild.mock.calls[0][0]).toBe('c1');
    expect(screen.getByText('Montando seu cardápio')).toBeTruthy();
  });

  it('a falha deixa tentar de novo, sem perder o check-in', () => {
    mockBuildFailed = true;
    render(<SimplerDietScreen />);
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(mockBuild).toHaveBeenLastCalledWith('c1');
  });

  it('mostra as refeições novas e só "Aprovar cardápio" grava', async () => {
    mockBuilt = DIET;
    mockApprove.mockResolvedValue(undefined);
    render(<SimplerDietScreen />);

    expect(screen.getByText('4 refeições por dia')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
    expect(mockApprove).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Aprovar cardápio'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('aprovar que falha avisa e não sai da tela', async () => {
    mockBuilt = DIET;
    mockApprove.mockRejectedValue(new Error('502'));
    render(<SimplerDietScreen />);
    fireEvent.press(screen.getByText('Aprovar cardápio'));
    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
