"use client";

import { SetPlanSummaryLine } from "@/shared/components/ui/SetPlanSummaryLine";
import type { SelectedExercise } from "./ExerciseConfigModal";

interface ExerciseListItemProps {
  exercise: SelectedExercise;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}

export function ExerciseListItem({ exercise, index, onEdit, onRemove }: ExerciseListItemProps) {
  return (
    <div className="bg-overlay-05 border border-overlay-10 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary-foreground">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <button type="button" onClick={onEdit} className="text-left w-full group">
            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {exercise.name}
            </h4>
            <span className="inline-block mt-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">
              {exercise.muscle_group}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
          title="Remover exercício"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-muted-foreground hover:text-destructive"
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

      <SetPlanSummaryLine plan={exercise.set_plan} />
    </div>
  );
}
