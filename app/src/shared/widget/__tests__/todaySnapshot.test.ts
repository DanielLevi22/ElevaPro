import type { NoticeState } from '@elevapro/shared';
import { buildTodaySnapshot } from '../todaySnapshot';

const state: NoticeState = {
  today: '2026-10-14', // quarta
  nowMinutes: 13 * 60,
  meals: [
    { id: 'cafe', name: 'Café', time: '07:00', dayOfWeek: null },
    { id: 'almoco', name: 'Almoço', time: '12:30', dayOfWeek: null },
    { id: 'jantar', name: 'Jantar', time: '19:30', dayOfWeek: null },
  ],
  loggedMealIds: ['cafe'],
  workouts: [{ id: 'b', title: 'Treino B - Costas', day: 'wednesday' }],
  trainedToday: false,
  workoutStarts: [],
  rests: [],
  lastWorkoutDate: null,
  workoutsThisWeek: 0,
  checkInDue: false,
  healthConsent: true,
};

describe('buildTodaySnapshot (F7)', () => {
  it('o treino de hoje, a próxima refeição sem marcar e o que falta', () => {
    expect(buildTodaySnapshot(state, 1200, false)).toEqual({
      date: '2026-10-14',
      hidden: false,
      pending: 2,
      workout: { id: 'b', title: 'Treino B - Costas', done: false },
      nextMeal: { name: 'Almoço', time: '12:30' },
      waterMl: 1200,
    });
  });

  it('treinou e marcou: nada falta, e a próxima é a do horário que vem', () => {
    const snapshot = buildTodaySnapshot(
      { ...state, trainedToday: true, loggedMealIds: ['cafe', 'almoco'] },
      0,
      true
    );
    expect(snapshot.pending).toBe(0);
    expect(snapshot.nextMeal).toEqual({ name: 'Jantar', time: '19:30' });
  });
});
