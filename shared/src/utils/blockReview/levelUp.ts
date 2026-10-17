/**
 * Subir de nível (#376, A7): depois de 8 semanas fazendo 80% dos treinos, o
 * Praticante iniciante (ou voltando) recebe a proposta de intermediário. É
 * proposta, e não aviso: só muda com a aprovação da pessoa (ADR-0020).
 *
 * Provisório: espera a validação do CREF (ADR-0044).
 */

/** As semanas olhadas para trás: dois blocos de 4. */
export const LEVEL_UP_WEEKS = 8;
const LEVEL_UP_RATE = 0.8;
const ELIGIBLE_TRACKS = ["beginner", "returning"];

export interface LevelUpInput {
  track: string | null;
  /** Treinos de força concluídos nas últimas 8 semanas. */
  done: number;
  /** Treinos com dia por semana no plano; nulo sem plano. */
  plannedPerWeek: number | null;
  /** Há quantas semanas a pessoa tem plano: menos de 8 não tem histórico para subir. */
  weeksWithPlan: number;
}

/**
 * @example canLevelUp({ track: "beginner", done: 26, plannedPerWeek: 4, weeksWithPlan: 8 }) // true
 */
export function canLevelUp(input: LevelUpInput): boolean {
  if (!input.track || !ELIGIBLE_TRACKS.includes(input.track)) return false;
  if (!input.plannedPerWeek || input.weeksWithPlan < LEVEL_UP_WEEKS) return false;
  return input.done >= input.plannedPerWeek * LEVEL_UP_WEEKS * LEVEL_UP_RATE;
}
