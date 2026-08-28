"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { importWorkoutAction } from "@/app/dashboard/workouts/actions";
import { useWorkouts } from "@/shared/hooks/useWorkouts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  phaseId: string;
}

export function ImportWorkoutModal({ isOpen, onClose, phaseId }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const { data: allWorkouts = [], isLoading } = useWorkouts();

  const filtered = allWorkouts.filter((w) => w.title.toLowerCase().includes(search.toLowerCase()));

  const handleImport = async (workoutId: string) => {
    setImporting(workoutId);
    try {
      await importWorkoutAction(workoutId, phaseId);
      queryClient.invalidateQueries({ queryKey: ["workouts-by-plan", phaseId] });
      router.refresh();
      setImported((prev) => new Set([...prev, workoutId]));
      toast.success("Treino importado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar treino");
    } finally {
      setImporting(null);
    }
  };

  const handleClose = () => {
    setSearch("");
    setImported(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-overlay-10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-overlay-10 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Biblioteca</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Toque num treino para importar para esta fase
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na biblioteca..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-overlay-10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <svg
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-2 space-y-2">
          {isLoading && (
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-overlay-05 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <svg
                aria-hidden="true"
                className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-muted-foreground text-sm">Nenhum treino encontrado</p>
            </div>
          )}

          {!isLoading &&
            filtered.map((workout) => {
              const isImporting = importing === workout.id;
              const isDone = imported.has(workout.id);
              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => !isDone && !isImporting && handleImport(workout.id)}
                  disabled={isImporting || !!importing}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    isDone
                      ? "bg-success/5 border-success/20"
                      : "bg-overlay-05 border-overlay-10 hover:border-primary/40 hover:bg-overlay-10"
                  } disabled:opacity-60`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {workout.title.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{workout.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {workout.exercises?.length ?? 0} exercício
                      {(workout.exercises?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isImporting ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : isDone ? (
                      <svg
                        aria-hidden="true"
                        className="w-5 h-5 text-success"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
