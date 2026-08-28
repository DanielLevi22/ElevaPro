export interface Food {
  id: string;
  name: string;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source: string;
  is_custom: boolean;
  created_by?: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DietPlan {
  id: string;
  student_id: string;
  specialist_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  version: number;
  is_active: boolean;
  status: 'active' | 'completed' | 'finished' | 'draft';
  plan_type: 'unique' | 'cyclic';
  notes?: string;
}

export interface DietMeal {
  id: string;
  diet_plan_id: string;
  day_of_week: number;
  meal_type: string;
  meal_order: number;
  name?: string;
  target_calories?: number;
  meal_time?: string; // Format: "HH:MM"
}

export interface DietMealItem {
  id: string;
  diet_meal_id: string;
  food_id: string;
  food?: Food;
  quantity: number;
  unit: string;
  order_index: number;
}

export interface DailyLog {
  id: string;
  student_id: string;
  diet_plan_id?: string;
  diet_meal_id?: string;
  logged_date: string;
  completed: boolean;
  actual_items?: unknown[];
}
