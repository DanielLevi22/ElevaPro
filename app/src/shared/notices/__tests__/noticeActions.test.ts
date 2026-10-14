import { NOTICE_ACTIONS } from '@/services/notificationService';
import { handleNoticeAction, noticeDataOf } from '../noticeActions';
import { useNoticeChoicesStore } from '../noticeChoicesStore';

const mockFetchPlan = jest.fn();
const mockToggleMealLog = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createNutritionService: () => ({
    fetchActiveDietPlan: (id: string) => mockFetchPlan(id),
    toggleMealLog: (input: unknown) => mockToggleMealLog(input),
  }),
}));
jest.mock('../refreshDailyNotices', () => ({
  refreshDailyNotices: (id: string) => mockRefresh(id),
}));
jest.mock('../../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const meal = { noticeKind: 'meal' as const, refId: 'almoco', date: '2026-10-14' };
const workout = { noticeKind: 'workout' as const, refId: 'treino-b', date: '2026-10-14' };

describe('handleNoticeAction (E2, E3, F3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNoticeChoicesStore.getState().reset();
  });

  it('"Comi" marca a refeição na dieta ativa e agenda de novo', async () => {
    mockFetchPlan.mockResolvedValue({ id: 'dieta-1' });

    const route = await handleNoticeAction('aluno', NOTICE_ACTIONS.mealDone, meal);

    expect(route).toBeNull();
    expect(mockToggleMealLog).toHaveBeenCalledWith({
      student_id: 'aluno',
      diet_plan_id: 'dieta-1',
      diet_meal_id: 'almoco',
      logged_date: '2026-10-14',
      completed: true,
    });
    expect(mockRefresh).toHaveBeenCalledWith('aluno');
  });

  it('sem dieta ativa, "Comi" não inventa registro', async () => {
    mockFetchPlan.mockResolvedValue(null);
    await handleNoticeAction('aluno', NOTICE_ACTIONS.mealDone, meal);
    expect(mockToggleMealLog).not.toHaveBeenCalled();
  });

  it('"Pulei" e "Hoje não" contam como feito no dia; "Amanhã" leva o treino', async () => {
    await handleNoticeAction('aluno', NOTICE_ACTIONS.mealSkip, meal);
    await handleNoticeAction('aluno', NOTICE_ACTIONS.workoutTomorrow, workout);

    expect(useNoticeChoicesStore.getState()).toMatchObject({
      day: '2026-10-14',
      skippedMeals: ['almoco'],
      skippedWorkout: true,
      movedWorkout: { date: '2026-10-15', id: 'treino-b' },
    });
  });

  it('as ações que abrem o app levam à tela certa', async () => {
    expect(await handleNoticeAction('a', NOTICE_ACTIONS.mealOther, meal)).toBe('/(tabs)/nutrition');
    expect(await handleNoticeAction('a', NOTICE_ACTIONS.workoutStart, workout)).toBe(
      '/(tabs)/workouts/execute/treino-b'
    );
    expect(await handleNoticeAction('a', NOTICE_ACTIONS.workoutShort, workout)).toEqual({
      pathname: '/(tabs)/workouts/execute/[id]',
      params: { id: 'treino-b', short: '1' },
    });
    expect(await handleNoticeAction('a', 'acao-desconhecida', workout)).toBeNull();
  });
});

describe('noticeDataOf', () => {
  it('só reconhece os avisos do dia, com o que a ação precisa', () => {
    expect(
      noticeDataOf({ kind: 'daily-notice', noticeKind: 'meal', refId: 'x', date: '2026-10-14' })
    ).toEqual({ noticeKind: 'meal', refId: 'x', date: '2026-10-14' });
    expect(noticeDataOf({ kind: 'weekly-report', url: '/checkin/report' })).toBeNull();
    expect(noticeDataOf({ kind: 'daily-notice', noticeKind: 'meal', date: 'x' })).toBeNull();
    expect(noticeDataOf(undefined)).toBeNull();
  });
});
