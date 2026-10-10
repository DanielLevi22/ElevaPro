import type { Exercise, WorkoutExercise } from '@elevapro/shared';
import { withTodaySwaps } from '../todaySwapsStore';

const HALTERES = { id: 'halteres', name: 'Remada com halteres' } as Exercise;
const ITEM = { id: 'item-1', exercise_id: 'remada', exercise: { id: 'remada' } } as WorkoutExercise;

describe('as trocas de hoje', () => {
  it('aplicam o exercício trocado no item do treino', () => {
    const [trocado] = withTodaySwaps(
      [ITEM],
      { day: '2026-10-10', byItem: { 'item-1': HALTERES } },
      '2026-10-10'
    );
    expect(trocado).toMatchObject({ id: 'item-1', exercise_id: 'halteres', exercise: HALTERES });
  });

  it('não valem no dia seguinte: o treino volta ao plano', () => {
    const [item] = withTodaySwaps(
      [ITEM],
      { day: '2026-10-09', byItem: { 'item-1': HALTERES } },
      '2026-10-10'
    );
    expect(item.exercise_id).toBe('remada');
  });
});
