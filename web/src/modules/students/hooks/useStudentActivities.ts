"use client";

import type { ActivityAuthorFilter, ActivityDay } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

/**
 * Carrega as atividades do aluno já agrupadas por dia.
 *
 * Passa pela rota do BFF em vez de consultar o Supabase daqui: o agrupamento e
 * a decisão de autoria acontecem no servidor, e o que chega ao navegador é o
 * dia montado. Consulta direta do cliente traria as linhas cruas de sete
 * tabelas sensíveis para o browser filtrar.
 */
export function useStudentActivities(studentId: string | null, author: ActivityAuthorFilter) {
  return useQuery({
    queryKey: ["student-activities", studentId, author],
    queryFn: async (): Promise<ActivityDay[]> => {
      if (!studentId) return [];

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(`/api/students/${studentId}/activities?author=${author}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível carregar as atividades");
      }

      return (result as { days: ActivityDay[] }).days;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}
