"use client";

import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Título do modal, ex: "Deletar Exercício" */
  title?: string;
  /** Nome do item a ser deletado */
  itemName?: string;
  isLoading?: boolean;
  /** @deprecated use itemName */
  workoutTitle?: string;
}

/**
 * Confirmação de exclusão. É só a redação da mensagem sobre o ConfirmModal do
 * design system — o modal em si vive num lugar só.
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Deletar item",
  itemName,
  workoutTitle,
  isLoading,
}: DeleteConfirmModalProps) {
  const displayName = itemName || workoutTitle || "";

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={`Tem certeza que deseja deletar "${displayName}"? Esta ação não pode ser desfeita.`}
      confirmLabel={isLoading ? "Deletando..." : "Deletar"}
      cancelLabel="Cancelar"
      variant="danger"
      isLoading={isLoading}
    />
  );
}
