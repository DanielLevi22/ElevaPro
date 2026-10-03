import { ROUTES } from '@/navigation/types';

/**
 * Quais exercícios do treino levam à Análise de Técnica (#361).
 *
 * O exercício só tem nome — o catálogo não guarda um código de movimento —, e
 * por isso a decisão é uma lista deliberada, não uma busca por "agachamento".
 * O critério calibrado (quadril abaixo da linha do joelho, filmado de lado; ver
 * `ADR-0023`) vale para o agachamento bilateral. Unilateral e máquina mudam a
 * geometria: búlgaro e afundo ficam de fora, e hack e pistol também.
 *
 * Mora em `shared/` porque o treino oferece a entrada e o módulo de técnica é
 * o destino: módulo não importa módulo.
 */
const SQUAT_WORDS = ['agachamento', 'squat'];
const NOT_THE_CALIBRATED_SQUAT = [
  'bulgaro',
  'bulgarian',
  'split',
  'afundo',
  'hack',
  'pistol',
  'unilateral',
];

function normalize(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * A tela de análise do exercício, ou `null` quando o app não sabe analisá-lo.
 *
 * @example techniqueRouteFor('Agachamento livre') // '/tecnica/agachamento'
 * @example techniqueRouteFor('Agachamento búlgaro') // null
 */
export function techniqueRouteFor(
  exerciseName: string | null | undefined
): typeof ROUTES.TECHNIQUE.SQUAT | null {
  if (!exerciseName) return null;
  const name = normalize(exerciseName);
  const isSquat = SQUAT_WORDS.some((word) => name.includes(word));
  const isExcluded = NOT_THE_CALIBRATED_SQUAT.some((word) => name.includes(word));
  return isSquat && !isExcluded ? ROUTES.TECHNIQUE.SQUAT : null;
}
