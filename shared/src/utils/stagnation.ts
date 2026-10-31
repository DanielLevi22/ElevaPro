import { addDays } from "./dateOnly";
import { type CheckInLogging, PACE_TOLERANCE_KG } from "./weeklyRecalibration";

/**
 * A estagnação que antecipa a reavaliação (#376): três semanas seguidas com a
 * meta seguida e o peso sem andar para o objetivo. Aí o passo semanal de
 * calorias já não basta, e o bloco pode ser refeito antes do fim.
 *
 * Os valores são provisórios e esperam a validação do CRN (ADR-0044).
 */

/** Provisório (CRN): as semanas seguidas que contam como estagnação. */
export const STALL_WEEKS = 3;

/** Provisório (CRN): abaixo deste ritmo por semana, a meta é manter o peso. */
const MAINTENANCE_KG_PER_WEEK = 0.05;

/** Seguir a meta é registrar tudo, ou seguir sem registrar: as outras não contam. */
const FOLLOWED: readonly CheckInLogging[] = ["all", "followed_unlogged"];

export interface StallCheckIn {
  weekStart: string;
  logging: CheckInLogging;
}

export interface StallWeight {
  assessedAt: string;
  weightKg: number;
}

export interface StallInput {
  /** Os check-ins mais recentes, do mais novo ao mais antigo. */
  checkIns: StallCheckIn[];
  /** Os pesos declarados, do mais novo ao mais antigo. */
  weights: StallWeight[];
  /** O ritmo que a meta promete por semana: negativo é perda. */
  expectedWeeklyKg: number;
}

/**
 * A semana do check-in que fechou a estagnação, ou nula. A semana serve de
 * chave: "Agora não" vale até um check-in novo mudar o quadro.
 *
 * @example
 * stalledWeek({ checkIns: tresSemanasSeguidas, weights, expectedWeeklyKg: -0.5 }) // "2026-10-12"
 */
export function stalledWeek(input: StallInput): string | null {
  if (Math.abs(input.expectedWeeklyKg) < MAINTENANCE_KG_PER_WEEK) return null;
  const weeks = input.checkIns.slice(0, STALL_WEEKS);
  if (weeks.length < STALL_WEEKS || !consecutiveAndFollowed(weeks)) return null;

  const newest = weeks[0] as StallCheckIn;
  const oldest = weeks[STALL_WEEKS - 1] as StallCheckIn;
  const latest = input.weights[0];
  const before = input.weights.find((point) => point.assessedAt.slice(0, 10) < oldest.weekStart);
  if (!latest || !before || latest.assessedAt.slice(0, 10) < newest.weekStart) return null;

  // O quanto andou para o objetivo: positivo é na direção certa.
  const progress = (latest.weightKg - before.weightKg) * Math.sign(input.expectedWeeklyKg);
  return progress < PACE_TOLERANCE_KG ? newest.weekStart : null;
}

/** Semanas seguidas, sem buraco, e todas com a meta seguida. */
function consecutiveAndFollowed(weeks: StallCheckIn[]): boolean {
  return weeks.every((week, index) => {
    const previous = weeks[index - 1];
    const followsPrevious = !previous || week.weekStart === addDays(previous.weekStart, -7);
    return followsPrevious && FOLLOWED.includes(week.logging);
  });
}
