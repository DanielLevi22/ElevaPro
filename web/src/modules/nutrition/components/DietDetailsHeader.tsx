"use client";

import type { DietPlan } from "@elevapro/shared";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteDietPlan } from "@/shared/hooks/useNutrition";
import { formatDateRange } from "@/shared/utils/formatDate";
import type { MacroTotals } from "../utils/macroTotals";
import { DayMacroProgress } from "./DayMacroProgress";
import { DeleteDietPlanModal } from "./DeleteDietPlanModal";
import { DietPlanStatusControl } from "./DietPlanStatusControl";

interface DietDetailsHeaderProps {
  dietPlan: DietPlan;
  onBack: () => void;
  onExportPDF: () => void;
  onDayOptions: () => void;
  isCyclic: boolean;
  dayTotals: MacroTotals;
  dayLabel: string;
}

export function DietDetailsHeader({
  dietPlan,
  onBack,
  onExportPDF,
  onDayOptions,
  isCyclic,
  dayTotals,
  dayLabel,
}: DietDetailsHeaderProps) {
  const deleteMutation = useDeleteDietPlan();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(dietPlan.id);
      toast.success("Plano excluído permanentemente.");
      onBack();
    } catch (_error) {
      toast.error("Erro ao excluir o plano nutricional");
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1 transition-colors"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar para Dietas
          </button>
          <h1 className="text-3xl font-bold text-foreground">{dietPlan.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground relative">
            <DietPlanStatusControl dietPlan={dietPlan} />
            {/* `format` do date-fns LANÇA com data inválida, e `new Date("")` é
                Invalid Date — um plano sem período derrubava a tela inteira. O
                utilitário devolve traço em vez de quebrar, e a 0025 passou a
                recusar data nula no banco. */}
            <span className="text-zinc-600 font-medium">
              {formatDateRange(dietPlan.start_date, dietPlan.end_date, "short")}
            </span>
          </div>

          <DayMacroProgress dietPlan={dietPlan} consumed={dayTotals} dayLabel={dayLabel} />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 00-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar PDF
          </button>

          {isCyclic && (
            <button
              type="button"
              onClick={onDayOptions}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <svg
                aria-hidden="true"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
              Opções do Dia
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center justify-center p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95"
            title="Excluir Plano"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <DeleteDietPlanModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        planName={dietPlan.name ?? ""}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
