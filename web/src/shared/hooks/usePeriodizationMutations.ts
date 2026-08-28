"use client";

import {
  type CreatePeriodizationInput,
  createWorkoutsService,
  type TrainingStatus,
  type UpdatePeriodizationInput,
} from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./useAuthUser";

export type { UpdatePeriodizationInput };

const workoutsService = createWorkoutsService(supabase);

// O tipo vem de `@elevapro/shared`. Havia uma cópia aqui declarando
// `start_date` e `end_date` como opcionais — e era ela que deixava a tela
// chamar a criação sem data, num par de colunas que o banco exige desde a
// migration `0024`.
export type { CreatePeriodizationInput };

export function useCreatePeriodization() {
  const queryClient = useQueryClient();
  const { data: authUser } = useAuthUser();

  return useMutation({
    mutationFn: async (input: CreatePeriodizationInput) => {
      if (!authUser?.id) throw new Error("Usuário não autenticado");
      // Member creates periodization for themselves — no specialist link
      const specialistId = authUser.accountType === "specialist" ? authUser.id : undefined;
      return workoutsService.createPeriodization({ specialist_id: specialistId, ...input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
    },
  });
}

export function useUpdatePeriodization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePeriodizationInput }) => {
      return workoutsService.updatePeriodization(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
      queryClient.invalidateQueries({ queryKey: ["periodization", variables.id] });
    },
  });
}

export function useUpdatePeriodizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TrainingStatus }) => {
      return workoutsService.updatePeriodization(id, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
      queryClient.invalidateQueries({ queryKey: ["periodization", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["active-periodization"] });
    },
  });
}

export function useDeletePeriodization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workoutsService.deletePeriodization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
    },
  });
}

export function useActivatePeriodization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workoutsService.activatePeriodization(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
      queryClient.invalidateQueries({ queryKey: ["periodization", data.id] });
      queryClient.invalidateQueries({ queryKey: ["active-periodization"] });
    },
  });
}

export function useCompletePeriodization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workoutsService.updatePeriodization(id, { status: "completed" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["periodizations"] });
      queryClient.invalidateQueries({ queryKey: ["periodization", data.id] });
      queryClient.invalidateQueries({ queryKey: ["active-periodization"] });
    },
  });
}
