"use client";

import type { PhysicalAssessment, PhysicalAssessmentInput } from "@elevapro/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentClient } from "../services/AssessmentClientService";

/** Salva correção com controle de concorrência e atualiza as leituras do aluno. Ex.: mutation.mutateAsync({ assessment, changes }). */
export function useCorrectAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessment,
      changes,
    }: {
      assessment: PhysicalAssessment;
      changes: PhysicalAssessmentInput;
    }) => assessmentClient.correct(assessment, changes),
    // A avaliação alimenta detalhes, nutrição, histórico e gráficos com chaves
    // distintas. Marcar todas obsoletas evita manter uma medida inexata em uso.
    onSuccess: () => queryClient.invalidateQueries(),
    onError: () => queryClient.invalidateQueries({ queryKey: ["student-assessments"] }),
  });
}
