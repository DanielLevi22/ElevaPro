"use client";

import {
  createGamificationService,
  createNutritionService,
  createWorkoutsService,
} from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/shared/hooks/useAuthUser";

const gamificationService = createGamificationService(supabase);
const nutritionService = createNutritionService(supabase);
const workoutsService = createWorkoutsService(supabase);

export function useStudentStreak(studentId: string | null) {
  return useQuery({
    queryKey: ["student-streak", studentId],
    queryFn: () => gamificationService.getStreak(studentId ?? undefined),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentAchievements(studentId: string | null) {
  return useQuery({
    queryKey: ["student-achievements", studentId],
    queryFn: () => gamificationService.getAchievements(studentId ?? undefined),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentActiveDietPlan(studentId: string | null) {
  return useQuery({
    queryKey: ["student-active-diet", studentId],
    queryFn: () => nutritionService.fetchActiveDietPlan(studentId as string),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentWorkoutPlans(studentId: string | null) {
  return useQuery({
    queryKey: ["student-workout-plans", studentId],
    queryFn: () => workoutsService.fetchWorkouts(studentId as string),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

/** Composes the current user's id for student dashboard hooks. */
export function useCurrentStudentId(): string | null {
  const { data: authUser } = useAuthUser();
  return authUser?.id ?? null;
}

export function useStudentPersonaTrack(studentId: string | null) {
  return useQuery({
    queryKey: ["student-persona-track", studentId],
    queryFn: async (): Promise<string | null> => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("persona_track")
        .eq("id", studentId)
        .maybeSingle();
      // Sem propagar, coluna inexistente ou RLS negando viravam "sem trilha" —
      // indistinguível de um aluno que de fato não escolheu nenhuma.
      if (error) throw error;
      return data?.persona_track ?? null;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}
