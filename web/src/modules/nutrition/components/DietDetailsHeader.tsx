"use client";

import type { DietPlan } from "@elevapro/shared";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteDietPlan } from "@/shared/hooks/useNutrition";
import { formatDateRange } from "@/shared/utils/formatDate";
import { DeleteDietPlanModal } from "./DeleteDietPlanModal";
import { DietPlanStatusControl } from "./DietPlanStatusControl";
import { MacroRing } from "./MacroRing";

interface DietDetailsHeaderProps {
  dietPlan: DietPlan;
  onBack: () => void;
  onExportPDF: () => void;
  onDayOptions: () => void;
  isCyclic: boolean;
}

export function DietDetailsHeader({
  dietPlan,
  onBack,
  onExportPDF,
  onDayOptions,
  isCyclic,
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

          {/* Macros Graphics Section */}
          <div className="flex flex-row items-center gap-8 mt-8 bg-zinc-950/20 border border-white/5 p-6 rounded-[32px] w-fit">
            <div className="flex flex-col items-center px-6 border-r border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mb-1">
                Total Calórico
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white italic tracking-tighter">
                  {dietPlan.target_calories}
                </span>
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">
                  kcal
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-6">
              <MacroRing
                label="Proteína"
                value={dietPlan.target_protein ?? 0}
                max={300}
                color="#10b981"
                size="md"
                icon={
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
                  </svg>
                }
              />
              <MacroRing
                label="Carbo"
                value={dietPlan.target_carbs ?? 0}
                max={600}
                color="#3b82f6"
                size="md"
                icon={
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,14.21 4.9,16.21 6.34,17.65L7.75,16.24C6.67,15.16 6,13.66 6,12A6,6 0 0,1 12,6M16.25,7.76L17.66,6.35C19.1,7.79 20,9.79 20,12A8,8 0 0,1 12,20V17L8,21L12,25V22A10,10 0 0,0 22,12C22,9.24 20.9,6.74 19.1,5.05L16.25,7.76Z" />
                  </svg>
                }
              />
              <MacroRing
                label="Gordura"
                value={dietPlan.target_fat ?? 0}
                max={150}
                color="#eab308"
                size="md"
                icon={
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.26,8.91C12.72,8.47 11.23,8.7 9.87,9.37l-0.2,0.1 0.1,0.2c0.41,0.85 0.54,1.82 0.44,2.83 -0.19,2.15 -1.24,4.11 -2.71,5.65L7.33,18.32 7.5,18.52c1.17,1.4 2.82,2.37 4.6,2.71l0.3,0.06 0.05,-0.3c0.11,-0.6 0.28,-1.19 0.51,-1.76l0.29,-0.74 0.77,0.24c0.14,0.04 0.28,0.08 0.42,0.12l0.28,0.08 0.06,-0.28c0.12,-0.6 0.16,-1.2 0.14,-1.82 -0.01,-0.2 -0.02,-0.4 -0.04,-0.6 -0.15,-1.72 -1.04,-3.21 -2.33,-4.2l-0.53,-0.4 0.45,-0.49c0.42,-0.46 0.94,-0.83 1.5,-1.11C14.77,9.8,15.75,9.74,16.63,10c0.31,0.09 0.6,0.22 0.88,0.4" />
                  </svg>
                }
              />
            </div>
          </div>
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
