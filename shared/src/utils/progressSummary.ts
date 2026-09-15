import type { DailyActivity } from "./dailyActivity";
import { addDays, weekdayFromMonday } from "./dateOnly";
import { type Trend, trendOver, type WindowMeasure } from "./periodTrend";

/**
 * Os números do hub de Progresso (issue #312): treinos, aderência e dias top
 * dos últimos 30 dias contra os 30 anteriores, o heatmap e a sequência.
 *
 * Mora no `shared` porque é regra, não desenho: o relatório do período lê as
 * mesmas contas, e uma tela não pode dizer 34 treinos onde a outra diz 33.
 */

export interface ProgressSummary {
  workouts: Trend;
  adherence: Trend;
  topDays: Trend;
}

const PERIOD_DAYS = 30;
const WEEK_DAYS = 7;
const PERCENT = 100;

const countWorkouts: WindowMeasure<DailyActivity> = (days) =>
  days.reduce((total, day) => total + day.workouts, 0);

/**
 * Refeições feitas sobre planejadas, a regra da aderência da semana (#298). Sem
 * refeição planejada é `null`, e não 0%.
 *
 * @example mealAdherence([{ plannedMeals: 5, doneMeals: 4 }]) // 80
 */
export const mealAdherence = (
  days: readonly Pick<DailyActivity, "plannedMeals" | "doneMeals">[],
): number | null => {
  const planned = days.reduce((total, day) => total + day.plannedMeals, 0);
  if (planned === 0) return null;
  const done = days.reduce((total, day) => total + day.doneMeals, 0);
  return Math.round((done / planned) * PERCENT);
};

/** O plano do dia existia e foi cumprido inteiro. */
function mealsMet(day: DailyActivity): boolean {
  return day.plannedMeals > 0 && day.doneMeals >= day.plannedMeals;
}

/** Sessão concluída e plano do dia cumprido. */
function isTopDay(day: DailyActivity): boolean {
  return day.workouts > 0 && mealsMet(day);
}

const countTopDays: WindowMeasure<DailyActivity> = (days) => days.filter(isTopDay).length;

/**
 * Os três números do hub nos últimos 30 dias, contra os 30 anteriores, com a
 * série de 8 semanas de cada um.
 *
 * @example
 * const { workouts } = summarizeProgress(days, "2026-09-15");
 * workouts.value // sessões de 17/08 a 15/09
 */
export function summarizeProgress(days: readonly DailyActivity[], today: string): ProgressSummary {
  return {
    workouts: trendOver(days, today, PERIOD_DAYS, countWorkouts),
    adherence: trendOver(days, today, PERIOD_DAYS, mealAdherence),
    topDays: trendOver(days, today, PERIOD_DAYS, countTopDays),
  };
}

/** 0 nada; 1 refeição registrada; 2 treino ou plano cumprido; 3 os dois, o dia top. */
export type ConsistencyLevel = 0 | 1 | 2 | 3;

export interface ConsistencyDay {
  date: string;
  level: ConsistencyLevel;
  future: boolean;
}

const CONSISTENCY_WEEKS = 13;

/**
 * As semanas do heatmap, de segunda a domingo, com a semana de hoje por último.
 *
 * @example consistencyWeeks(days, "2026-09-15")[12][0].date // "2026-09-14"
 */
export function consistencyWeeks(
  days: readonly DailyActivity[],
  today: string,
): ConsistencyDay[][] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const firstMonday = addDays(
    today,
    -weekdayFromMonday(today) - (CONSISTENCY_WEEKS - 1) * WEEK_DAYS,
  );
  return Array.from({ length: CONSISTENCY_WEEKS }, (_, week) =>
    Array.from({ length: WEEK_DAYS }, (_, weekday) => {
      const date = addDays(firstMonday, week * WEEK_DAYS + weekday);
      return { date, level: levelOf(byDate.get(date)), future: date > today };
    }),
  );
}

function levelOf(day: DailyActivity | undefined): ConsistencyLevel {
  if (!day) return 0;
  if (isTopDay(day)) return 3;
  if (day.workouts > 0 || mealsMet(day)) return 2;
  return day.loggedMeals > 0 ? 1 : 0;
}

export interface StreakStanding {
  current: number;
  best: number;
  /** Dias que faltam para empatar com o recorde; zero quando já é o recorde. */
  toTie: number;
}

/**
 * A sequência de dias com treino concluído ou refeição registrada.
 *
 * Calculada, e não lida de `student_streaks`: nada grava naquela tabela (#312).
 * Hoje sem nada ainda não quebra a sequência, porque o dia não acabou.
 *
 * @example activityStreak(days, "2026-09-15") // { current: 12, best: 18, toTie: 6 }
 */
export function activityStreak(days: readonly DailyActivity[], today: string): StreakStanding {
  const active = new Set(days.filter(isActive).map((day) => day.date));
  let cursor = active.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const best = Math.max(longestRun(active), current);
  return { current, best, toTie: best - current };
}

function isActive(day: DailyActivity): boolean {
  return day.workouts > 0 || day.loggedMeals > 0;
}

function longestRun(active: ReadonlySet<string>): number {
  let best = 0;
  for (const date of active) {
    if (active.has(addDays(date, -1))) continue;
    let length = 1;
    while (active.has(addDays(date, length))) length++;
    best = Math.max(best, length);
  }
  return best;
}
