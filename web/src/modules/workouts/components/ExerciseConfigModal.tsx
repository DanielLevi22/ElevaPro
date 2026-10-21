"use client";

import type { SetPlan } from "@elevapro/shared";
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
      maxWidth="2xl"
      scrollable
    >
      <div className="space-y-4">
        {exercise.muscle_group ? (
          <span className="inline-block rounded-lg bg-secondary/10 px-3 py-1 text-sm text-secondary">
            {exercise.muscle_group}
          </span>
        ) : null}

        <SetPlanEditor plan={plan} onChange={setPlan} />

        <div className="flex items-center gap-3 pt-2">
          <Button fullWidth variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button fullWidth onClick={handleSave} disabled={plan.length === 0}>
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
