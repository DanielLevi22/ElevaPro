// Canonical nutrition types — aligned with shared/src/database/schema/nutrition.ts

export type DietPlanStatus = "active" | "finished";
export type DietPlanType = "unique" | "cyclic";

export interface Food {
  id: string;
  name: string;
  category: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  source: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DietPlan {
  id: string;
  student_id: string;
  specialist_id: string | null;
  name: string | null;
  plan_type: DietPlanType;
  status: DietPlanStatus;
  version: number;
  start_date: string | null;
  end_date: string | null;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  notes: string | null;
  created_at: string;
}

export interface DietMeal {
  id: string;
  diet_plan_id: string;
  name: string;
  meal_type: string | null;
  meal_order: number;
  day_of_week: number | null;
  meal_time: string | null;
  target_calories: number | null;
  /** Preparo informado pelo especialista (0053). `null` = não informado. */
  prep_minutes?: number | null;
  difficulty?: DificuldadeDoPreparo | null;
  servings?: number | null;
  created_at: string;
}

/** Os três níveis do CHECK `diet_meals_difficulty_known`. */
export type DificuldadeDoPreparo = "facil" | "media" | "dificil";

export interface DietMealItem {
  id: string;
  diet_meal_id: string;
  food_id: string;
  food?: Food;
  quantity: number;
  unit: string;
  order_index: number;
  created_at: string;
}

export interface MealLog {
  id: string;
  student_id: string;
  diet_plan_id: string | null;
  diet_meal_id: string | null;
  logged_date: string;
  completed: boolean;
  actual_items: unknown | null;
  // `notes` e `photo_url` saíram na `0035`: nenhuma das duas tinha caminho de
  // escrita. Ver seção 2.3 de docs/LGPD_COMPLIANCE.md.
  created_at: string;
}

/**
 * De onde veio um item que não estava no prato do plano.
 *
 * `scan` e `assistente` são **estimativa de modelo**: o especialista precisa
 * distinguir isso do que foi prescrito ou pesado (LGPD, Art. 6°, V). `busca` é
 * o aluno escolhendo no catálogo.
 */
export type OrigemDoItem = "busca" | "scan" | "assistente";

/**
 * Um item do prato como o aluno o comeu — o formato de `meal_logs.actual_items`.
 *
 * O JSONB não tem esquema no banco. Este é o que o app grava e lê: o `food`
 * embutido, para a soma não depender de o Food ainda existir no catálogo.
 */
export interface ItemRegistrado {
  id: string;
  quantity: number;
  unit?: string;
  food?: Pick<Food, "serving_size" | "calories" | "protein" | "carbs" | "fat"> &
    Partial<Pick<Food, "id" | "name" | "category" | "serving_unit">>;
  is_substitution?: boolean;
  substituted_for?: string;
  /** Ausente nos itens do plano e nas trocas; presente em todo item extra. */
  origem?: OrigemDoItem;
}

// ── Input types ──────────────────────────────────────────────────────────────

export interface CreateFoodInput {
  name: string;
  category?: string | null;
  serving_size?: number;
  serving_unit?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  source?: string | null;
}

export interface CreateDietPlanInput {
  student_id: string;
  specialist_id?: string | null;
  name?: string | null;
  plan_type?: DietPlanType;
  start_date?: string | null;
  end_date?: string | null;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  notes?: string | null;
}

export interface UpdateDietPlanInput {
  name?: string | null;
  plan_type?: DietPlanType;
  status?: DietPlanStatus;
  start_date?: string | null;
  end_date?: string | null;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  notes?: string | null;
}

export interface CreateDietMealInput {
  diet_plan_id: string;
  name: string;
  meal_type?: string | null;
  meal_order?: number;
  day_of_week?: number | null;
  meal_time?: string | null;
  target_calories?: number | null;
}

export interface UpdateDietMealInput {
  name?: string;
  meal_type?: string | null;
  meal_order?: number;
  day_of_week?: number | null;
  meal_time?: string | null;
  target_calories?: number | null;
  prep_minutes?: number | null;
  difficulty?: DificuldadeDoPreparo | null;
  servings?: number | null;
}

export interface AddFoodToMealInput {
  diet_meal_id: string;
  food_id: string;
  quantity: number;
  unit: string;
  order_index: number;
}

export interface UpdateMealItemInput {
  quantity?: number;
  unit?: string;
  order_index?: number;
}

export interface ToggleMealLogInput {
  student_id: string;
  diet_plan_id: string;
  diet_meal_id: string;
  logged_date: string;
  completed: boolean;
}
