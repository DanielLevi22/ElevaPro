import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLightWeekStore } from '@/shared/lightWeek';
import { BusyWeekScreen } from '../BusyWeekScreen';

const mockReplace = jest.fn();
let mockCanPause = true;

jest.mock('@/auth', () => ({ useCan: () => mockCanPause }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
}));

const pick = async (option: string) => {
  await render(<BusyWeekScreen />);
  await fireEvent.press(screen.getByText(option));
  await fireEvent.press(screen.getByText(/Continuar$/i));
};

describe('BusyWeekScreen (F5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLightWeekStore.setState({ until: null });
    mockCanPause = true;
  });

  it('voltar com semana leve liga sete dias de cargas menores e vai aos treinos', async () => {
    await pick('Voltar com semana leve');
    expect(useLightWeekStore.getState().until).not.toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workouts');
  });

  it('pausar abre o Modo Descanso, sem ligar a semana leve', async () => {
    await pick('Pausar o plano');
    expect(mockReplace).toHaveBeenCalledWith('/block/rest');
    expect(useLightWeekStore.getState().until).toBeNull();
  });

  it('continuar não muda nada no plano', async () => {
    await pick('Continuar como está');
    expect(useLightWeekStore.getState().until).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workouts');
  });

  it('sem permissão de pausar, a opção nem aparece', async () => {
    mockCanPause = false;
    await render(<BusyWeekScreen />);
    expect(screen.queryByText('Pausar o plano')).toBeNull();
    expect(screen.getByText('Voltar com semana leve')).toBeTruthy();
  });
});
