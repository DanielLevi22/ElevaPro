"use client";

import { createNutritionService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

const nutritionService = createNutritionService(supabase);

/**
 * As restrições que a anamnese do aluno sugere para o plano novo (#337). Vem
 * só a etiqueta derivada e o aviso de que a anamnese diz mais, nunca a resposta.
 *
 * @example
 * const { data: hint } = useDietaryRestrictionHint(studentId);
 */
export function useDietaryRestrictionHint(studentId: string) {
  return useQuery({
    queryKey: ["dietary_restriction_hint", studentId],
    queryFn: () => nutritionService.fetchDietaryRestrictionHint(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}
