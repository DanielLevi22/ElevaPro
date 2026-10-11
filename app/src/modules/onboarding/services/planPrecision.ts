/**
 * As respostas de que a meta depende: a fórmula (Mifflin-St Jeor × atividade,
 * ADR-0044) não fecha sem elas. Os dias de treino chegam em O6.
 */
const TARGET_INPUTS = ['main_goal', 'age', 'gender', 'height', 'weight', 'training_days'] as const;

/** A mesma escala da anamnese adaptativa: 30 é o plano genérico, 94 o teto. */
const GENERIC = 30;
const SPAN = 64;

export type PrecisionLevel = 'Baixa' | 'Média' | 'Alta';

/**
 * Quanto do plano sai da pessoa, e não de padrão: a barra de O4.
 *
 * @example planPrecision({ main_goal: 'Hipertrofia', age: 29, gender: 'Feminino', height: 172, weight: 78 })
 * // { percent: 83, level: 'Alta' }
 */
export function planPrecision(answers: Record<string, unknown>): {
  percent: number;
  level: PrecisionLevel;
} {
  const answered = TARGET_INPUTS.filter((key) => answers[key] !== undefined).length;
  const percent = GENERIC + Math.round((answered / TARGET_INPUTS.length) * SPAN);
  return { percent, level: levelOf(percent) };
}

function levelOf(percent: number): PrecisionLevel {
  if (percent >= 80) return 'Alta';
  return percent >= 60 ? 'Média' : 'Baixa';
}
