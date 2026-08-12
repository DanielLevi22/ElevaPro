"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      scrollable
      maxWidth="2xl"
      title="Selecionar Exercícios"
      description={`${selectedIds.length} ${selectedIds.length === 1 ? "selecionado" : "selecionados"}`}
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar exercícios..."
            aria-label="Buscar exercícios"
            className="w-full bg-overlay-05 border border-border rounded-lg px-4 py-3 pl-10 text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </div>

        {/* Content */}
        <div>
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
        <div className="pt-2">
          <Button fullWidth onClick={onClose}>
            Concluir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
