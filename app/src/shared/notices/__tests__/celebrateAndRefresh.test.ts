import * as Notifications from 'expo-notifications';
import { celebrateSession } from '../celebrateSession';
import { useNoticePreferencesStore } from '../noticePreferencesStore';
import { refreshDailyNotices } from '../refreshDailyNotices';

const mockFetchState = jest.fn();
const mockWater = jest.fn();
const mockCount = jest.fn();
const mockSchedule = jest.fn();
const mockVictory = jest.fn();
const mockWidget = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createDailyNoticesService: () => ({
    fetchNoticeState: (id: string, now: Date) => mockFetchState(id, now),
    countWorkouts: () => mockCount(),
  }),
  createHidratacao: () => ({ lerDia: (id: string, day: string) => mockWater(id, day) }),
}));
jest.mock('@/services/notificationService', () => ({
  scheduleDailyNotices: (notices: unknown, options: unknown) => mockSchedule(notices, options),
  presentVictoryNotice: (copy: unknown) => mockVictory(copy),
}));
jest.mock('@/shared/widget', () => ({
  ...jest.requireActual('@/shared/widget/todaySnapshot'),
  updateTodayWidget: (snapshot: unknown) => mockWidget(snapshot),
}));

const permission = Notifications.getPermissionsAsync as jest.Mock;

const state = {
  today: '2026-10-14',
  nowMinutes: 8 * 60,
  meals: [{ id: 'almoco', name: 'Almoço', time: '12:00', dayOfWeek: null }],
  loggedMealIds: [],
  workouts: [
    { id: 'a', title: 'Treino A', day: 'monday' },
    { id: 'b', title: 'Treino B', day: 'wednesday' },
  ],
  trainedToday: true,
  workoutStarts: [],
  rests: [],
  lastWorkoutDate: '2026-10-14',
  workoutsThisWeek: 2,
  checkInDue: false,
  healthConsent: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchState.mockResolvedValue(state);
  mockWater.mockResolvedValue(750);
  mockCount.mockResolvedValue(7);
  useNoticePreferencesStore.getState().update({ hideDetails: true });
});

describe('celebrateSession (F1)', () => {
  it('fechar a semana comemora com o número, quando os detalhes estão à mostra', async () => {
    permission.mockResolvedValue({ status: 'granted' });
    useNoticePreferencesStore.getState().update({ hideDetails: false });

    await celebrateSession('aluno', null);

    expect(mockVictory).toHaveBeenCalledWith({
      title: 'Semana completa: 2 de 2',
      body: 'Sua sequência segue.',
    });
  });

  // Art. 6°, VII: a vitória também aparece na tela bloqueada.
  it('com detalhes escondidos, o recorde não diz o exercício nem a carga', async () => {
    permission.mockResolvedValue({ status: 'granted' });
    mockFetchState.mockResolvedValue({ ...state, workoutsThisWeek: 1 });

    await celebrateSession('aluno', { nome: 'Supino', texto: '45 kg → 47,5 kg' });

    const [copy] = mockVictory.mock.calls[0];
    if (JSON.stringify(copy).includes('Supino') || JSON.stringify(copy).includes('kg')) {
      throw new Error(`RECORDE NA TELA BLOQUEADA: ${JSON.stringify(copy)}`);
    }
  });

  it('sem permissão de aviso, não comemora nem consulta', async () => {
    permission.mockResolvedValue({ status: 'denied' });
    await celebrateSession('aluno', null);
    expect(mockFetchState).not.toHaveBeenCalled();
    expect(mockVictory).not.toHaveBeenCalled();
  });
});

describe('refreshDailyNotices', () => {
  it('com permissão, redesenha o widget e agenda os avisos, sem botões quando escondido', async () => {
    permission.mockResolvedValue({ status: 'granted' });

    await refreshDailyNotices('aluno');

    expect(mockWidget).toHaveBeenCalledWith(
      expect.objectContaining({ hidden: true, waterMl: 750, date: '2026-10-14' })
    );
    expect(mockSchedule).toHaveBeenCalledWith(expect.any(Array), { withActions: false });
  });

  it('sem permissão de aviso, o widget ainda é redesenhado, e nada é agendado', async () => {
    permission.mockResolvedValue({ status: 'denied' });

    await refreshDailyNotices('aluno');

    expect(mockWidget).toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('sem rede, não quebra: os avisos agendados antes seguem valendo', async () => {
    permission.mockResolvedValue({ status: 'granted' });
    mockFetchState.mockRejectedValue(new Error('offline'));

    await expect(refreshDailyNotices('aluno')).resolves.toBeUndefined();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
