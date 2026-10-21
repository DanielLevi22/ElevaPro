"use client";

import { MUSCLE_GROUP_LABELS, type SetPlan, summarizeSetPlan } from "@elevapro/shared";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { SetPlanEditor } from "./setPlan/SetPlanEditor";
import { defaultSetPlan } from "./setPlan/setPlanEditing";

export interface SelectedExercise {
  id: string;
  name: string;
  muscle_group: string;
  /** As séries uma a uma (#431). */
  set_plan: SetPlan;
  video_url?: string;
}

interface ExerciseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: {
    id: string;
    name: string;
    muscle_group: string | null;
    video_url?: string | null;
  };
  initialData?: SelectedExercise;
  onSave: (exercise: SelectedExercise) => void;
}

/**
 * "Personalizando Séries": o especialista monta cada série do exercício, com
 * técnicas, repetições, peso, descanso e blocos. Exercício novo nasce com três
 * séries Normal.
 *
 * @example <ExerciseConfigModal isOpen exercise={ex} onClose={close} onSave={save} />
 */
export function ExerciseConfigModal({
  isOpen,
  onClose,
  exercise,
  initialData,
  onSave,
}: ExerciseConfigModalProps) {
  const [plan, setPlan] = useState<SetPlan>(() => initialData?.set_plan ?? defaultSetPlan());

  const handleSave = () => {
    onSave({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group || "",
      set_plan: plan,
      video_url: exercise.video_url || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Personalizando Séries"
      description={exercise.name}
      maxWidth="4xl"
      scrollable
    >
      <div className="space-y-4">
        {exercise.muscle_group ? (
          <span className="inline-block rounded-lg bg-secondary/10 px-3 py-1 text-sm text-secondary">
            {muscleGroupLabel(exercise.muscle_group)}
          </span>
        ) : null}

        <SetPlanEditor plan={plan} onChange={setPlan} />

        {/* Fixo no pé do painel: com várias séries abertas, o Salvar não some. */}
        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 border-t border-overlay-10 bg-surface px-6 py-4">
          <span className="text-xs text-muted-foreground">{summaryText(plan)}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={plan.length === 0}>
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** "3 séries · 8–15 reps · 20–40 kg": o exercício inteiro de relance. */
function summaryText(plan: SetPlan): string {
  const summary = summarizeSetPlan(plan);
  return [summary.sets, summary.reps, summary.weight].filter(Boolean).join(" · ");
}

/** O rótulo do grupo ("Glúteos"), e não o código gravado ("gluteos"). */
function muscleGroupLabel(group: string): string {
  return (MUSCLE_GROUP_LABELS as Record<string, string>)[group] ?? group;
}
