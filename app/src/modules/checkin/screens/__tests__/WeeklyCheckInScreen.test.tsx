import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { WeeklyCheckInScreen } from '../WeeklyCheckInScreen';

const mockSubmit = jest.fn();
const mockWeekWeight = jest.fn();
let mockHasSpecialist: boolean | undefined = false;
let mockPlatform: 'health_connect' | null = 'health_connect';

jest.mock('@/auth', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'aluno' } } }),
}));
jest.mock('../../hooks/useWeeklyCheckIn', () => ({
  useHasSpecialist: () => ({ data: mockHasSpecialist, isLoading: false }),
  useCheckInActions: () => ({ submit: { mutateAsync: mockSubmit, isPending: false } }),
}));
jest.mock('@/shared/wearable', () => ({ platformName: () => mockPlatform }));
jest.mock('../../services/healthWeight', () => ({
  weekWeightIfConsented: (...args: unknown[]) => mockWeekWeight(...args),
}));

const answer = async () => fireEvent.press(screen.getByText('Registrei tudo'));
const send = async () => fireEvent.press(screen.getByText(/Ver meu ajuste/i));

describe('WeeklyCheckInScreen (A4, F9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasSpecialist = false;
    mockPlatform = 'health_connect';
    mockSubmit.mockResolvedValue({});
  });

  it('o peso digitado vai com a origem "manual"', async () => {
    await render(<WeeklyCheckInScreen />);
    await answer();
    await fireEvent.changeText(screen.getByDisplayValue(''), '77,6');
    await send();

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith({
        logging: 'all',
        weightKg: 77.6,
        weightOrigin: 'manual',
      })
    );
  });

  it('a média do app de saúde entra no campo e vai com a origem dela', async () => {
    mockWeekWeight.mockResolvedValue(77.7);
    await render(<WeeklyCheckInScreen />);
    await answer();

    await fireEvent.press(screen.getByText('Usar o peso do Health Connect'));
    await waitFor(() => expect(screen.getByDisplayValue('77,7')).toBeTruthy());
    expect(screen.getByText('Média da semana no app Saúde')).toBeTruthy();
    await send();

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ weightKg: 77.7, weightOrigin: 'health_app' })
      )
    );
  });

  it('mexer no número tira a origem do app: o peso passa a ser da pessoa', async () => {
    mockWeekWeight.mockResolvedValue(77.7);
    await render(<WeeklyCheckInScreen />);
    await answer();
    await fireEvent.press(screen.getByText('Usar o peso do Health Connect'));
    await waitFor(() => expect(screen.getByDisplayValue('77,7')).toBeTruthy());

    await fireEvent.changeText(screen.getByDisplayValue('77,7'), '78');
    await send();

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ weightKg: 78, weightOrigin: 'manual' })
      )
    );
  });

  it('sem app de saúde no aparelho, o botão não aparece', async () => {
    mockPlatform = null;
    await render(<WeeklyCheckInScreen />);
    expect(screen.queryByText(/Usar o peso do/)).toBeNull();
  });

  // ADR-0030: com especialista, quem mede é ele.
  it('o Aluno não informa peso', async () => {
    mockHasSpecialist = true;
    await render(<WeeklyCheckInScreen />);
    expect(screen.queryByText('Seu peso hoje')).toBeNull();
    expect(screen.queryByText(/Usar o peso do/)).toBeNull();
  });
});
