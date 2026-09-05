import {
  type CreateDietMealInput,
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
import { cancelPlanNotifications, scheduleMealNotifications } from '@/services/notificationService';
import { lembretesDaDieta } from '../services/lembretesDaDieta';
import type { StrategyResult } from '../utils/dietStrategies';

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
  dietPlanHistory: DietPlan[];
  fetchDietPlans: (specialistId: string) => Promise<void>;
  fetchDietPlan: (studentId: string) => Promise<void>;
  fetchDietPlanHistory: (studentId: string) => Promise<void>;
  createDietPlan: (
    plan: Omit<DietPlan, 'id' | 'version' | 'status' | 'created_at'>,
    sourcePlanId?: string
  ) => Promise<void>;
  finishDietPlan: (planId: string) => Promise<void>;
  updateDietPlan: (id: string, updates: Partial<DietPlan>) => Promise<void>;
  createDietPlanWithStrategy: (
    planData: Omit<DietPlan, 'id' | 'version' | 'status' | 'created_at'>,
    strategyData: StrategyResult
  ) => Promise<void>;

  // Meals
  meals: DietMeal[];
  fetchMeals: (dietPlanId: string) => Promise<void>;
  addMeal: (meal: CreateDietMealInput) => Promise<DietMeal>;
  updateMeal: (id: string, updates: Partial<DietMeal>) => Promise<void>;

  // Meal Items
  mealItems: Record<string, DietMealItem[]>;
  fetchMealItems: (mealId: string) => Promise<void>;
  addFoodToMeal: (mealId: string, foodId: string, quantity: number, unit: string) => Promise<void>;
  addFoodsToMeal: (
    mealId: string,
    items: Array<{ foodId: string; quantity: number; unit: string }>
  ) => Promise<void>;
  updateMealItem: (itemId: string, updates: Partial<DietMealItem>) => Promise<void>;
  removeFoodFromMeal: (itemId: string) => Promise<void>;
  substituteFood: (
    mealId: string,
    date: string,
    originalItemId: string,
    newFood: Food,
    quantity: number,
    unit: string
  ) => Promise<void>;

  // Day Operations
  copiedDay: { meals: DietMeal[]; items: Record<string, DietMealItem[]> } | null;
  copyDay: (
    dayOfWeek: number,
    meals: DietMeal[],
    mealItems: Record<string, DietMealItem[]>
  ) => Promise<void>;
  pasteDay: (targetDay: number, dietPlanId?: string) => Promise<void>;
  clearDay: (dayOfWeek: number, dietPlanId?: string) => Promise<void>;

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
  dietPlanHistory: [],
  meals: [],
  mealItems: {},
  isLoading: false,
  copiedDay: null,
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

    if (useAuthStore.getState().isMasquerading) return;

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
    } catch (error) {
      console.error('Error toggling meal completion:', error);
      get().fetchDailyLogs(currentDietPlan.student_id, date);
    }
  },

  copyDay: async (dayOfWeek, meals, mealItems) => {
    const dayMeals = meals.filter((m) => m.day_of_week === dayOfWeek);
    const dayItems: Record<string, DietMealItem[]> = {};
    for (const meal of dayMeals) {
      if (mealItems[meal.id]) dayItems[meal.id] = mealItems[meal.id];
    }
    set({ copiedDay: { meals: dayMeals, items: dayItems } });
  },

  pasteDay: async (targetDay, dietPlanId) => {
    const { copiedDay, currentDietPlan } = get();
    if (!copiedDay) throw new Error('Nenhum dia copiado para colar.');

    const targetPlanId = dietPlanId ?? currentDietPlan?.id;
    if (!targetPlanId) throw new Error('Plano de dieta não identificado.');

    set({ isLoading: true });
    try {
      const sourceMeals = copiedDay.meals.map((meal) => ({
        ...meal,
        diet_meal_items: copiedDay.items[meal.id] ?? [],
      }));
      await nutritionService.pasteDietDay(targetPlanId, targetDay, sourceMeals);
      await get().fetchMeals(targetPlanId);
    } catch (error) {
      console.error('Error pasting day:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearDay: async (dayOfWeek, dietPlanId) => {
    const { currentDietPlan } = get();
    const targetPlanId = dietPlanId ?? currentDietPlan?.id;
    if (!targetPlanId) throw new Error('Plano de dieta não identificado.');

    try {
      await nutritionService.clearDietDay(targetPlanId, dayOfWeek);
      set((state) => ({
        meals: state.meals.filter((m) => m.day_of_week !== dayOfWeek),
      }));
    } catch (error) {
      console.error('Error clearing day:', error);
      throw error;
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

      if (!data) return;

      // O agendamento em si mora em `fetchMeals`: lembrete de refeição precisa
      // das refeições, e aqui só o plano foi carregado. Aqui ficam apenas os
      // lembretes de um plano que deixou de valer.
      const currentUser = useAuthStore.getState().user;
      if (data.id && currentUser?.id === studentId && data.status !== 'active') {
        await cancelPlanNotifications(data.id);
      }
    } catch (error) {
      console.error('Error fetching diet plan:', error);
      set({ currentDietPlan: null });
    }
  },

  fetchDietPlanHistory: async (studentId) => {
    try {
      const data = await nutritionService.fetchDietPlanHistory(studentId);
      set({ dietPlanHistory: data });
    } catch (error) {
      console.error('Error fetching diet plan history:', error);
      set({ dietPlanHistory: [] });
    }
  },

  createDietPlan: async (plan, sourcePlanId) => {
    try {
      const newPlan = await nutritionService.createDietPlan({
        student_id: plan.student_id,
        specialist_id: plan.specialist_id ?? '',
        name: plan.name,
        plan_type: plan.plan_type,
        start_date: plan.start_date,
        end_date: plan.end_date,
        target_calories: plan.target_calories,
        target_protein: plan.target_protein,
        target_carbs: plan.target_carbs,
        target_fat: plan.target_fat,
        notes: plan.notes,
      });

      if (sourcePlanId) {
        // Clone meals from source plan
        const sourceMeals = await nutritionService.fetchDietMeals(sourcePlanId);
        for (const sourceMeal of sourceMeals) {
          const newMeal = await nutritionService.createDietMeal({
            diet_plan_id: newPlan.id,
            name: sourceMeal.name,
            meal_type: sourceMeal.meal_type,
            meal_order: sourceMeal.meal_order,
            day_of_week: sourceMeal.day_of_week,
            meal_time: sourceMeal.meal_time,
            target_calories: sourceMeal.target_calories,
          });
          const items = sourceMeal.diet_meal_items ?? [];
          if (items.length > 0) {
            await nutritionService.addFoodsToMeal(
              items.map((item, index) => ({
                diet_meal_id: newMeal.id,
                food_id: item.food_id,
                quantity: Number(item.quantity),
                unit: item.unit,
                order_index: item.order_index ?? index,
              }))
            );
          }
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', plan.student_id)
        .single();

      set((state) => ({
        currentDietPlan: newPlan,
        dietPlans: [{ ...newPlan, student: profile ?? undefined }, ...state.dietPlans],
      }));
    } catch (error) {
      console.error('Error creating diet plan:', error);
      throw error;
    }
  },

  finishDietPlan: async (planId) => {
    try {
      await cancelPlanNotifications(planId);
      const data = await nutritionService.finishDietPlan(planId);
      set((state) => ({
        currentDietPlan: state.currentDietPlan?.id === planId ? null : state.currentDietPlan,
        dietPlanHistory: [data, ...state.dietPlanHistory],
      }));
    } catch (error) {
      console.error('Error finishing diet plan:', error);
      throw error;
    }
  },

  updateDietPlan: async (id, updates) => {
    try {
      const data = await nutritionService.updateDietPlan(
        id,
        updates as Parameters<typeof nutritionService.updateDietPlan>[1]
      );
      set({ currentDietPlan: data });
    } catch (error) {
      console.error('Error updating diet plan:', error);
      throw error;
    }
  },

  createDietPlanWithStrategy: async (planData, strategyData) => {
    try {
      const newPlan = await nutritionService.createDietPlan({
        student_id: planData.student_id,
        specialist_id: planData.specialist_id ?? null,
        name: planData.name,
        plan_type: planData.plan_type,
        start_date: planData.start_date,
        end_date: planData.end_date,
        target_calories: planData.target_calories,
        target_protein: planData.target_protein,
        target_carbs: planData.target_carbs,
        target_fat: planData.target_fat,
      });

      const { weeklySchedule } = strategyData;
      for (const day of weeklySchedule) {
        for (const [index, mealTemplate] of day.meals.entries()) {
          await nutritionService.createDietMeal({
            diet_plan_id: newPlan.id,
            day_of_week: day.dayOfWeek,
            name: mealTemplate.name,
            meal_type: mealTemplate.type,
            meal_order: index,
            target_calories: 0,
            meal_time: mealTemplate.time,
          });
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', planData.student_id)
        .single();

      set((state) => ({
        currentDietPlan: newPlan,
        dietPlans: [{ ...newPlan, student: profile ?? undefined }, ...state.dietPlans],
      }));
    } catch (error) {
      console.error('Error creating strategy diet plan:', error);
      throw error;
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

      // O agendamento acontece aqui e não em `fetchDietPlan` porque é aqui que
      // as refeições existem — sem elas não há hora nem dia para avisar.
      //
      // Só o plano do próprio aluno: o especialista abre o plano de vários e
      // não pode receber lembrete de refeição de nenhum deles.
      const plano = get().currentDietPlan;
      const usuario = useAuthStore.getState().user;
      if (plano?.id === dietPlanId && usuario?.id === plano?.student_id) {
        await scheduleMealNotifications(plano.id, lembretesDaDieta(mealsValues, itemsMap));
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  },

  addMeal: async (meal) => {
    try {
      const data = await nutritionService.createDietMeal(meal);
      set((state) => ({ meals: [...state.meals, data] }));
      return data;
    } catch (error) {
      console.error('Error adding meal:', error);
      throw error;
    }
  },

  updateMeal: async (id, updates) => {
    try {
      const data = await nutritionService.updateDietMeal(
        id,
        updates as Parameters<typeof nutritionService.updateDietMeal>[1]
      );
      set((state) => ({
        meals: state.meals.map((meal) => (meal.id === id ? { ...meal, ...data } : meal)),
      }));
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
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

  addFoodToMeal: async (mealId, foodId, quantity, unit) => {
    try {
      const currentItems = get().mealItems[mealId] ?? [];
      const data = await nutritionService.addFoodToMeal({
        diet_meal_id: mealId,
        food_id: foodId,
        quantity,
        unit,
        order_index: currentItems.length,
      });
      set((state) => ({
        mealItems: {
          ...state.mealItems,
          [mealId]: [...(state.mealItems[mealId] ?? []), data as DietMealItem],
        },
      }));
    } catch (error) {
      console.error('Error adding food to meal:', error);
      throw error;
    }
  },

  addFoodsToMeal: async (mealId, items) => {
    try {
      const currentItems = get().mealItems[mealId] ?? [];
      const data = await nutritionService.addFoodsToMeal(
        items.map((item, index) => ({
          diet_meal_id: mealId,
          food_id: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
          order_index: currentItems.length + index,
        }))
      );
      set((state) => ({
        mealItems: {
          ...state.mealItems,
          [mealId]: [...(state.mealItems[mealId] ?? []), ...(data as DietMealItem[])],
        },
      }));
    } catch (error) {
      console.error('Error adding foods to meal:', error);
      throw error;
    }
  },

  updateMealItem: async (itemId, updates) => {
    try {
      const data = await nutritionService.updateMealItem(
        itemId,
        updates as Parameters<typeof nutritionService.updateMealItem>[1]
      );
      set((state) => {
        const newMealItems = { ...state.mealItems };
        const mealId = (data as DietMealItem).diet_meal_id;
        if (newMealItems[mealId]) {
          newMealItems[mealId] = newMealItems[mealId].map((item) =>
            item.id === itemId ? (data as DietMealItem) : item
          );
        }
        return { mealItems: newMealItems };
      });
    } catch (error) {
      console.error('Error updating meal item:', error);
      throw error;
    }
  },

  removeFoodFromMeal: async (itemId) => {
    try {
      await nutritionService.removeFoodFromMeal(itemId);
      set((state) => {
        const newMealItems = { ...state.mealItems };
        for (const mealId of Object.keys(newMealItems)) {
          newMealItems[mealId] = newMealItems[mealId].filter((item) => item.id !== itemId);
        }
        return { mealItems: newMealItems };
      });
    } catch (error) {
      console.error('Error removing food from meal:', error);
      throw error;
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
    set({
      foods: [],
      currentDietPlan: null,
      dietPlans: [],
      dietPlanHistory: [],
      meals: [],
      mealItems: {},
      copiedDay: null,
      dailyLogs: {},
      isLoading: false,
    });
  },
}));
