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

/** 90 vira "1min30", 60 vira "1min" — segundos crus são difíceis de comparar. */
function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutos = Math.floor(seconds / 60);
  const resto = seconds % 60;
  return resto === 0 ? `${minutos}min` : `${minutos}min${resto}`;
}

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
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Treinos</p>
        {workouts.map((workout, i) => {
          const isSaved = savedTitles.includes(workout.title);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
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

                {/* A prescrição inteira, não só a contagem. Sem isto o
                      especialista aprova sem saber série, repetição nem
                      descanso — e é justamente o que ele precisa conferir. */}
                {workout.exercises && workout.exercises.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {workout.exercises.map((ex, j) => (
                      <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
                        key={`${ex.exercise_name}-${j}`}
                        className="flex items-baseline justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 truncate text-foreground/90">
                          {ex.exercise_name}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {ex.sets}×{ex.reps}
                          {ex.rest_seconds ? ` · ${formatRest(ex.rest_seconds)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
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
  );
}
