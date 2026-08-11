"use client";

import {
  type CreateDietMealInput,
  type CreateDietPlanInput,
  createNutritionService,
  type DietMeal,
  type DietMealItem,
  type DietPlan,
  type Food,
  type MealLog,
} from "@elevapro/shared";
import { defineAbilitiesFor, supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StrategyResult } from "../utils/dietStrategies";
import { useAuthUser } from "./useAuthUser";

/**
 * O CASL só concede acesso a dietas a quem tem serviço cadastrado — um
 * specialist sem linha em `specialist_services` não lê plano nenhum.
 */
export class DietPermissionError extends Error {
  constructor(accountType: string, services: string[]) {
    const owned = services.length > 0 ? services.join(", ") : "nenhum";
    super(
      `Conta "${accountType}" com serviços [${owned}] não pode ler dietas. ` +
        "É preciso account_type 'student'/'member', ou 'specialist' com " +
        "'personal_training' ou 'nutrition_consulting' em specialist_services.",
    );
    this.name = "DietPermissionError";
  }
}

const nutritionService = createNutritionService(supabase);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StudentNutritionStats {
  adherenceRate: number;
  totalLogs: number;
  completedMeals: number;
  latestWeight: number | null;
  lastWeightDate: string | null;
}

// meal_foods is an alias for diet_meal_items — kept for backward compat with MealCard / exportDietPDF
type MealWithItems = DietMeal & {
  meal_foods: (DietMealItem & { food: Food })[];
};

// ── Query Hooks ────────────────────────────────────────────────────────────────

export function useFoods(searchQuery = "") {
  return useQuery({
    queryKey: ["foods", searchQuery],
    queryFn: () =>
      searchQuery
        ? nutritionService.searchFoods(searchQuery, 0, 50)
        : nutritionService.fetchFoods(50),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDietPlans(studentId?: string) {
  const { data: currentUser } = useAuthUser();

  return useQuery({
    // `studentId` fica FORA da chave de propósito: a busca sempre traz todos os
    // planos do especialista e o recorte é local. Com ele na chave, cada aluno
    // virava uma entrada de cache própria refazendo a mesma busca completa — e
    // as telas que chamam este hook dentro de um laço de alunos disparavam uma
    // busca por aluno. Agora todas compartilham uma única resposta.
    queryKey: ["diet_plans", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      const ability = defineAbilitiesFor({
        accountType: currentUser.accountType as never,
        services: currentUser.services as never[],
      });
      if (ability.cannot("read", "Diet")) {
        throw new DietPermissionError(currentUser.accountType, currentUser.services);
      }

      return nutritionService.fetchDietPlans(currentUser.id);
    },
    // Repetir uma negação de permissão só adia o inevitável: eram 3 tentativas
    // com backoff exibindo skeleton antes de cair num estado vazio que parecia
    // "nenhum plano cadastrado". A falha precisa aparecer na hora.
    retry: (failureCount, error) => !(error instanceof DietPermissionError) && failureCount < 2,
    // `select` recorta do cache sem refazer a requisição nem reexibir skeleton.
    select: (plans) => (studentId ? plans.filter((p) => p.student_id === studentId) : plans),
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export function useDietPlan(id: string) {
  return useQuery({
    queryKey: ["diet_plan", id],
    queryFn: () => nutritionService.fetchDietPlanById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export function useDietMeals(dietPlanId: string) {
  return useQuery({
    queryKey: ["diet_meals", dietPlanId],
    queryFn: async (): Promise<MealWithItems[]> => {
      const meals = await nutritionService.fetchDietMeals(dietPlanId);
      // map diet_meal_items → meal_foods for backward compat with MealCard and exportDietPDF
      return meals.map((m) => ({ ...m, meal_foods: m.diet_meal_items }));
    },
    enabled: !!dietPlanId,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

// ── Mutation Hooks ─────────────────────────────────────────────────────────────

export function useCreateDietPlan() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuthUser();

  return useMutation({
    mutationFn: async (plan: Omit<CreateDietPlanInput, "specialist_id">) => {
      if (currentUser) {
        const ability = defineAbilitiesFor({
          accountType: currentUser.accountType as never,
          services: currentUser.services as never[],
        });
        if (ability.cannot("create", "Diet"))
          throw new Error("Você não tem permissão para criar dietas");
      }
      // specialist sets their own id; member leaves specialist_id null (self-owned plan)
      const specialistId = currentUser?.accountType === "specialist" ? currentUser.id : null;
      return nutritionService.createDietPlan({ ...plan, specialist_id: specialistId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_plans"] }),
  });
}

export function useCreateDietPlanWithStrategy() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuthUser();
  return useMutation({
    mutationFn: async ({
      plan,
      strategyData,
    }: {
      plan: Omit<CreateDietPlanInput, "specialist_id">;
      strategyData: StrategyResult;
    }) => {
      if (!currentUser) throw new Error("Usuário não autenticado");
      const specialistId = currentUser.accountType === "specialist" ? currentUser.id : null;
      const newPlan = await nutritionService.createDietPlan({
        ...plan,
        specialist_id: specialistId,
      });

      const { weeklySchedule } = strategyData;
      const daysToSave = plan.plan_type === "unique" ? [weeklySchedule[0]] : weeklySchedule;

      for (const day of daysToSave) {
        for (const [index, mealTemplate] of day.meals.entries()) {
          await nutritionService.createDietMeal({
            diet_plan_id: newPlan.id,
            name: mealTemplate.name,
            day_of_week: day.dayOfWeek,
            meal_type: mealTemplate.type,
            meal_order: index,
            target_calories: 0,
            meal_time: mealTemplate.time,
          });
        }
      }
      return newPlan;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_plans"] }),
  });
}

export function useUpdateDietPlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      status,
      isActive: _isActive, // is_active removed from canonical schema — ignored
    }: {
      planId: string;
      status: DietPlan["status"];
      isActive: boolean;
    }) => nutritionService.updateDietPlan(planId, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diet_plans"] });
      queryClient.invalidateQueries({ queryKey: ["diet_plan", data.id] });
    },
  });
}

export function useDeleteDietPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => nutritionService.deleteDietPlan(planId),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ["diet_plans"] });
      queryClient.removeQueries({ queryKey: ["diet_plan", planId] });
      queryClient.removeQueries({ queryKey: ["diet_meals", planId] });
    },
  });
}

export function useFinishDietPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => nutritionService.finishDietPlan(planId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diet_plans"] });
      queryClient.invalidateQueries({ queryKey: ["diet_plan", data.id] });
    },
  });
}

export function useAddMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meal: CreateDietMealInput) => nutritionService.createDietMeal(meal),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ["diet_meals", variables.diet_plan_id] }),
  });
}

export function useUpdateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      diet_plan_id,
      ...updates
    }: { id: string; diet_plan_id?: string } & Partial<DietMeal>) =>
      nutritionService.updateDietMeal(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_meals"] }),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteDietMeal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_meals"] }),
  });
}

export function useAddFoodToMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: {
      diet_meal_id: string;
      food_id: string;
      quantity: number;
      unit: string;
      order_index: number;
    }) => nutritionService.addFoodToMeal(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_meals"] }),
  });
}

export function useUpdateMealItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<DietMealItem>) =>
      nutritionService.updateMealItem(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_meals"] }),
  });
}

export function useRemoveMealItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionService.removeFoodFromMeal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_meals"] }),
  });
}

export function useCopyDay() {
  return useMutation({
    mutationFn: async ({ dietPlanId, dayOfWeek }: { dietPlanId: string; dayOfWeek: number }) => {
      const meals = await nutritionService.fetchDietMeals(dietPlanId);
      const dayMeals = meals.filter((m) => m.day_of_week === dayOfWeek);
      return { meals: dayMeals, dayOfWeek };
    },
  });
}

export function usePasteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dietPlanId,
      targetDay,
      copiedMeals,
    }: {
      dietPlanId: string;
      targetDay: number;
      copiedMeals: (DietMeal & { diet_meal_items?: DietMealItem[] })[];
    }) => {
      await nutritionService.pasteDietDay(dietPlanId, targetDay, copiedMeals);
      return { dietPlanId, targetDay };
    },
    onSuccess: (data) =>
      queryClient.invalidateQueries({ queryKey: ["diet_meals", data.dietPlanId] }),
  });
}

export function useClearDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dietPlanId, dayOfWeek }: { dietPlanId: string; dayOfWeek: number }) => {
      await nutritionService.clearDietDay(dietPlanId, dayOfWeek);
      return { dietPlanId, dayOfWeek };
    },
    onSuccess: (data) =>
      queryClient.invalidateQueries({ queryKey: ["diet_meals", data.dietPlanId] }),
  });
}

export function useImportDiet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceDietPlanId,
      targetStudentId,
    }: {
      sourceDietPlanId: string;
      targetStudentId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      return nutritionService.cloneDietPlan(sourceDietPlanId, targetStudentId, user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet_plans"] }),
  });
}

export function useDietLogs(studentId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["meal_logs", studentId, startDate, endDate],
    queryFn: (): Promise<MealLog[]> => {
      if (startDate && endDate) {
        return nutritionService.fetchMealLogsByRange(studentId, startDate, endDate);
      }
      const today = new Date().toISOString().split("T")[0];
      return nutritionService.fetchMealLogs(studentId, today);
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export interface WeightPoint {
  recorded_date: string;
  weight: number | null;
}

/**
 * Série de peso do aluno ao longo do tempo.
 *
 * A fonte é `physical_assessments` — a tabela `nutrition_progress` que este
 * hook consultava nunca existiu no banco, então o gráfico de peso sempre veio
 * vazio. O contrato de retorno foi mantido para os consumidores não mudarem.
 */
export function useNutritionProgress(studentId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["weight_progress", studentId, startDate, endDate],
    queryFn: async (): Promise<WeightPoint[]> => {
      let query = supabase
        .from("physical_assessments")
        .select("assessed_at, weight_kg")
        .eq("student_id", studentId)
        .not("weight_kg", "is", null)
        .order("assessed_at", { ascending: true });
      if (startDate) query = query.gte("assessed_at", startDate);
      if (endDate) query = query.lte("assessed_at", endDate);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => ({
        recorded_date: row.assessed_at,
        weight: row.weight_kg === null ? null : Number(row.weight_kg),
      }));
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useStudentNutritionStats(studentId: string) {
  return useQuery({
    queryKey: ["nutrition_stats", studentId],
    queryFn: async (): Promise<StudentNutritionStats> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: logs, error: logsError } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("student_id", studentId)
        .gte("logged_date", thirtyDaysAgo.toISOString().split("T")[0]);
      if (logsError) throw logsError;

      // Peso vem de physical_assessments; nutrition_progress nunca existiu.
      const { data: latestProgress } = await supabase
        .from("physical_assessments")
        .select("weight_kg, assessed_at")
        .eq("student_id", studentId)
        .not("weight_kg", "is", null)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const totalDays = logs?.length || 0;
      const completedMeals = logs?.filter((log) => log.completed).length || 0;
      const adherenceRate = totalDays > 0 ? (completedMeals / totalDays) * 100 : 0;

      return {
        adherenceRate,
        totalLogs: totalDays,
        completedMeals,
        latestWeight: latestProgress?.weight_kg ? Number(latestProgress.weight_kg) : null,
        lastWeightDate: latestProgress?.assessed_at ?? null,
      };
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

export function useManualLogMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      mealId,
      completed,
      loggedAt,
      dietPlanId,
    }: {
      studentId: string;
      mealId: string;
      completed: boolean;
      loggedAt: string;
      dietPlanId?: string;
    }) => {
      const dateStr = loggedAt.split("T")[0];
      return nutritionService.toggleMealLog({
        student_id: studentId,
        diet_plan_id: dietPlanId ?? "",
        diet_meal_id: mealId,
        logged_date: dateStr,
        completed,
      });
    },
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ["nutrition_stats", variables.studentId] }),
  });
}
