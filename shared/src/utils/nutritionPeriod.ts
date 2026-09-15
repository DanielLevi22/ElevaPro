import { addDays, withinDays } from "./dateOnly";
import { mealAdherence } from "./progressSummary";

/**
 * A nutrição em números (issue #312): aderência, média de calorias e de proteína
 * das últimas 12 semanas contra as 12 anteriores, as séries dos gráficos e os
 * macros médios.
 *
 * Recebe o dia já somado: quanto cada refeição rende é regra do módulo de nutrição
 * (`consumoDoDia`), e aqui só se conta o período.
 */

export interface DailyIntake {
  date: string;
  plannedMeals: number;
  doneMeals: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PeriodNumber {
  value: number | null;
  delta: number | null;
  /** Oito semanas, da mais antiga à atual; `null` é semana sem dado. */
  spark: (number | null)[];
}

export interface NutritionPeriod {
  adherence: PeriodNumber;
  calories: PeriodNumber;
  protein: PeriodNumber;
  /** A aderência de cada uma das últimas 8 semanas. */
  weeklyAdherence: (number | null)[];
  /** A média diária de calorias de cada uma das 12 semanas. */
  weeklyCalories: (number | null)[];
  macros: { protein: number; carbs: number; fat: number } | null;
}

const PERIOD_WEEKS = 12;
const COLUMN_WEEKS = 8;
const WEEK_DAYS = 7;

type Measure = (days: readonly DailyIntake[]) => number | null;

/** Dia sem nada registrado não é dia de zero caloria: fica fora da média. */
function averageOf(pick: (day: DailyIntake) => number): Measure {
  return (days) => {
    const logged = days.filter((day) => day.calories > 0);
    if (logged.length === 0) return null;
    return Math.round(logged.reduce((total, day) => total + pick(day), 0) / logged.length);
  };
}

const averageCalories = averageOf((day) => day.calories);
const averageProtein = averageOf((day) => day.protein);

/**
 * @example summarizeNutrition(days, "2026-09-15").calories.value // 2180
 */
export function summarizeNutrition(days: readonly DailyIntake[], today: string): NutritionPeriod {
  const current = withinDays(days, today, PERIOD_WEEKS * WEEK_DAYS);
  return {
    adherence: periodNumber(days, today, mealAdherence),
    calories: periodNumber(days, today, averageCalories),
    protein: periodNumber(days, today, averageProtein),
    weeklyAdherence: weekly(days, today, COLUMN_WEEKS, mealAdherence),
    weeklyCalories: weekly(days, today, PERIOD_WEEKS, averageCalories),
    macros: macrosOf(current),
  };
}

function periodNumber(days: readonly DailyIntake[], today: string, measure: Measure): PeriodNumber {
  const length = PERIOD_WEEKS * WEEK_DAYS;
  const value = measure(withinDays(days, today, length));
  const previous = measure(withinDays(days, addDays(today, -length), length));
  const delta = value === null || previous === null ? null : value - previous;
  return { value, delta, spark: weekly(days, today, COLUMN_WEEKS, measure) };
}

function weekly(days: readonly DailyIntake[], today: string, weeks: number, measure: Measure) {
  return Array.from({ length: weeks }, (_, index) => {
    const end = addDays(today, -(weeks - 1 - index) * WEEK_DAYS);
    return measure(withinDays(days, end, WEEK_DAYS));
  });
}

function macrosOf(days: readonly DailyIntake[]): NutritionPeriod["macros"] {
  const protein = averageProtein(days);
  if (protein === null) return null;
  return {
    protein,
    carbs: averageOf((day) => day.carbs)(days) ?? 0,
    fat: averageOf((day) => day.fat)(days) ?? 0,
  };
}
