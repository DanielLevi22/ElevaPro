import type { CreateDietMealInput, DietPlanType } from "../types/nutrition.types";

/**
 * As estratégias de dieta e o molde de semana que cada uma sugere.
 *
 * Mora no `shared` desde a #337: web e mobile tinham cada um a sua cópia, já
 * divergentes (o mobile não tinha a "Personalizada" e sugeria outras
 * refeições), e a mesma escolha gravava planos diferentes em cada plataforma.
 */

export type DietStrategyType =
  | "standard"
  | "carb_cycling"
  | "ketogenic"
  | "intermittent_fasting"
  | "manual";

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface MealTemplate {
  name: string;
  time: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
}

export interface DayTemplate {
  dayOfWeek: number;
  label: string;
  description: string;
  macros: MacroSplit;
  meals: MealTemplate[];
  /** Horário em que a estratégia admite refeição, quando ela restringe (jejum). */
  mealWindow?: { from: string; to: string };
}

export interface StrategyResult {
  averageMacros: MacroSplit;
  weeklySchedule: DayTemplate[];
  description: string;
}

/**
 * O ícone fica de fora de propósito: cada plataforma tem a sua biblioteca, e
 * o nome de um ícone do web não existe no mobile.
 */
export const DIET_STRATEGIES: Record<
  DietStrategyType,
  { label: string; description: string; planType: DietPlanType }
> = {
  standard: {
    label: "Padrão Balanceada",
    description: "Equilíbrio constante de macros todos os dias. Ideal para iniciantes.",
    planType: "unique",
  },
  carb_cycling: {
    label: "Ciclo de Carboidratos",
    description: "Alterna dias de alto e baixo carbo para maximizar ganho de massa.",
    planType: "cyclic",
  },
  ketogenic: {
    label: "Cetogênica",
    description: "Baixo carbo e alta gordura para forçar o corpo a usar gordura como energia.",
    planType: "unique",
  },
  intermittent_fasting: {
    label: "Jejum Intermitente",
    description: "Janela de alimentação de 8h. Ideal para controle de insulina.",
    planType: "unique",
  },
  manual: {
    label: "Personalizado",
    description: "Crie sua própria estrutura do zero sem sugestões automáticas.",
    planType: "unique",
  },
};

export const DIET_STRATEGY_TYPES = Object.keys(DIET_STRATEGIES) as DietStrategyType[];

const BASE_MEALS: MealTemplate[] = [
  { name: "Café da Manhã", time: "08:00", type: "breakfast" },
  { name: "Almoço", time: "13:00", type: "lunch" },
  { name: "Lanche da Tarde", time: "16:00", type: "snack" },
  { name: "Jantar", time: "20:00", type: "dinner" },
];

const FASTING_MEALS: MealTemplate[] = [
  { name: "Quebra-Jejum (Almoço)", time: "12:00", type: "lunch" },
  { name: "Lanche da Tarde", time: "15:00", type: "snack" },
  { name: "Jantar (Pós-treino)", time: "19:00", type: "dinner" },
  { name: "Ceia", time: "20:00", type: "snack" },
];

// Para completar o dia quando a preferência pede mais refeições que o molde,
// na ordem em que entram.
const EXTRA_MEALS: MealTemplate[] = [
  { name: "Lanche da Manhã", time: "10:30", type: "snack" },
  { name: "Ceia", time: "22:00", type: "snack" },
  { name: "Pré-Treino", time: "17:30", type: "snack" },
  { name: "Lanche da Noite", time: "21:00", type: "snack" },
];

// Para tirar refeição quando a preferência pede menos: o lanche sai primeiro,
// o almoço por último.
const DROP_ORDER: MealTemplate["type"][] = ["snack", "breakfast", "dinner", "lunch"];

const FASTING_WINDOW = { from: "12:00", to: "20:00" };

// O molde precisa comportar todas as quantidades aceitas pela preferência,
// sem estender a janela de oito horas anunciada na escolha da estratégia.
const FASTING_EXTRA_MEALS: MealTemplate[] = [
  { name: "Lanche do Início da Tarde", time: "13:00", type: "snack" },
  { name: "Lanche Intermediário", time: "14:00", type: "snack" },
  { name: "Lanche do Fim da Tarde", time: "16:00", type: "snack" },
  { name: "Lanche Antes do Jantar", time: "17:30", type: "snack" },
];

/** Percentual da energia em cada macro, e o fator sobre a energia base do dia. */
interface DayRule {
  label: string;
  description: string;
  calorieFactor: number;
  percent: { protein: number; carbs: number; fat: number };
  meals: MealTemplate[];
  mealWindow?: DayTemplate["mealWindow"];
}

const BALANCED = { protein: 30, carbs: 40, fat: 30 };
const HIGH_CARB_DAYS = [1, 3, 5];
const LOW_CARB_DAYS = [2, 4, 6];

function carbCyclingRule(dayOfWeek: number): DayRule {
  if (HIGH_CARB_DAYS.includes(dayOfWeek)) {
    return {
      label: "Alto Carboidrato",
      description: "Treino Pesado",
      calorieFactor: 1.15,
      percent: { protein: 25, carbs: 50, fat: 25 },
      meals: BASE_MEALS,
    };
  }
  if (LOW_CARB_DAYS.includes(dayOfWeek)) {
    return {
      label: "Baixo Carboidrato",
      description: "Descanso/Cardio",
      calorieFactor: 0.85,
      percent: { protein: 30, carbs: 20, fat: 50 },
      meals: BASE_MEALS,
    };
  }
  return rule("Manutenção", "Equilíbrio", BALANCED, BASE_MEALS);
}

function rule(
  label: string,
  description: string,
  percent: DayRule["percent"],
  meals: MealTemplate[],
): DayRule {
  return { label, description, calorieFactor: 1, percent, meals };
}

function dayRule(strategy: DietStrategyType, dayOfWeek: number): DayRule {
  switch (strategy) {
    case "carb_cycling":
      return carbCyclingRule(dayOfWeek);
    case "ketogenic":
      return rule("Keto", "Cetose", { protein: 25, carbs: 5, fat: 70 }, BASE_MEALS);
    case "intermittent_fasting":
      return {
        ...rule("Janela 8h", "12:00 - 20:00", BALANCED, FASTING_MEALS),
        mealWindow: FASTING_WINDOW,
      };
    case "manual":
      return rule("Manual", "Livre", BALANCED, []);
    default:
      return rule("Dia Padrão", "Manutenção", BALANCED, BASE_MEALS);
  }
}

// Proteína e carbo valem 4 kcal/g; gordura, 9 kcal/g.
function toGrams(calories: number, percent: DayRule["percent"]): MacroSplit {
  return {
    calories,
    protein: Math.round((calories * percent.protein) / 100 / 4),
    carbs: Math.round((calories * percent.carbs) / 100 / 4),
    fat: Math.round((calories * percent.fat) / 100 / 9),
  };
}

function averageOf(days: DayTemplate[]): MacroSplit {
  const mean = (pick: (macros: MacroSplit) => number) =>
    Math.round(days.reduce((sum, day) => sum + pick(day.macros), 0) / days.length);
  return {
    calories: mean((m) => m.calories),
    protein: mean((m) => m.protein),
    carbs: mean((m) => m.carbs),
    fat: mean((m) => m.fat),
  };
}

/**
 * A semana sugerida pela estratégia, de domingo (0) a sábado (6), e a média.
 *
 * @example
 * const { weeklySchedule, averageMacros } = calculateDietStrategy("carb_cycling", 2200);
 */
export function calculateDietStrategy(
  strategy: DietStrategyType,
  baseCalories: number,
): StrategyResult {
  const weeklySchedule = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const { calorieFactor, percent, ...day } = dayRule(strategy, dayOfWeek);
    const macros = toGrams(Math.round(baseCalories * calorieFactor), percent);
    return { dayOfWeek, macros, ...day };
  });

  return {
    description: DIET_STRATEGIES[strategy].description,
    weeklySchedule,
    averageMacros: averageOf(weeklySchedule),
  };
}

export type StrategyMealRow = Required<
  Pick<CreateDietMealInput, "name" | "meal_type" | "meal_time" | "meal_order" | "day_of_week">
>;

function withoutMeals(meals: MealTemplate[], count: number): MealTemplate[] {
  const kept = [...meals];
  for (const type of DROP_ORDER) {
    while (kept.length > count) {
      const index = kept.findLastIndex((meal) => meal.type === type);
      if (index < 0) break;
      kept.splice(index, 1);
    }
  }
  return kept;
}

function withExtraMeals(day: DayTemplate, count: number): MealTemplate[] {
  const fits = (meal: MealTemplate) =>
    !day.mealWindow || (meal.time >= day.mealWindow.from && meal.time <= day.mealWindow.to);
  const taken = new Set(day.meals.map((meal) => meal.name));
  const candidates = day.mealWindow ? FASTING_EXTRA_MEALS : EXTRA_MEALS;
  const extras = candidates.filter((meal) => fits(meal) && !taken.has(meal.name));
  const added = extras.slice(0, Math.max(0, count - day.meals.length));
  return [...day.meals, ...added].sort((a, b) => a.time.localeCompare(b.time));
}

// A personalizada não sugere refeição: o número da preferência não a muda.
function mealsForCount(day: DayTemplate, count?: number | null): MealTemplate[] {
  if (!count || day.meals.length === 0) return day.meals;
  if (count < day.meals.length) return withoutMeals(day.meals, count);
  return withExtraMeals(day, count);
}

function rowsOfDay(
  day: DayTemplate,
  dayOfWeek: number | null,
  mealsPerDay?: number | null,
): StrategyMealRow[] {
  return mealsForCount(day, mealsPerDay).map((meal, index) => ({
    name: meal.name,
    meal_type: meal.type,
    meal_time: meal.time,
    meal_order: index,
    day_of_week: dayOfWeek,
  }));
}

/**
 * As refeições-molde que o plano recém-criado recebe.
 *
 * Dieta única é **um conjunto só**, com `day_of_week` nulo, que é o formato que
 * `mealsOfDay` lê. Gravar os sete dias numa dieta única repetia cada refeição
 * sete vezes na tela (regressão da #337).
 *
 * `mealsPerDay`, a preferência do plano, tira ou acrescenta refeições ao molde.
 *
 * @example
 * const rows = strategyMealRows(calculateDietStrategy("standard", 2000), "unique", 5);
 */
export function strategyMealRows(
  result: StrategyResult,
  planType: DietPlanType,
  mealsPerDay?: number | null,
): StrategyMealRow[] {
  if (planType === "unique") return rowsOfDay(result.weeklySchedule[0], null, mealsPerDay);
  return result.weeklySchedule.flatMap((day) => rowsOfDay(day, day.dayOfWeek, mealsPerDay));
}
