"use client";

import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

export interface SelectedExercise {
  id: string;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  weight: string;
  rest_seconds: number;
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

export function ExerciseConfigModal({
  isOpen,
  onClose,
  exercise,
  initialData,
  onSave,
}: ExerciseConfigModalProps) {
  const cargaKgOpcionalId = useId();
  const descansoSegundosId = useId();
  const repeticoesId = useId();
  const seriesId = useId();
  const [sets, setSets] = useState(initialData?.sets || 3);
  const [reps, setReps] = useState(initialData?.reps || 12);
  const [weight, setWeight] = useState(initialData?.weight || "");
  const [restSeconds, setRestSeconds] = useState(initialData?.rest_seconds || 60);

  const handleSave = () => {
    onSave({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group || "",
      sets,
      reps,
      weight,
      rest_seconds: restSeconds,
      video_url: exercise.video_url || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Configurar Exercício"
      description={exercise.name}
    >
      <div className="space-y-4">
        {exercise.muscle_group && (
          <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-sm">
            {exercise.muscle_group}
          </span>
        )}
        {/* Sets */}
        <div>
          <label htmlFor={seriesId} className="block text-sm font-medium text-foreground mb-2">
            Séries
          </label>
          <input
            id={seriesId}
            type="number"
            value={sets}
            onChange={(e) => setSets(parseInt(e.target.value, 10) || 0)}
            min="1"
            className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Reps */}
        <div>
          <label htmlFor={repeticoesId} className="block text-sm font-medium text-foreground mb-2">
            Repetições
          </label>
          <input
            id={repeticoesId}
            type="number"
            value={reps}
            onChange={(e) => setReps(parseInt(e.target.value, 10) || 0)}
            min="1"
            className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Weight */}
        <div>
          <label
            htmlFor={cargaKgOpcionalId}
            className="block text-sm font-medium text-foreground mb-2"
          >
            Carga (kg) - Opcional
          </label>
          <input
            id={cargaKgOpcionalId}
            type="number"
            min="0"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Ex: 20"
            className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Rest */}
        <div>
          <label
            htmlFor={descansoSegundosId}
            className="block text-sm font-medium text-foreground mb-2"
          >
            Descanso (segundos)
          </label>
          <input
            id={descansoSegundosId}
            type="number"
            value={restSeconds}
            onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 0)}
            min="0"
            step="15"
            className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button fullWidth variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button fullWidth onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
