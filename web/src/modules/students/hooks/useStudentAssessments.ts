"use client";

import type { PhysicalAssessment as Assessment } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export type { Assessment };

export function useStudentAssessments(studentId: string | null) {
  return useQuery({
    queryKey: ["student-assessments", studentId],
    queryFn: async (): Promise<Assessment[]> => {
      if (!studentId) return [];

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(`/api/students/${studentId}/assessments`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível carregar avaliações");
      }

      return (result as { assessments: Assessment[] }).assessments;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}
