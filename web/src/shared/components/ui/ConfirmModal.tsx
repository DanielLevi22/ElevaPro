"use client";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para acao destrutiva — exclusao, cancelamento de vinculo. */
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

/**
 * Confirmacao de acao. Unico modal de confirmacao do produto: antes existiam
 * tres (ConfirmationModal, ConfirmModal e DeleteConfirmModal), cada um com seu
 * proprio overlay, tipografia e botoes.
 *
 * @example
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={close}
 *   onConfirm={remove}
 *   title="Excluir plano"
 *   description="Esta acao nao pode ser desfeita."
 *   variant="danger"
 * />
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} title={title} description={description} maxWidth="sm">
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "destructive" : "primary"}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
