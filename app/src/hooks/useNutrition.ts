import type { DietMeal, DietMealItem } from '@elevapro/shared';
import { createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';

// As duas consultas falavam direto com o Supabase, duplicando o que
// `nutrition.service` já fazia para o web — inclusive o embed de
// `diet_meal_items` com o alimento, que precisa do nome exato da constraint.
const nutritionService = createNutritionService(supabase);

type MealsData = {
  meals: DietMeal[];
  mealItems: Record<string, DietMealItem[]>;
};

export function useDietPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['dietPlan', planId],
    queryFn: () => nutritionService.fetchDietPlanById(planId as string),
    enabled: !!planId,
  });
}

export function useDietMeals(planId: string | undefined) {
  return useQuery({
    queryKey: ['dietMeals', planId],
    // A tela consome refeições e itens separados; o serviço devolve os itens
    // embutidos em cada refeição. O desmembramento é da tela, não do banco.
    queryFn: async (): Promise<MealsData> => {
      const linhas = await nutritionService.fetchDietMeals(planId as string);

      const meals: DietMeal[] = [];
      const mealItems: Record<string, DietMealItem[]> = {};

      for (const { diet_meal_items, ...meal } of linhas) {
        meals.push(meal as DietMeal);
        mealItems[meal.id] = diet_meal_items ?? [];
      }

      return { meals, mealItems };
    },
    enabled: !!planId,
  });
}
