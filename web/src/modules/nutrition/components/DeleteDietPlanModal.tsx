"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

interface DeleteDietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  isDeleting: boolean;
}

const REMOVED_DATA = [
  "Todas as refeições e horários configurados",
  "Alimentos e quantidades de cada refeição",
  "Histórico de logs e adesão deste período",
  "Metas de calorias e macros do planejamento",
];

/**
 * Não usa o ConfirmModal genérico porque enumera o que será apagado — a
 * exclusão leva junto refeições, logs e metas, e isso precisa estar à vista.
 */
export function DeleteDietPlanModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
  isDeleting,
}: DeleteDietPlanModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} title="Excluir plano nutricional?">
      <div className="flex flex-col gap-5">
        <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Esta ação é <span className="font-bold text-destructive">irreversível</span>. Ao
          confirmar, todos os dados vinculados ao plano{" "}
          <span className="font-bold text-foreground">{planName}</span> serão removidos
          permanentemente:
        </p>

        <ul className="space-y-2.5">
          {REMOVED_DATA.map((item) => (
            <li key={item} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-destructive/50" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <Button fullWidth variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button fullWidth variant="destructive" onClick={onConfirm} isLoading={isDeleting}>
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
