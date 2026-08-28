"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  addExerciseAction,
  deleteExerciseAction,
  updateExerciseAction,
} from "@/app/dashboard/workouts/actions";
import { Button } from "@/shared/components/ui/Button";
import { useWorkout, useWorkoutItems, type WorkoutItem } from "@/shared/hooks/useWorkouts";
import { CreateWorkoutModal } from "../components/CreateWorkoutModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { ExerciseConfigModal, type SelectedExercise } from "../components/ExerciseConfigModal";
import { SelectExercisesModal } from "../components/SelectExercisesModal";
import { WelcomeBanner } from "../components/WelcomeBanner";

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export default function WorkoutDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.workoutId as string;
  const periodizationId = params.id as string | undefined;
  const phaseId = params.phaseId as string | undefined;
  const queryClient = useQueryClient();

  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false);
  const [selectExercisesOpen, setSelectExercisesOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [configExercise, setConfigExercise] = useState<{
    id: string;
    name: string;
    muscle_group: string | null;
    video_url?: string | null;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<WorkoutItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WorkoutItem | null>(null);

  const { data: workout, isLoading: loadingWorkout } = useWorkout(workoutId);
  const { data: items = [], isLoading: loadingItems } = useWorkoutItems(workoutId);

  const isLoading = loadingWorkout || loadingItems;

  const handleAddExercise = (exercise: {
    id: string;
    name: string;
    muscle_group: string | null;
    video_url?: string | null;
  }) => {
    setSelectExercisesOpen(false);
    setConfigExercise(exercise);
  };

  const handleSaveExercise = async (ex: SelectedExercise) => {
    try {
      await addExerciseAction(
        workoutId,
        periodizationId ?? workout?.training_plan_id ?? "",
        phaseId ?? workout?.training_plan_id ?? "",
        {
          exercise_id: ex.id,
          order_index: items.length,
          sets: ex.sets,
          reps: String(ex.reps),
          rest_seconds: ex.rest_seconds,
          weight: ex.weight || null,
        },
      );
      queryClient.invalidateQueries({ queryKey: ["workout-items", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["workouts-by-plan"] });
      router.refresh();
      setConfigExercise(null);
      toast.success("Exercício adicionado");
    } catch {
      toast.error("Erro ao adicionar exercício");
    }
  };

  const handleUpdateExercise = async (ex: SelectedExercise) => {
    if (!editingItem) return;
    try {
      await updateExerciseAction(editingItem.id, workoutId, {
        sets: ex.sets,
        reps: String(ex.reps),
        rest_seconds: ex.rest_seconds,
        weight: ex.weight || null,
      });
      queryClient.invalidateQueries({ queryKey: ["workout-items", workoutId] });
      router.refresh();
      setEditingItem(null);
      toast.success("Exercício atualizado");
    } catch {
      toast.error("Erro ao atualizar exercício");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await deleteExerciseAction(deletingItem.id, workoutId);
      queryClient.invalidateQueries({ queryKey: ["workout-items", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["workouts-by-plan"] });
      router.refresh();
      setDeletingItem(null);
      toast.success("Exercício removido");
    } catch {
      toast.error("Erro ao remover exercício");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface rounded-lg animate-pulse w-48" />
        <div className="h-28 bg-surface rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Treino não encontrado.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-primary hover:underline text-sm"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner currentStep={4} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button
          type="button"
          onClick={() => router.push("/dashboard/workouts")}
          className="hover:text-foreground transition-colors"
        >
          Periodizações
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => router.back()}
          className="hover:text-foreground transition-colors"
        >
          Fase
        </button>
        <span>/</span>
        <span className="text-foreground">{workout.title}</span>
      </nav>

      {/* Header card */}
      <div className="bg-surface border border-overlay-10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{workout.title}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {workout.difficulty && (
                  <span className="px-2 py-0.5 rounded-md bg-overlay-05">
                    {DIFFICULTY_LABELS[workout.difficulty]}
                  </span>
                )}
                <span>
                  {items.length} exercício{items.length !== 1 ? "s" : ""}
                </span>
              </div>
              {workout.description && (
                <p className="text-sm text-muted-foreground mt-2">{workout.description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditWorkoutOpen(true)}
            className="px-4 py-2 bg-overlay-05 border border-overlay-10 text-muted-foreground rounded-lg text-sm hover:bg-overlay-10 transition-colors self-start shrink-0"
          >
            Editar Treino
          </button>
        </div>
      </div>

      {/* Exercícios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Exercícios</h2>
          <Button onClick={() => setSelectExercisesOpen(true)}>
            <Plus className="w-4 h-4" />
            Adicionar Exercício
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="bg-surface border border-overlay-10 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum exercício ainda</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Busque na biblioteca e configure séries, repetições e carga para cada exercício.
            </p>
            <Button onClick={() => setSelectExercisesOpen(true)}>Adicionar Exercício</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-surface border border-overlay-10 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Order */}
                <div className="w-7 h-7 rounded-lg bg-overlay-05 flex items-center justify-center shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                </div>

                {/* Exercise info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {item.exercise?.name ?? "Exercício desconhecido"}
                  </p>
                  {item.exercise?.muscle_group && (
                    <p className="text-xs text-muted-foreground">{item.exercise.muscle_group}</p>
                  )}
                </div>

                {/* Config */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <div className="text-center">
                    <p className="text-foreground font-semibold">{item.sets}</p>
                    <p>séries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-semibold">{item.reps}</p>
                    <p>reps</p>
                  </div>
                  {item.weight && (
                    <div className="text-center">
                      <p className="text-foreground font-semibold">{item.weight}</p>
                      <p>carga</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-foreground font-semibold">{item.rest_seconds}s</p>
                    <p>descanso</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 rounded-lg hover:bg-overlay-10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateWorkoutModal
        isOpen={editWorkoutOpen}
        onClose={() => setEditWorkoutOpen(false)}
        workoutId={workoutId}
        trainingPlanId={workout.training_plan_id ?? undefined}
      />

      <SelectExercisesModal
        isOpen={selectExercisesOpen}
        onClose={() => setSelectExercisesOpen(false)}
        onSelectExercise={handleAddExercise}
        selectedIds={items.map((i) => i.exercise_id)}
      />

      {/* Adicionar novo exercício */}
      {configExercise && (
        <ExerciseConfigModal
          isOpen={true}
          onClose={() => setConfigExercise(null)}
          exercise={configExercise}
          onSave={handleSaveExercise}
        />
      )}

      {/* Editar exercício existente */}
      {editingItem?.exercise && (
        <ExerciseConfigModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          exercise={editingItem.exercise}
          initialData={{
            id: editingItem.exercise.id,
            name: editingItem.exercise.name,
            muscle_group: editingItem.exercise.muscle_group ?? "",
            sets: editingItem.sets ?? 0,
            reps: parseInt(editingItem.reps ?? "0", 10) || 0,
            weight: editingItem.weight ?? "",
            rest_seconds: editingItem.rest_seconds ?? 0,
          }}
          onSave={handleUpdateExercise}
        />
      )}

      {/* Confirmar exclusão */}
      <DeleteConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Remover exercício"
        itemName={deletingItem?.exercise?.name ?? "este exercício"}
        isLoading={deleting}
      />
    </div>
  );
}
