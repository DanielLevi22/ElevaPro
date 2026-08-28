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
  created_at: string;
}

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
