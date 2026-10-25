"use client";

import type { PhysicalAssessmentInput } from "@elevapro/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentClient } from "../services/AssessmentClientService";

export type AssessmentInput = PhysicalAssessmentInput & { studentId: string };

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, ...values }: AssessmentInput) =>
      assessmentClient.create(studentId, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student-assessments", variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-history", variables.studentId] });
    },
  });
}
