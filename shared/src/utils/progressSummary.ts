import type { DailyGoal, StudentStreak } from "../types/gamification.types";
import { addDays, weekdayFromMonday } from "./dateOnly";

/**
 * Os números do hub de Progresso (issue #312): treinos, aderência e dias top
 * dos últimos 30 dias contra os 30 anteriores, com a série de 8 semanas.
 *
 * Mora no `shared` porque é regra, não desenho: o relatório do período lê as
 * mesmas contas, e uma tela não pode dizer 34 treinos onde a outra diz 33.
 */

/** Um número do hub: o valor do período, a diferença para o anterior e a série. */
export interface TrendNumber {
  value: number | null;
  delta: number | null;
  /** Oito semanas, da mais antiga à atual; `null` é semana sem meta. */
  spark: (number | null)[];
}

export interface ProgressSummary {
  workouts: TrendNumber;
  adherence: TrendNumber;
  topDays: TrendNumber;
}

const PERIOD_DAYS = 30;
const SPARK_WEEKS = 8;
const WEEK_DAYS = 7;
const PERCENT = 100;

/** Como cada número sai de uma janela de dias; `null` é não haver o que medir. */
type Measure = (goals: readonly DailyGoal[]) => number | null;

const countWorkouts: Measure = (goals) => sumOf(goals, (goal) => goal.workout_completed);

/**
 * Refeições feitas sobre planejadas. Limitada a 100: comer além do plano não é
 * aderir mais a ele. Sem refeição planejada é `null`, e não 0%.
 */
const mealAdherence: Measure = (goals) => {
  const target = sumOf(goals, (goal) => goal.meals_target);
  if (target === 0) return null;
  const done = sumOf(goals, (goal) => Math.min(goal.meals_completed, goal.meals_target));
  return Math.round((done / target) * PERCENT);
};

/** O dia em que as duas metas existiam e foram batidas. */
function isTopDay(goal: DailyGoal): boolean {
  return workoutMet(goal) && mealsMet(goal);
}

function workoutMet(goal: DailyGoal): boolean {
  return goal.workout_target > 0 && goal.workout_completed >= goal.workout_target;
}

function mealsMet(goal: DailyGoal): boolean {
  return goal.meals_target > 0 && goal.meals_completed >= goal.meals_target;
}

const countTopDays: Measure = (goals) => goals.filter(isTopDay).length;

/**
 * @example
 * const { workouts } = summarizeProgress(history, "2026-09-15");
 * workouts.value // treinos de 17/08 a 15/09
 */
export function summarizeProgress(goals: readonly DailyGoal[], today: string): ProgressSummary {
  return {
    workouts: trend(goals, today, countWorkouts),
    adherence: trend(goals, today, mealAdherence),
    topDays: trend(goals, today, countTopDays),
  };
}

function trend(goals: readonly DailyGoal[], today: string, measure: Measure): TrendNumber {
  const value = measure(inWindow(goals, today, PERIOD_DAYS));
  const previous = measure(inWindow(goals, addDays(today, -PERIOD_DAYS), PERIOD_DAYS));
  const delta = value === null || previous === null ? null : value - previous;
  return { value, delta, spark: weeklySeries(goals, today, measure) };
}

/** Semanas de sete dias terminando hoje, da mais antiga à atual. */
function weeklySeries(goals: readonly DailyGoal[], today: string, measure: Measure) {
  return Array.from({ length: SPARK_WEEKS }, (_, index) => {
    const weeksBack = SPARK_WEEKS - 1 - index;
    return measure(inWindow(goals, addDays(today, -weeksBack * WEEK_DAYS), WEEK_DAYS));
  });
}

/** Os dias de `length` dias terminando em `end`, inclusive. */
function inWindow(goals: readonly DailyGoal[], end: string, length: number): DailyGoal[] {
  const start = addDays(end, -(length - 1));
  return goals.filter((goal) => goal.date >= start && goal.date <= end);
}

function sumOf(goals: readonly DailyGoal[], pick: (goal: DailyGoal) => number): number {
  return goals.reduce((total, goal) => total + (pick(goal) ?? 0), 0);
}

/** 0 nada; 1 algo feito; 2 uma meta batida; 3 as duas, o dia top. */
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
 * @example consistencyWeeks(history, "2026-09-15")[12][0].date // "2026-09-14"
 */
export function consistencyWeeks(goals: readonly DailyGoal[], today: string): ConsistencyDay[][] {
  const byDate = new Map(goals.map((goal) => [goal.date, goal]));
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

function levelOf(goal: DailyGoal | undefined): ConsistencyLevel {
  if (!goal) return 0;
  if (isTopDay(goal)) return 3;
  if (workoutMet(goal) || mealsMet(goal)) return 2;
  return goal.workout_completed > 0 || goal.meals_completed > 0 ? 1 : 0;
}

export interface StreakStanding {
  current: number;
  best: number;
  /** Dias que faltam para empatar com o recorde; zero quando já é o recorde. */
  toTie: number;
}

/**
 * @example streakStanding(streak) // { current: 12, best: 18, toTie: 6 }
 */
export function streakStanding(
  streak: Pick<StudentStreak, "current_streak" | "longest_streak"> | null,
): StreakStanding {
  const current = streak?.current_streak ?? 0;
  const best = Math.max(streak?.longest_streak ?? 0, current);
  return { current, best, toTie: best - current };
}
