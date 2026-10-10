import { DEFAULT_TRAINING_DAYS } from "@elevapro/shared";

/**
 * As escolhas do onboarding, lidas das respostas gravadas na anamnese, com o
 * padrão de quem tocou em "Pular por enquanto" (#365).
 *
 * Os padrões são provisórios (ADR-0044): 3 dias cobrem o mínimo de força da
 * OMS com cada músculo 2× por semana em corpo inteiro; 45 min e 4 refeições são
 * o meio das opções que o próprio onboarding oferece.
 */

export interface PlanChoices {
  trainingDays: number;
  sessionMinutes: number;
  place: string;
  homeEquipment: string[];
  sports: string[];
  mealsPerDay: number;
  foodExclusions: string[];
  dietStyle: string;
  foodBudget: string | null;
}

const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [30, 45, 60, 90];
const MEALS = [3, 4, 5, 6];
const PLACES = ["Academia completa", "Home gym", "Ao ar livre"];
const STYLES = ["Onívoro", "Vegetariano", "Vegano"];

const oneOf = <T>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * @example readPlanChoices({ training_days: 4 }).trainingDays // 4
 */
export function readPlanChoices(answers: Record<string, unknown>): PlanChoices {
  return {
    trainingDays: oneOf(answers.training_days, DAYS, DEFAULT_TRAINING_DAYS),
    sessionMinutes: oneOf(answers.training_duration, MINUTES, 45),
    place: oneOf(answers.gym_type, PLACES, "Academia completa"),
    homeEquipment: strings(answers.home_equipment),
    sports: strings(answers.sports),
    mealsPerDay: oneOf(answers.meals_per_day, MEALS, 4),
    foodExclusions: strings(answers.food_exclusions),
    dietStyle: oneOf(answers.diet_style, STYLES, "Onívoro"),
    foodBudget: typeof answers.food_budget === "string" ? answers.food_budget : null,
  };
}

/**
 * Os exercícios de força que cabem no local. Fora da academia, só o que o
 * catálogo marca como de casa ou dos dois lugares.
 *
 * @example allowedExerciseNames(catalogo, "Home gym") // ["Flexão de braço", …]
 */
export function allowedExerciseNames(
  catalog: readonly { name: string; venue: string | null; category: string | null }[],
  place: string,
): string[] {
  const gym = place === "Academia completa";
  return catalog
    .filter((exercise) => exercise.category === "forca")
    .filter((exercise) => gym || exercise.venue === "casa" || exercise.venue === "ambos")
    .map((exercise) => exercise.name);
}
