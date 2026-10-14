import type { NoticeState } from '@elevapro/shared';
import { applyNoticeChoices } from '../applyNoticeChoices';
import { type NoticeChoices, useNoticeChoicesStore } from '../noticeChoicesStore';

const TODAY = '2026-10-14'; // quarta

const state: NoticeState = {
  today: TODAY,
  nowMinutes: 480,
  meals: [
    { id: 'almoco', name: 'Almoço', time: '12:00', dayOfWeek: null },
    { id: 'jantar', name: 'Jantar', time: '19:30', dayOfWeek: null },
  ],
  loggedMealIds: [],
  workouts: [{ id: 'b', title: 'Treino B', day: 'wednesday' }],
  trainedToday: false,
  workoutStarts: [],
  rests: [],
  lastWorkoutDate: null,
  workoutsThisWeek: 0,
};

const none: NoticeChoices = {
  day: TODAY,
  skippedMeals: [],
  skippedWorkout: false,
  movedWorkout: null,
  mutedMeals: [],
  mealDelays: {},
};

describe('applyNoticeChoices', () => {
  it('o que a pessoa pulou hoje conta como feito, e o de ontem não', () => {
    const skipped = { ...none, skippedMeals: ['almoco'], skippedWorkout: true };
    expect(applyNoticeChoices(state, skipped)).toMatchObject({
      loggedMealIds: ['almoco'],
      trainedToday: true,
    });
    expect(applyNoticeChoices(state, { ...skipped, day: '2026-10-13' })).toMatchObject({
      loggedMealIds: [],
      trainedToday: false,
    });
  });

  it('o treino movido vale amanhã, com o nome do plano', () => {
    const moved = applyNoticeChoices(state, {
      ...none,
      movedWorkout: { date: '2026-10-15', id: 'b' },
    });
    expect(moved.workouts[0]).toEqual({ id: 'b', title: 'Treino B', day: 'thursday' });
  });

  it('a refeição parada sai, e a de outro horário avisa mais tarde', () => {
    const changed = applyNoticeChoices(state, {
      ...none,
      mutedMeals: ['jantar'],
      mealDelays: { almoco: 60 },
    });
    expect(changed.meals).toEqual([
      { id: 'almoco', name: 'Almoço', time: '13:00', dayOfWeek: null },
    ]);
  });
});

describe('o aviso ignorado (E6)', () => {
  const lunch = (id: string, at: number) => ({ id, refKey: 'meal:almoco', label: 'Almoço', at });

  it('soma quando toca sem resposta, e zera com resposta ou com a refeição feita', () => {
    const store = useNoticeChoicesStore.getState();
    store.settle(0, [], [lunch('a', 10), lunch('b', 20), lunch('c', 30)]);
    useNoticeChoicesStore.getState().settle(25, [], [lunch('c', 30)]);
    expect(useNoticeChoicesStore.getState().ignored['meal:almoco']).toEqual({
      count: 2,
      label: 'Almoço',
    });

    useNoticeChoicesStore.getState().respond('c');
    useNoticeChoicesStore.getState().settle(40, [], []);
    expect(useNoticeChoicesStore.getState().ignored['meal:almoco'].count).toBe(0);
  });

  it('"outro horário" empurra o aviso uma hora, e "parar" tira a refeição', () => {
    useNoticeChoicesStore.getState().resolveIgnored('meal:almoco', 'later');
    useNoticeChoicesStore.getState().resolveIgnored('meal:jantar', 'mute');
    const { mealDelays, mutedMeals } = useNoticeChoicesStore.getState();
    expect(mealDelays).toEqual({ almoco: 60 });
    expect(mutedMeals).toEqual(['jantar']);
  });
});
