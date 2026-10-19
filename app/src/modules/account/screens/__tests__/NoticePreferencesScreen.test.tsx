import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useNoticePreferencesStore } from '@/shared/notices';
import { NoticePreferencesScreen } from '../NoticePreferencesScreen';

jest.mock('@/shared/notices', () => ({
  ...jest.requireActual('@/shared/notices/noticePreferencesStore'),
  useLearnedWorkoutTime: () => ({ data: { starts: [1080, 1100, 1120], usual: 1100 } }),
}));
jest.mock('@/auth', () => ({
  useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 'aluno' } }),
}));
jest.mock('../../../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const permission = Notifications.getPermissionsAsync as jest.Mock;

describe('NoticePreferencesScreen (E5, F2, F6)', () => {
  beforeEach(() => {
    permission.mockResolvedValue({ status: 'granted' });
    useNoticePreferencesStore.getState().update({
      workoutMode: 'learned',
      dailyLimit: 3,
      hideDetails: true,
    });
  });

  it('mostra o horário aprendido e a hora em que o aviso vem', async () => {
    await render(<NoticePreferencesScreen />);
    expect(screen.getByText('Você costuma começar às 18:20')).toBeTruthy();
    expect(screen.getByText(/O aviso vem às 18:50/)).toBeTruthy();
  });

  it('o horário fixo e o limite do dia ficam nas preferências', async () => {
    await render(<NoticePreferencesScreen />);

    await fireEvent.press(screen.getByText('Fixo'));
    await fireEvent.press(screen.getByText('07:00'));
    await fireEvent.press(screen.getByText('Até 1'));

    expect(useNoticePreferencesStore.getState()).toMatchObject({
      workoutMode: 'fixed',
      workoutTime: '07:00',
      dailyLimit: 1,
    });
  });

  it('sem permissão no aparelho, avisa e oferece permitir', async () => {
    permission.mockResolvedValue({ status: 'denied' });
    await render(<NoticePreferencesScreen />);
    await waitFor(() => expect(screen.getByText('Os avisos estão desligados')).toBeTruthy());
  });

  it('a privacidade diz que vale para a tela bloqueada e para o widget', async () => {
    await render(<NoticePreferencesScreen />);
    expect(screen.getByText('Esconder detalhes na tela bloqueada e no widget')).toBeTruthy();
  });
});
