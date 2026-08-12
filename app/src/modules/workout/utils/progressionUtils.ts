import type { ProgressionAnalysis, ProgressionMetric, SessionItem, WorkoutItem } from '../types';

/**
 * Calculates the change between current and previous metric values
 * @param current - Current metric value
 * @param previous - Previous metric value
 * @param unit - Unit of measurement (e.g., 'kg', 'reps')
 * @returns ProgressionMetric object or null if no change or values are zero
 */
export function calculateMetricChange(
  current: number,
  previous: number,
  unit: string
): ProgressionMetric | null {
  if (current === 0 && previous === 0) return null;

  if (current > previous) {
    return {
      type: 'improved',
      diff: `+${(current - previous).toFixed(1)}${unit}`,
      previous,
      current,
    };
  } else if (current < previous) {
    return {
      type: 'decreased',
      diff: `-${(previous - current).toFixed(1)}${unit}`,
      previous,
      current,
    };
  } else if (current > 0) {
    return {
      type: 'maintained',
      diff: '=',
      previous,
      current,
    };
  }

  return null;
}

/**
 * Progressão de carga e de séries entre a sessão anterior e a atual.
 *
 * A carga anterior sai de `weight_actual` — o que o aluno levantou —, não do
 * prescrito. Antes vinha do primeiro item de `sets_data`, um JSON que misturava
 * prescrito e executado; a coluna saiu na `0023`.
 *
 * @example
 * analyzeExerciseProgression(exercicioAtual, sessaoAnterior, 4)
 */
export function analyzeExerciseProgression(
  currentItem: WorkoutItem,
  previousSessionItem: SessionItem,
  currentSetsCompleted: number
): ProgressionAnalysis {
  const analysis: ProgressionAnalysis = {};

  const currentWeight = parseFloat(String(currentItem.weight)) || 0;
  const previousWeight = heaviestSet(previousSessionItem);

  const weightChange = calculateMetricChange(currentWeight, previousWeight, 'kg');
  if (weightChange) {
    analysis.weight = weightChange;
  }

  // Só série concluída conta: série pulada não é evolução nem regressão.
  const previousSetsCompleted =
    previousSessionItem.sets?.filter((set) => set.completed).length || 0;

  if (currentSetsCompleted > 0 || previousSetsCompleted > 0) {
    const setsChange = calculateMetricChange(currentSetsCompleted, previousSetsCompleted, '');
    if (setsChange) {
      analysis.sets = {
        ...setsChange,
        diff: setsChange.diff.replace(/\.0$/, ''),
      };
    }
  }

  return analysis;
}

/** Maior carga executada do exercício na sessão. */
function heaviestSet(item: SessionItem): number {
  let heaviest = 0;
  for (const set of item.sets ?? []) {
    if (set.weight_actual != null && set.weight_actual > heaviest) heaviest = set.weight_actual;
  }
  return heaviest;
}
