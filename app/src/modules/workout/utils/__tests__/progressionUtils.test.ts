import type { SessionItem, WorkoutItem } from '../../types';
import { analyzeExerciseProgression, calculateMetricChange } from '../progressionUtils';

/**
 * A carga anterior sai de `weight_actual` — o que o aluno levantou —, não do
 * prescrito. Antes vinha do primeiro item de `sets_data`, um JSON que misturava
 * os dois; a coluna saiu na 0023.
 */

const exercicio = (weight: string): WorkoutItem =>
  ({ id: 'we-1', weight, reps: '10' }) as unknown as WorkoutItem;

const sessao = (sets: SessionItem['sets']): SessionItem => ({
  workout_exercise_id: 'we-1',
  sets,
});

const serie = (weight: number | null, completed = true) => ({
  set_index: 0,
  reps_actual: 10,
  weight_actual: weight,
  completed,
});

describe('calculateMetricChange', () => {
  it('reconhece melhora, piora e manutenção', () => {
    expect(calculateMetricChange(50, 40, 'kg')).toMatchObject({
      type: 'improved',
      diff: '+10.0kg',
    });
    expect(calculateMetricChange(30, 40, 'kg')).toMatchObject({
      type: 'decreased',
      diff: '-10.0kg',
    });
    expect(calculateMetricChange(40, 40, 'kg')).toMatchObject({ type: 'maintained', diff: '=' });
  });

  it('não inventa métrica quando não houve treino dos dois lados', () => {
    expect(calculateMetricChange(0, 0, 'kg')).toBeNull();
  });
});

describe('analyzeExerciseProgression', () => {
  it('compara com a maior carga executada, não com a primeira série', () => {
    const anterior = sessao([
      serie(30),
      { ...serie(45), set_index: 1 },
      { ...serie(40), set_index: 2 },
    ]);

    const analise = analyzeExerciseProgression(exercicio('50'), anterior, 3);

    expect(analise.weight).toMatchObject({ type: 'improved', previous: 45, current: 50 });
  });

  it('ignora série sem carga registrada', () => {
    const anterior = sessao([serie(null), { ...serie(20), set_index: 1 }]);

    const analise = analyzeExerciseProgression(exercicio('25'), anterior, 2);

    expect(analise.weight).toMatchObject({ previous: 20, current: 25 });
  });

  // Série pulada não é evolução nem regressão: contá-la faria o aluno parecer
  // ter feito mais do que fez.
  it('conta apenas série concluída na progressão de séries', () => {
    const anterior = sessao([
      serie(40),
      { ...serie(40), set_index: 1, completed: false },
      { ...serie(40), set_index: 2 },
    ]);

    const analise = analyzeExerciseProgression(exercicio('40'), anterior, 3);

    expect(analise.sets).toMatchObject({ type: 'improved', previous: 2, current: 3 });
  });

  it('aguenta sessão anterior sem série nenhuma', () => {
    const analise = analyzeExerciseProgression(exercicio('40'), sessao([]), 3);

    expect(analise.weight).toMatchObject({ type: 'improved', previous: 0, current: 40 });
    expect(analise.sets).toMatchObject({ previous: 0, current: 3 });
  });
});
