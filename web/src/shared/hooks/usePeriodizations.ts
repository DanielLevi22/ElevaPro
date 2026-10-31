"use client";

import { createWorkoutsService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "./useAuthUser";

export type {
  Periodization,
  TrainingStatus as PeriodizationStatus,
} from "@elevapro/shared";

const workoutsService = createWorkoutsService(supabase);

export function usePeriodizations() {
  const { data: authUser } = useAuthUser();
  const userId = authUser?.id ?? null;
  const accountType = authUser?.accountType ?? null;

  return useQuery({
    queryKey: ["periodizations", userId, accountType],
    queryFn: async () => {
      if (!userId || !accountType) return [];
      if (accountType === "specialist") {
        return workoutsService.fetchPeriodizations(userId);
      }
      return workoutsService.fetchStudentPeriodizations(userId);
    },
    enabled: !!userId && !!accountType,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePeriodization(id: string) {
  return useQuery({
    queryKey: ["periodization", id],
    queryFn: () => workoutsService.fetchPeriodizationById(id),
    enabled: !!id,
  });
}

export function useActivePeriodization(studentId: string) {
  return useQuery({
    queryKey: ["active-periodization", studentId],
    queryFn: async () => {
      const periodizations = await workoutsService.fetchStudentPeriodizations(studentId);
      return periodizations.find((p) => p.status === "active") ?? null;
    },
    enabled: !!studentId,
  });
}
