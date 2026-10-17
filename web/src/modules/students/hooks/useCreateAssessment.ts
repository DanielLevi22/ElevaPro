"use client";

import type { PhysicalAssessment, PhysicalAssessmentInput } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type AssessmentInput = PhysicalAssessmentInput & { studentId: string };

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssessmentInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const { studentId, ...body } = input;

      const response = await fetch(`/api/students/${studentId}/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível salvar a avaliação");
      }

      return (result as { assessment: PhysicalAssessment }).assessment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student-assessments", variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-history", variables.studentId] });
    },
  });
}
