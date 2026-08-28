"use client";

import { createWorkoutsService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export type { Exercise } from "@elevapro/shared";

const workoutsService = createWorkoutsService(supabase);

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    // O filtro de linhas-placeholder desceu para `fetchExercises`: enquanto
    // vivia aqui, o mobile listava "Adicionar exercício" como exercício real.
    queryFn: () => workoutsService.fetchExercises(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      const exercises = await workoutsService.fetchExercises();
      return exercises.find((e) => e.id === id) ?? null;
    },
    enabled: !!id,
  });
}
