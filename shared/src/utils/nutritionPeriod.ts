import { withinDays } from "./dateOnly";
import { type Trend, trendOver, type WindowMeasure, weeklyValues } from "./periodTrend";
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

export interface NutritionPeriod {
  adherence: Trend;
  calories: Trend;
  protein: Trend;
  /** A aderência de cada uma das 12 semanas. */
  weeklyAdherence: (number | null)[];
  /** A média diária de calorias de cada uma das 12 semanas. */
  weeklyCalories: (number | null)[];
  macros: { protein: number; carbs: number; fat: number } | null;
}

const PERIOD_WEEKS = 12;
const PERIOD_DAYS = PERIOD_WEEKS * 7;

type Measure = WindowMeasure<DailyIntake>;

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
 * Os números da nutrição das últimas 12 semanas contra as 12 anteriores, as séries
 * semanais dos dois gráficos e os macros médios do período.
 *
 * @example summarizeNutrition(days, "2026-09-15").calories.value // 2180
 */
export function summarizeNutrition(days: readonly DailyIntake[], today: string): NutritionPeriod {
  return {
    adherence: trendOver(days, today, PERIOD_DAYS, mealAdherence),
    calories: trendOver(days, today, PERIOD_DAYS, averageCalories),
    protein: trendOver(days, today, PERIOD_DAYS, averageProtein),
    weeklyAdherence: weeklyValues(days, today, PERIOD_WEEKS, mealAdherence),
    weeklyCalories: weeklyValues(days, today, PERIOD_WEEKS, averageCalories),
    macros: macrosOf(withinDays(days, today, PERIOD_DAYS)),
  };
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
