import type { NoticeState } from '@elevapro/shared';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useNoticePreferencesStore } from '../noticePreferencesStore';
import { useDailyNotices } from '../useDailyNotices';
import { checklistOf } from '../useTodayChecklist';

const mockRefresh = jest.fn();
jest.mock('../refreshDailyNotices', () => ({
  refreshDailyNotices: (id: string) => mockRefresh(id),
}));

const STATE: NoticeState = {
  today: '2026-10-14', // quarta
  nowMinutes: 13 * 60,
  meals: [
    { id: 'jantar', name: 'Jantar', time: '19:30', dayOfWeek: null },
    { id: 'cafe', name: 'Café', time: '07:00', dayOfWeek: null },
    { id: 'almoco', name: 'Almoço', time: '12:00', dayOfWeek: null },
    { id: 'so-sabado', name: 'Brunch', time: '10:00', dayOfWeek: 6 },
  ],
  loggedMealIds: ['cafe'],
  workouts: [{ id: 'b', title: 'Treino B', day: 'wednesday' }],
  trainedToday: false,
  workoutStarts: [],
  rests: [],
  lastWorkoutDate: null,
  workoutsThisWeek: 0,
  checkInDue: false,
  healthConsent: true,
};

describe('checklistOf (E4)', () => {
  it('o treino de hoje e as refeições cujo horário já passou, na ordem', () => {
    expect(checklistOf(STATE)).toEqual([
      { kind: 'workout', id: 'b', name: 'Treino B', time: null, done: false },
      { kind: 'meal', id: 'cafe', name: 'Café', time: '07:00', done: true },
      { kind: 'meal', id: 'almoco', name: 'Almoço', time: '12:00', done: false },
    ]);
  });

  it('a refeição que ainda não chegou não falta, e dia sem treino não tem treino', () => {
    const items = checklistOf({ ...STATE, today: '2026-10-15', nowMinutes: 6 * 60 });
    expect(items).toEqual([]);
  });
});

describe('useDailyNotices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('agenda ao abrir, ao voltar para o app e ao mudar as preferências', () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as never;
    });

    renderHook(() => useDailyNotices('aluno'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    act(() => listeners.at(-1)?.('active'));
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    act(() => useNoticePreferencesStore.getState().update({ dailyLimit: 2 }));
    expect(mockRefresh).toHaveBeenCalledTimes(3);
  });

  // O especialista vendo como o aluno passa nulo: não agenda o almoço de outra
  // pessoa no aparelho dele.
  it('nulo desliga: quem não é aluno não recebe avisos', () => {
    renderHook(() => useDailyNotices(null));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
