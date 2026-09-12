import type { DailyGoal } from '@elevapro/shared';

/**
 * A frase sob o anel: o que falta para fechar o dia.
 *
 * O anel diz **quanto** falta; esta frase diz **o quê**. Sem ela a pessoa vê
 * 68% e não sabe o que fazer — foi por isso que o kit a desenhou logo abaixo.
 *
 * Mora fora da tela porque é concordância, não apresentação: "falta 1 treino"
 * contra "faltam 2 refeições", e as duas juntas num só verbo no plural.
 *
 * @example
 * faltaParaFecharODia({ meals_target: 4, meals_completed: 2, workout_target: 1,
 *   workout_completed: 0 })
 * // 'Falta 1 treino e faltam 2 refeições para fechar o dia.'
 */
type MetaDoDia = Pick<
  DailyGoal,
  'meals_target' | 'meals_completed' | 'workout_target' | 'workout_completed'
>;

const DIA_FECHADO = 'Dia fechado. Amanhã tem mais.';

export function faltaParaFecharODia(meta: MetaDoDia | null): string {
  if (!meta) return '';

  const treinos = Math.max(0, meta.workout_target - meta.workout_completed);
  const refeicoes = Math.max(0, meta.meals_target - meta.meals_completed);

  const partes = [
    emFalta(treinos, 'treino', 'treinos'),
    emFalta(refeicoes, 'refeição', 'refeições'),
  ]
    .filter(Boolean)
    .join(' e ');

  if (!partes) return DIA_FECHADO;
  return `${maiuscula(partes)} para fechar o dia.`;
}

/**
 * Concorda o verbo com o próprio número, e não com o total da frase.
 *
 * "Falta 1 treino e faltam 2 refeições" é a forma correta em português: cada
 * sujeito leva seu verbo. Um verbo só no plural — "faltam 1 treino e 2
 * refeições" — erra o primeiro.
 *
 * Sai sempre em minúscula; quem monta a frase levanta a inicial. Capitalizar
 * aqui daria "Faltam 2 refeições" no meio da oração composta.
 */
function emFalta(quantidade: number, singular: string, plural: string): string {
  if (quantidade <= 0) return '';
  if (quantidade === 1) return `falta 1 ${singular}`;
  return `faltam ${quantidade} ${plural}`;
}

function maiuscula(frase: string): string {
  return frase[0].toUpperCase() + frase.slice(1);
}
