"use client";

import { supabase } from "@elevapro/supabase";
import { useEffect, useId, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import type { Exercise } from "@/shared/hooks/useExercises";
import { useCreateWorkout, useUpdateWorkout } from "@/shared/hooks/useWorkoutMutations";
import { useWorkout } from "@/shared/hooks/useWorkouts";
import { ExerciseConfigModal, type SelectedExercise } from "./ExerciseConfigModal";
import { ExerciseListItem } from "./ExerciseListItem";
import { SelectExercisesModal } from "./SelectExercisesModal";

interface CreateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutId?: string;
  trainingPlanId?: string;
  hideExercises?: boolean;
  asPage?: boolean;
  memberStudentId?: string;
  onSuccess?: (workoutId: string) => void;
}

export function CreateWorkoutModal({
  isOpen,
  onClose,
  workoutId,
  trainingPlanId,
  hideExercises = false,
  asPage = false,
  memberStudentId,
  onSuccess,
}: CreateWorkoutModalProps) {
  const nivelId = useId();
  const descricaoOpcionalId = useId();
  const duracaoMinId = useId();
  const identificadorId = useId();
  const nomeDoTreinoId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate",
  );

  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Current exercise being configured (can be a new Exercise or an existing SelectedExercise)
  const [currentExercise, setCurrentExercise] = useState<{
    id: string;
    name: string;
    muscle_group: string | null;
    video_url?: string | null;
  } | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { data: existingWorkout } = useWorkout(workoutId || "");
  const createMutation = useCreateWorkout();
  const updateMutation = useUpdateWorkout();

  const isEditing = !!workoutId;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Load existing workout data
  useEffect(() => {
    if (existingWorkout) {
      setTitle(existingWorkout.title);
      setDescription(existingWorkout.description || "");
      setDifficultyLevel(existingWorkout.difficulty || "intermediate");
      // TODO: Load workout items if editing
    }
  }, [existingWorkout]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setIdentifier("");
      setEstimatedDuration("");
      setDifficultyLevel("intermediate");
      setSelectedExercises([]);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // When hideExercises (adding to a phase), auto-generate title from identifier
      const resolvedTitle = hideExercises && identifier ? `Treino ${identifier}` : title;

      const workoutData = {
        title: resolvedTitle,
        description,
        training_plan_id: trainingPlanId ?? null,
        difficulty: difficultyLevel,
        // Member creates workout for themselves; specialist leaves these unset
        ...(memberStudentId ? { student_id: memberStudentId, specialist_id: null } : {}),
      };

      let newWorkoutId = workoutId;

      if (isEditing && workoutId) {
        await updateMutation.mutateAsync({
          id: workoutId,
          ...workoutData,
        });
      } else {
        const result = await createMutation.mutateAsync(workoutData);
        newWorkoutId = result.id;
      }

      if (newWorkoutId) {
        // Create workout items
        if (selectedExercises.length > 0) {
          // Delete existing items if editing
          if (isEditing) {
            await supabase.from("workout_exercises").delete().eq("workout_id", newWorkoutId);
          }

          const items = selectedExercises.map((ex, index) => ({
            workout_id: newWorkoutId,
            exercise_id: ex.id,
            order_index: index,
            sets: ex.sets,
            // `workout_exercises.reps` é text no banco — guarda coisas como
            // "8-12" e "AMRAP", não só número. O modal edita um número, então a
            // conversão acontece aqui, na fronteira com o banco.
            reps: String(ex.reps),
            rest_seconds: ex.rest_seconds,
            weight: ex.weight || null,
            notes: null,
          }));

          const { error: itemsError } = await supabase.from("workout_exercises").insert(items);

          if (itemsError) throw itemsError;
        }
      }

      if (newWorkoutId && onSuccess) {
        onSuccess(newWorkoutId);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      alert(`Erro ao salvar treino: ${JSON.stringify(error)}`);
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    setCurrentExercise({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      video_url: exercise.video_url,
    });
    setEditingIndex(null);
    setShowSelectModal(false);
    setShowConfigModal(true);
  };

  const handleSaveExerciseConfig = (config: SelectedExercise) => {
    if (editingIndex !== null) {
      // Edit existing
      const newExercises = [...selectedExercises];
      newExercises[editingIndex] = config;
      setSelectedExercises(newExercises);
    } else {
      // Add new
      setSelectedExercises([...selectedExercises, config]);
    }
    setShowConfigModal(false);
    setCurrentExercise(null);
    setEditingIndex(null);
  };

  const handleEditExercise = (index: number) => {
    const exercise = selectedExercises[index];
    setCurrentExercise({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      video_url: exercise.video_url,
    });
    setEditingIndex(index);
    setShowConfigModal(true);
  };

  const handleRemoveExercise = (index: number) => {
    const newExercises = [...selectedExercises];
    newExercises.splice(index, 1);
    setSelectedExercises(newExercises);
  };

  if (!asPage && !isOpen) return null;

  const contentBox = (
    <div
      className={`bg-surface border border-overlay-10 rounded-2xl w-full flex flex-col overflow-hidden ${asPage ? "" : "max-h-[90vh]"} ${isEditing || hideExercises ? "max-w-lg" : "max-w-6xl"}`}
    >
      <div className="p-6 border-b border-overlay-10 flex items-center justify-between bg-surface z-10 flex-none">
        <h2 className="text-2xl font-bold text-foreground">
          {isEditing ? "Editar Treino" : "Novo Treino"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            aria-hidden="true"
            className="w-6 h-6"
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

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div
            className={
              isEditing || hideExercises ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-6"
            }
          >
            <div className="space-y-4">
              {/* Nome — hidden when hideExercises (identifier-based naming) */}
              {!hideExercises && (
                <div>
                  <label
                    htmlFor={nomeDoTreinoId}
                    className="block text-sm font-medium text-muted-foreground mb-1"
                  >
                    Nome do Treino
                  </label>
                  <input
                    id={nomeDoTreinoId}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-overlay-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50"
                    placeholder="Ex: Treino A - Peito e Tríceps"
                    required
                  />
                </div>
              )}

              {trainingPlanId && (
                <div className={hideExercises ? "space-y-4" : "grid grid-cols-2 gap-4"}>
                  <div>
                    <label
                      htmlFor={identificadorId}
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Identificador <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={identificadorId}
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 bg-background border border-overlay-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50 font-mono"
                      placeholder="Ex: D, E"
                      maxLength={5}
                      required={hideExercises}
                    />
                    {hideExercises && identifier && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Será criado como{" "}
                        <span className="text-foreground font-medium">Treino {identifier}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={duracaoMinId}
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Duração (min)
                    </label>
                    <input
                      id={duracaoMinId}
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-overlay-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50"
                      placeholder="Ex: 60"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor={descricaoOpcionalId}
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Descrição (Opcional)
                </label>
                <textarea
                  id={descricaoOpcionalId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-overlay-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50 min-h-[100px]"
                  placeholder="Instruções gerais para o treino..."
                />
              </div>

              {trainingPlanId && (
                <div>
                  <span
                    id={nivelId}
                    className="block text-sm font-medium text-muted-foreground mb-1"
                  >
                    Nível de Dificuldade
                  </span>
                  <fieldset className="flex gap-2" aria-labelledby={nivelId}>
                    {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficultyLevel(level)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          difficultyLevel === level
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-overlay-10 text-muted-foreground hover:bg-overlay-05"
                        }`}
                      >
                        {level === "beginner" && "Iniciante"}
                        {level === "intermediate" && "Intermediário"}
                        {level === "advanced" && "Avançado"}
                      </button>
                    ))}
                  </fieldset>
                </div>
              )}
            </div>

            {/* Exercises List — only shown when creating without hideExercises flag */}
            {!isEditing && !hideExercises && (
              <div className="flex flex-col h-full min-h-125">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="block text-sm font-medium text-muted-foreground">
                    Exercícios ({selectedExercises.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSelectModal(true)}
                    className="text-sm text-secondary hover:text-secondary/80 font-medium flex items-center gap-1"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
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
                    Adicionar Exercício
                  </button>
                </div>

                <div className="flex-1 bg-background/30 border border-overlay-10 rounded-xl overflow-hidden flex flex-col relative">
                  {selectedExercises.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <div className="w-16 h-16 bg-overlay-05 rounded-full flex items-center justify-center mb-4">
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <p className="text-lg font-medium mb-1">Seu treino está vazio</p>
                      <p className="text-sm opacity-70 mb-4">
                        Adicione exercícios para começar a montar o treino.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowSelectModal(true)}
                        className="px-4 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
                      >
                        Selecionar exercícios
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-y-auto absolute inset-0 p-3 space-y-2">
                      {selectedExercises.map((item, index) => (
                        <ExerciseListItem
                          // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
                          key={`${item.id}-${index}`}
                          exercise={item}
                          index={index}
                          onEdit={() => handleEditExercise(index)}
                          onRemove={() => handleRemoveExercise(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-none p-6 border-t border-overlay-10 bg-surface flex justify-end gap-3 z-10">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? "Salvar Alterações" : "Criar Treino"}
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {asPage ? (
        contentBox
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          {contentBox}
        </div>
      )}

      <SelectExercisesModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSelectExercise={handleAddExercise}
        selectedIds={selectedExercises.map((ex) => ex.id)}
      />

      {showConfigModal && currentExercise && (
        <ExerciseConfigModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setCurrentExercise(null);
            setEditingIndex(null);
          }}
          exercise={currentExercise}
          onSave={handleSaveExerciseConfig}
          initialData={editingIndex !== null ? selectedExercises[editingIndex] : undefined}
        />
      )}
    </>
  );
}
