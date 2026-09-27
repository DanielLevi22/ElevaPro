/**
 * As propostas do assistente de nutrição do especialista e os eventos do stream
 * dele. Moram no `shared` desde a #337: o web e o mobile conversam com o mesmo
 * chat (`/api/ai/nutrition/chat/[studentId]`) e aprovam pelas mesmas rotas.
 */

export interface DietPlanProposal {
  name: string;
  plan_type: "unique" | "cyclic";
  start_date: string;
  duration_weeks: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  notes?: string;
}

export interface DietMealItemProposal {
  food_name: string;
  quantity: number;
  unit: string;
}

export interface DietMealProposal {
  name: string;
  meal_time?: string;
  /** 0=Dom a 6=Sáb, só na dieta cíclica. */
  day_of_week?: number;
  items: DietMealItemProposal[];
}

export interface DietMealsProposal {
  plan_name: string;
  plan_type: "unique" | "cyclic";
  meals: DietMealProposal[];
}

export type DietSseEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_end"; tool: string }
  | { type: "proposal_building"; tool: string; partial: string }
  | { type: "diet_plan_proposal"; data: DietPlanProposal }
  | { type: "diet_meals_proposal"; data: DietMealsProposal }
  | { type: "done" }
  | { type: "error"; message: string };
