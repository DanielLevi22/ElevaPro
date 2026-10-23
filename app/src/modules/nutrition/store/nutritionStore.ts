import {
  createNutritionService,
  type DietMeal,
  type DietMealItem,
  type DietPlan,
  type Food,
  type MealLog,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { useAuthStore } from '@/auth';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { refreshDailyNotices } from '@/shared/notices';
import { useDietWizardStore } from './dietWizardStore';

export type { Food };

const nutritionService = createNutritionService(supabase);

interface NutritionStore {
  // Foods
  foods: Food[];
  searchFoods: (query: string, page?: number, pageSize?: number) => Promise<Food[]>;
  createCustomFood: (
    food: Omit<Food, 'id' | 'is_custom' | 'created_by' | 'created_at'>
  ) => Promise<void>;

  // Diet Plans
  currentDietPlan: DietPlan | null;
  dietPlans: (DietPlan & { student?: { id: string; full_name: string | null } })[];
  fetchDietPlans: (specialistId: string) => Promise<void>;
  fetchDietPlan: (studentId: string) => Promise<void>;

  // Meals
  meals: DietMeal[];
  fetchMeals: (dietPlanId: string) => Promise<void>;

  // Meal Items
  mealItems: Record<string, DietMealItem[]>;
  fetchMealItems: (mealId: string) => Promise<void>;
  substituteFood: (
    mealId: string,
    date: string,
    originalItemId: string,
    newFood: Food,
    quantity: number,
    unit: string
  ) => Promise<void>;

  // Daily Logs
  dailyLogs: Record<string, MealLog>;
  fetchDailyLogs: (studentId: string, date: string) => Promise<void>;
  toggleMealCompletion: (mealId: string, date: string, isCompleted: boolean) => Promise<void>;

  // Loading states
  isLoading: boolean;

  // Reset
  reset: () => void;
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  foods: [],
  currentDietPlan: null,
  dietPlans: [],
  meals: [],
  mealItems: {},
  isLoading: false,
  dailyLogs: {},

  fetchDailyLogs: async (studentId, date) => {
    try {
      const logs = await nutritionService.fetchMealLogs(studentId, date);
      const logsRecord: Record<string, MealLog> = {};
      for (const log of logs) {
        if (log.diet_meal_id) logsRecord[log.diet_meal_id] = log;
      }
      set({ dailyLogs: logsRecord });
    } catch (error) {
      console.error('Error fetching daily logs:', error);
    }
  },

  toggleMealCompletion: async (mealId, date, isCompleted) => {
    const { currentDietPlan, dailyLogs } = get();
    if (!currentDietPlan) return;

    const existingLog = dailyLogs[mealId];

    // Optimistic update
    set((state) => ({
      dailyLogs: {
        ...state.dailyLogs,
        [mealId]: {
          ...existingLog,
          id: existingLog?.id ?? '',
          student_id: currentDietPlan.student_id,
          diet_plan_id: currentDietPlan.id,
          diet_meal_id: mealId,
          logged_date: date,
          completed: isCompleted,
          actual_items: existingLog?.actual_items ?? null,
          created_at: existingLog?.created_at ?? '',
        } satisfies MealLog,
      },
    }));

    try {
      const saved = await nutritionService.toggleMealLog({
        student_id: currentDietPlan.student_id,
        diet_plan_id: currentDietPlan.id,
        diet_meal_id: mealId,
        logged_date: date,
        completed: isCompleted,
      });

      set((state) => ({ dailyLogs: { ...state.dailyLogs, [mealId]: saved } }));

      const updatedLogs = get().dailyLogs;
      const completedCount = Object.values(updatedLogs).filter((log) => log.completed).length;
      useGamificationStore.getState().updateMealProgress(completedCount, date);
      // A refeição marcada não avisa mais; a desmarcada volta a avisar.
      void refreshDailyNotices(currentDietPlan.student_id);
    } catch (error) {
      console.error('Error toggling meal completion:', error);
      get().fetchDailyLogs(currentDietPlan.student_id, date);
    }
  },

  searchFoods: async (query, page = 0, pageSize = 10) => {
    try {
      const data = await nutritionService.searchFoods(query, page, pageSize);
      set((state) => ({
        foods: page === 0 ? data : [...state.foods, ...data],
      }));
      return data;
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  },

  createCustomFood: async (food) => {
    try {
      const data = await nutritionService.createFood({
        ...food,
        created_by: useAuthStore.getState().user?.id,
      });
      set((state) => ({ foods: [...state.foods, data] }));
    } catch (error) {
      console.error('Error creating custom food:', error);
      throw error;
    }
  },

  fetchDietPlans: async (specialistId) => {
    set({ isLoading: true });
    try {
      const plans = await nutritionService.fetchDietPlans(specialistId);
      set({ dietPlans: plans });
    } catch (error) {
      console.error('Error fetching diet plans:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDietPlan: async (studentId) => {
    try {
      const data = await nutritionService.fetchActiveDietPlan(studentId);
      set({ currentDietPlan: data });
    } catch (error) {
      console.error('Error fetching diet plan:', error);
      set({ currentDietPlan: null });
    }
  },

  fetchMeals: async (dietPlanId) => {
    try {
      const mealsWithItems = await nutritionService.fetchDietMeals(dietPlanId);
      const mealsValues: DietMeal[] = [];
      const itemsMap: Record<string, DietMealItem[]> = {};

      for (const row of mealsWithItems) {
        const { diet_meal_items, ...mealData } = row;
        mealsValues.push(mealData);
        itemsMap[mealData.id] = diet_meal_items ?? [];
      }

      set((state) => ({
        meals: mealsValues,
        mealItems: { ...state.mealItems, ...itemsMap },
      }));
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  },

  fetchMealItems: async (mealId) => {
    try {
      const { data, error } = await supabase
        .from('diet_meal_items')
        .select('*, food:foods(*)')
        .eq('diet_meal_id', mealId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      set((state) => ({
        mealItems: { ...state.mealItems, [mealId]: (data ?? []) as DietMealItem[] },
      }));
    } catch (error) {
      console.error('Error fetching meal items:', error);
    }
  },

  substituteFood: async (mealId, date, originalItemId, newFood, quantity, unit) => {
    const { currentDietPlan, dailyLogs, mealItems } = get();
    if (!currentDietPlan) return;

    try {
      const existingLog = dailyLogs[mealId];
      let actualItems: unknown[] = [];

      if (existingLog?.actual_items && Array.isArray(existingLog.actual_items)) {
        actualItems = [...existingLog.actual_items];
      } else {
        const originalItems = mealItems[mealId] ?? [];
        actualItems = originalItems.map((item) => ({
          id: item.id,
          food_id: item.food_id,
          quantity: item.quantity,
          unit: item.unit,
          food: item.food,
        }));
      }

      const newItem = {
        id: `sub_${Date.now()}`,
        food_id: newFood.id,
        quantity,
        unit,
        food: newFood,
        is_substitution: true,
        substituted_for: originalItemId,
      };

      const substitutionIndex = (actualItems as { id: string }[]).findIndex(
        (i) => i.id === originalItemId
      );
      if (substitutionIndex > -1) {
        actualItems[substitutionIndex] = newItem;
      } else {
        actualItems.push(newItem);
      }

      if (existingLog?.id) {
        const updated = await nutritionService.updateMealLogItems(existingLog.id, actualItems);
        set((state) => ({
          dailyLogs: { ...state.dailyLogs, [mealId]: updated },
        }));
      } else {
        const saved = await nutritionService.toggleMealLog({
          student_id: currentDietPlan.student_id,
          diet_plan_id: currentDietPlan.id,
          diet_meal_id: mealId,
          logged_date: date,
          completed: false,
        });
        const updated = await nutritionService.updateMealLogItems(saved.id, actualItems);
        set((state) => ({
          dailyLogs: { ...state.dailyLogs, [mealId]: updated },
        }));
      }
    } catch (error) {
      console.error('Error substituting food:', error);
      throw error;
    }
  },

  reset: () => {
    // O formulário ainda não persistido também contém dados de saúde.
    useDietWizardStore.getState().reset();
    set({
      foods: [],
      currentDietPlan: null,
      dietPlans: [],
      meals: [],
      mealItems: {},
      dailyLogs: {},
      isLoading: false,
    });
  },
}));
