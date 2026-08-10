"use client";

import { useState } from "react";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface/95 backdrop-blur-xl border border-overlay-10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Configurar Exercício</h2>
          <p className="text-lg text-foreground font-semibold">{exercise.name}</p>
          {exercise.muscle_group && (
            <span className="inline-block mt-2 px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-sm">
              {exercise.muscle_group}
            </span>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Sets */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Séries</label>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(parseInt(e.target.value, 10) || 0)}
              min="1"
              className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Reps */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Repetições</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value, 10) || 0)}
              min="1"
              className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Carga (kg) - Opcional
            </label>
            <input
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Descanso (segundos)
            </label>
            <input
              type="number"
              value={restSeconds}
              onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 0)}
              min="0"
              step="15"
              className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-overlay-05 border border-overlay-10 rounded-lg text-foreground font-medium hover:bg-overlay-10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/50 transition-all"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
