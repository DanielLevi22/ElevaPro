"use client";

import { Button } from "@/shared/components/ui/Button";
import type { BulkWorkoutProposal } from "../types";

const DAY_LABELS: Record<string, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

interface Props {
  data: BulkWorkoutProposal;
  savedTitles: string[];
  loading: boolean;
  onApproveAll: () => void;
  onAdjust: () => void;
}

export function BulkWorkoutProposalCard({
  data,
  savedTitles,
  loading,
  onApproveAll,
  onAdjust,
}: Props) {
  const workouts = data.workouts ?? [];
  const allSaved = workouts.length > 0 && workouts.every((w) => savedTitles.includes(w.title));
  const someSaved = savedTitles.length > 0;

  return (
    <div className="mx-auto max-w-lg">
      <div className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Proposta de Treinos</h4>
          {allSaved ? (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              ✓ Todos salvos
            </span>
          ) : someSaved ? (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {savedTitles.length}/{workouts.length} salvos
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              Aguardando aprovação
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Fase</p>
            <p className="text-foreground font-medium">{data.phase_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Divisão</p>
            <p className="text-foreground font-medium">
              {workouts.length > 0
                ? workouts.map((_, i) => String.fromCharCode(65 + i)).join("/")
                : "—"}
            </p>
          </div>
        </div>

        {/* Workout list — same style as phase list in periodization card */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Treinos
          </p>
          {workouts.map((workout, i) => {
            const isSaved = savedTitles.includes(workout.title);
            return (
              <div
                key={`${workout.title}-${i}`}
                className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{workout.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      workout.day_of_week ? DAY_LABELS[workout.day_of_week] : null,
                      workout.muscle_group,
                      workout.exercises?.length ? `${workout.exercises.length} exercícios` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {isSaved && <span className="text-xs text-emerald-400 shrink-0">✓</span>}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {!allSaved && (
          <div className="flex gap-2 pt-1">
            <Button fullWidth size="sm" onClick={onApproveAll} isLoading={loading}>
              {someSaved ? "Continuar salvando" : "Aprovar e Salvar Todos"}
            </Button>
            <Button fullWidth size="sm" variant="secondary" onClick={onAdjust} disabled={loading}>
              Ajustar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
