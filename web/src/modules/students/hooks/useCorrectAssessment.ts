"use client";

import type { PhysicalAssessment, PhysicalAssessmentInput } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { snapshotAssessment } from "../assessment-correction";

/** Salva correção com controle de concorrência e atualiza as leituras do aluno. Ex.: mutation.mutateAsync({ assessment, changes }). */
export function useCorrectAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessment,
      changes,
    }: {
      assessment: PhysicalAssessment;
      changes: PhysicalAssessmentInput;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");
      const response = await fetch(
        `/api/students/${assessment.student_id}/assessments/${assessment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ expected: snapshotAssessment(assessment), changes }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível corrigir a avaliação.");
      return (result as { assessment: PhysicalAssessment }).assessment;
    },
    // A avaliação alimenta detalhes, nutrição, histórico e gráficos com chaves
    // distintas. Marcar todas obsoletas evita manter uma medida inexata em uso.
    onSuccess: () => queryClient.invalidateQueries(),
    onError: () => queryClient.invalidateQueries({ queryKey: ["student-assessments"] }),
  });
}
