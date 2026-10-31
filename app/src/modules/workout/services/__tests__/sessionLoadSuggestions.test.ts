import { simplePrescriptionToSetPlan, type WorkoutExercise } from '@elevapro/shared';
import { nextTimeSuggestions, todaySuggestions, weightsToApply } from '../sessionLoadSuggestions';

const comPlano = (id: string, weight: string | null, reps: string) =>
  ({
    id,
    set_plan: simplePrescriptionToSetPlan({ sets: 3, reps, weight, rest_seconds: 60 }).plan,
  }) as WorkoutExercise;
const supino = comPlano('item-1', '10', '10-12');
const prancha = comPlano('item-2', null, '40 s');

describe('as cargas da sessão', () => {
  it('hoje: sobe a carga de quem achou fácil, e sem histórico mantém a prescrição', () => {
    const hoje = todaySuggestions(
      [supino, prancha],
      { 'item-1': [{ maxWeightKg: 12.5, effort: 'easy' }] },
      { deload: false, returnWeek: false }
    );

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

  it('na semana de retorno do Modo Descanso, a carga de hoje cai', () => {
    const hoje = todaySuggestions(
      [supino],
      { 'item-1': [{ maxWeightKg: 20, effort: 'easy' }] },
      { deload: false, returnWeek: true }
    );
    expect(hoje['item-1']).toMatchObject({ kind: 'decrease', weightKg: 16, reason: 'return' });
  });
});
