"use client";

import { useState } from "react";
import type { Exercise } from "@/shared/hooks/useExercises";
import { useExercises } from "@/shared/hooks/useExercises";

interface SelectExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  selectedIds: string[];
}

export function SelectExercisesModal({
  isOpen,
  onClose,
  onSelectExercise,
  selectedIds,
}: SelectExercisesModalProps) {
  const { data: exercises = [], isLoading } = useExercises();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscle_group?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface/95 backdrop-blur-xl border border-overlay-10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-overlay-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Selecionar Exercícios</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-overlay-10 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-muted-foreground"
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
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar exercícios..."
              className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 pl-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <svg
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum exercício encontrado" : "Nenhum exercício disponível"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => {
                const isSelected = selectedIds.includes(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    onClick={() => onSelectExercise(exercise)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "bg-overlay-05 border-overlay-10 hover:border-overlay-15 hover:bg-overlay-10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{exercise.name}</h3>
                        {exercise.muscle_group && (
                          <span className="inline-block px-2 py-1 bg-secondary/10 text-secondary rounded text-xs">
                            {exercise.muscle_group}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-3">
                          <svg
                            className="w-5 h-5 text-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-overlay-10">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/50 transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
