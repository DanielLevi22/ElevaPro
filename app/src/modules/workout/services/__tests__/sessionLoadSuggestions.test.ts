import type { WorkoutExercise } from '@elevapro/shared';
import { nextTimeSuggestions, todaySuggestions, weightsToApply } from '../sessionLoadSuggestions';

const supino = { id: 'item-1', weight: '10', reps: '10-12', sets: 3 } as WorkoutExercise;
const prancha = { id: 'item-2', weight: null, reps: '40 s', sets: 3 } as WorkoutExercise;

describe('as cargas da sessão', () => {
  it('hoje: sobe a carga de quem achou fácil, e sem histórico mantém a prescrição', () => {
    const hoje = todaySuggestions([supino, prancha], {
      'item-1': [{ maxWeightKg: 12.5, effort: 'easy' }],
    });

    expect(hoje['item-1']).toMatchObject({ kind: 'increase', weightKg: 15 });
    expect(hoje['item-2']).toMatchObject({ kind: 'keep', reason: 'no_history' });
  });

  it('próxima vez: a sessão de hoje vem antes do histórico', () => {
    const proxima = nextTimeSuggestions(
      [supino, prancha],
      {
        'item-1': [
          { reps: 10, carga: 12.5 },
          { reps: 10, carga: 12.5 },
        ],
      },
      { 'item-1': 'hard' },
      { 'item-1': [{ maxWeightKg: 12.5, effort: 'hard' }] }
    );

    expect(proxima['item-1']).toMatchObject({ kind: 'decrease', reason: 'hard_twice' });
    // A prancha não foi feita hoje: nada a sugerir.
    expect(proxima['item-2']).toBeUndefined();
  });

  it('aplicar: só a carga que muda, como a prescrição escreve', () => {
    const weights = weightsToApply([supino, prancha], {
      'item-1': { kind: 'increase', weightKg: 12.5, deltaKg: 2.5, reason: 'easy' },
      'item-2': { kind: 'add_seconds', seconds: 10, reason: 'easy' },
    });

    expect(weights).toEqual({ 'item-1': '12,5' });
  });
});
