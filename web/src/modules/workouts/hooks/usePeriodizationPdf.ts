"use client";

import {
  buildPeriodizationSheet,
  createWorkoutsService,
  periodizationObjectiveLabel,
} from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUser } from "@/shared/hooks/useAuthUser";
import { exportPeriodizationToPDF } from "@/shared/utils/exportPeriodizationPDF";

const workoutsService = createWorkoutsService(supabase);

/**
 * Exporta o plano completo em PDF: periodização, fases, treinos, exercícios e
 * séries. Busca tudo só na hora de exportar — a página não carrega os treinos
 * de todas as fases para mostrar a lista delas.
 *
 * @example const { exportPdf, isExporting } = usePeriodizationPdf(periodization.id);
 */
export function usePeriodizationPdf(periodizationId: string) {
  const { data: currentUser } = useAuthUser();
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const full = await workoutsService.fetchFullPeriodization(periodizationId);
      if (!full) throw new Error(`Periodização ${periodizationId} não encontrada`);
      const { periodization } = full;
      exportPeriodizationToPDF({
        // O objetivo pelo rótulo da tela, não pelo código gravado.
        sheet: buildPeriodizationSheet({
          ...full,
          periodization: {
            ...periodization,
            objective: periodizationObjectiveLabel(periodization.objective),
          },
        }),
        studentName: periodization.student?.full_name ?? "Aluno",
        // O próprio aluno exportando (Praticante) não é o profissional dele.
        professionalName:
          periodization.student_id === currentUser?.id ? null : (currentUser?.fullName ?? null),
      });
    } catch {
      toast.error("Não consegui gerar o PDF do plano. Tente de novo.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPdf, isExporting };
}
