import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLightWeekStore } from '@/shared/lightWeek';
import { BusyWeekScreen } from '../BusyWeekScreen';

const mockReplace = jest.fn();
let mockCanPause = true;

jest.mock('@/auth', () => ({ useCan: () => mockCanPause }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
}));

const pick = (option: string) => {
  render(<BusyWeekScreen />);
  fireEvent.press(screen.getByText(option));
  fireEvent.press(screen.getByText(/Continuar$/i));
};

describe('BusyWeekScreen (F5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLightWeekStore.setState({ until: null });
    mockCanPause = true;
  });

  it('voltar com semana leve liga sete dias de cargas menores e vai aos treinos', () => {
    pick('Voltar com semana leve');
    expect(useLightWeekStore.getState().until).not.toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workouts');
  });

  it('pausar abre o Modo Descanso, sem ligar a semana leve', () => {
    pick('Pausar o plano');
    expect(mockReplace).toHaveBeenCalledWith('/block/rest');
    expect(useLightWeekStore.getState().until).toBeNull();
  });

  it('continuar não muda nada no plano', () => {
    pick('Continuar como está');
    expect(useLightWeekStore.getState().until).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workouts');
  });

  it('sem permissão de pausar, a opção nem aparece', () => {
    mockCanPause = false;
    render(<BusyWeekScreen />);
    expect(screen.queryByText('Pausar o plano')).toBeNull();
    expect(screen.getByText('Voltar com semana leve')).toBeTruthy();
  });
});
