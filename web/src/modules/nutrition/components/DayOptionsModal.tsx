import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { Dialog } from "@/shared/components/ui/Dialog";

interface DayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  canPaste: boolean;
  dayName: string;
  isCopying?: boolean;
  isPasting?: boolean;
  isClearing?: boolean;
}

export function DayOptionsModal({
  isOpen,
  onClose,
  onCopy,
  onPaste,
  onClear,
  canPaste,
  dayName,
  isCopying,
  isPasting,
  isClearing,
}: DayOptionsModalProps) {
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} title={`Opções - ${dayName}`} maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onCopy}
              disabled={isCopying || isPasting || isClearing}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                {isCopying ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {isCopying ? "Copiando..." : "Copiar Dia"}
                </p>
                <p className="text-xs text-muted-foreground">Copiar todas as refeições deste dia</p>
              </div>
            </button>

            <button
              type="button"
              onClick={onPaste}
              disabled={!canPaste || isCopying || isPasting || isClearing}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                {isPasting ? (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {isPasting ? "Colando..." : "Colar Dia"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPasting
                    ? "Processando dados..."
                    : canPaste
                      ? "Substituir refeições por dia copiado"
                      : "Copie um dia primeiro"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              disabled={isCopying || isPasting || isClearing}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                {isClearing ? (
                  <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-red-400"
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
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {isClearing ? "Limpando..." : "Limpar Dia"}
                </p>
                <p className="text-xs text-muted-foreground">Remover todas as refeições</p>
              </div>
            </button>
          </div>

          <div className="pt-2">
            <Button fullWidth variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={onClear}
        title="Limpar Dia"
        description={`Tem certeza que deseja remover TODAS as refeições de ${dayName}? Esta ação não pode ser desfeita.`}
        confirmLabel="Limpar tudo"
        variant="danger"
      />
    </>
  );
}
