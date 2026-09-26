"use client";

import type { DietPlan } from "@elevapro/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { StatusBadge } from "@/shared/components/ui/StatusBadge";
import { useActivateDietPlan, useFinishDietPlan } from "@/shared/hooks/useNutrition";

interface DietPlanStatusControlProps {
  dietPlan: DietPlan;
}

/**
 * O status do plano e a única ação que cabe nele (#337): o rascunho é enviado,
 * o ativo é finalizado, o finalizado só se mostra. Não existe menu para voltar
 * um plano a "ativo": dois planos valendo ao mesmo tempo é o que o banco recusa.
 *
 * @example
 * <DietPlanStatusControl dietPlan={plan} />
 */
export function DietPlanStatusControl({ dietPlan }: DietPlanStatusControlProps) {
  if (dietPlan.status === "draft") return <DraftControl dietPlan={dietPlan} />;
  if (dietPlan.status === "active") return <ActiveControl dietPlan={dietPlan} />;
  return <StatusBadge tone="neutral">Finalizado</StatusBadge>;
}

function DraftControl({ dietPlan }: DietPlanStatusControlProps) {
  const activate = useActivateDietPlan();
  // Plano sem especialista é do próprio Praticante: não há para quem enviar.
  const label = dietPlan.specialist_id ? "Enviar para o aluno" : "Ativar plano";

  const handleActivate = async () => {
    try {
      await activate.mutateAsync(dietPlan.id);
      toast.success(dietPlan.specialist_id ? "Dieta enviada ao aluno." : "Plano ativado.");
    } catch (_error) {
      toast.error("Não foi possível enviar o plano.");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <StatusBadge tone="warning">Rascunho</StatusBadge>
      <Button size="sm" onClick={handleActivate} isLoading={activate.isPending}>
        {label}
      </Button>
    </div>
  );
}

function ActiveControl({ dietPlan }: DietPlanStatusControlProps) {
  const finish = useFinishDietPlan();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleFinish = async () => {
    try {
      await finish.mutateAsync(dietPlan.id);
      setIsConfirmOpen(false);
      toast.success("Plano finalizado.");
    } catch (_error) {
      toast.error("Não foi possível finalizar o plano.");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <StatusBadge tone="success">Ativo</StatusBadge>
      <Button size="sm" variant="secondary" onClick={() => setIsConfirmOpen(true)}>
        Finalizar
      </Button>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinish}
        title="Finalizar este plano?"
        description="O aluno deixa de seguir esta dieta hoje. Ela continua no histórico."
        confirmLabel="Finalizar plano"
        isLoading={finish.isPending}
      />
    </div>
  );
}
