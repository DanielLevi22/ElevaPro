"use client";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface/95 backdrop-blur-xl border border-overlay-10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">
            Tem certeza que deseja deletar{" "}
            <span className="font-semibold text-foreground">"{displayName}"</span>?
          </p>
          <p className="text-sm text-muted-foreground mt-2">Esta ação não pode ser desfeita.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-overlay-05 border border-overlay-10 rounded-lg text-foreground font-medium hover:bg-overlay-10 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-destructive/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Deletando..." : "Deletar"}
          </button>
        </div>
      </div>
    </div>
  );
}
