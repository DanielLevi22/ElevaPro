"use client";

import type { PhysicalAssessment as Assessment } from "@elevapro/shared";
import { useQuery } from "@tanstack/react-query";
import { assessmentClient } from "../services/AssessmentClientService";

export type { Assessment };

export function useStudentAssessments(studentId: string | null) {
  return useQuery({
    queryKey: ["student-assessments", studentId],
    queryFn: (): Promise<Assessment[]> =>
      studentId ? assessmentClient.list(studentId) : Promise.resolve([]),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}
