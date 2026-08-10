"use client";

import type { TrainingPlan, Workout } from "@elevapro/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changeSplitAction,
  deletePhaseAction,
  deleteWorkoutAction,
  updatePhaseDatesAction,
  updatePhaseStatusAction,
} from "@/app/dashboard/workouts/actions";
import { CreateWorkoutModal } from "../components/CreateWorkoutModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { ImportWorkoutModal } from "../components/ImportWorkoutModal";
import { WelcomeBanner } from "../components/WelcomeBanner";

const SPLITS = ["A", "AB", "ABC", "ABCD", "ABCDE", "ABCDEF"];

const PLAN_STATUS_CONFIG = {
  planned: {
    label: "Planejado",
    className: "bg-secondary/10 text-secondary border border-secondary/20",
  },
  active: {
    label: "Ativo",
    className: "bg-success/10 text-success border border-success/20",
  },
  completed: {
    label: "Concluído",
    className: "bg-overlay-05 text-muted-foreground border border-overlay-10",
  },
} as const;

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: (w: Workout) => void }) {
  return (
    <div className="group bg-surface border border-overlay-10 rounded-xl hover:border-primary/40 transition-all flex items-center">
      <Link
        href={`/dashboard/workouts/${workout.id}`}
        className="flex items-center gap-4 flex-1 min-w-0 p-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <span className="text-primary font-bold text-sm">{workout.title.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {workout.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workout.exercises?.length ?? 0} exercício
            {(workout.exercises?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <svg
          className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => onDelete(workout)}
        className="p-3 mr-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        title="Remover treino"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

interface Props {
  plan: TrainingPlan;
  workouts: Workout[];
  periodizationId: string;
  phaseId: string;
}

export default function PhaseDetailsPage({ plan, workouts, periodizationId, phaseId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [changingSplit, setChangingSplit] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [pendingSplit, setPendingSplit] = useState<string | null>(null);
  const [customSplitInput, setCustomSplitInput] = useState("");
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);

  const muscleGroups = Array.from(
    new Set(workouts.map((w) => w.muscle_group).filter(Boolean) as string[]),
  );

  const filteredWorkouts = selectedMuscle
    ? workouts.filter((w) => w.muscle_group === selectedMuscle)
    : workouts;

  const handleConfirmDeleteWorkout = useCallback(() => {
    if (!deletingWorkout) return;
    startTransition(async () => {
      try {
        await deleteWorkoutAction(deletingWorkout.id, phaseId, periodizationId);
        router.refresh();
        toast.success("Treino removido");
      } catch {
        toast.error("Erro ao remover treino");
      } finally {
        setDeletingWorkout(null);
      }
    });
  }, [deletingWorkout, phaseId, periodizationId, router]);

  const handleConfirmSplit = useCallback(async () => {
    if (!pendingSplit) return;
    const split = pendingSplit;
    setChangingSplit(true);
    setPendingSplit(null);
    try {
      await changeSplitAction(phaseId, periodizationId, split);
      router.refresh();
      toast.success(`Divisão criada: ${split}`);
    } catch {
      toast.error("Erro ao alterar divisão de treino");
    } finally {
      setChangingSplit(false);
    }
  }, [pendingSplit, phaseId, periodizationId, router]);

  const handleDeletePhase = useCallback(async () => {
    if (!confirm(`Excluir a fase "${plan.name}"? Todos os treinos serão perdidos.`)) return;
    startTransition(async () => {
      await deletePhaseAction(phaseId, periodizationId);
      router.push(`/dashboard/workouts/periodizations/${periodizationId}`);
    });
  }, [plan.name, phaseId, periodizationId, router]);

  const handleUpdateDate = useCallback(
    async (field: "start_date" | "end_date", value: string) => {
      await updatePhaseDatesAction(phaseId, periodizationId, { [field]: value });
      router.refresh();
    },
    [phaseId, periodizationId, router],
  );

  const handleUpdateStatus = useCallback(
    async (status: "planned" | "active" | "completed") => {
      await updatePhaseStatusAction(phaseId, periodizationId, status);
      router.refresh();
    },
    [phaseId, periodizationId, router],
  );

  const statusCfg =
    PLAN_STATUS_CONFIG[plan.status as keyof typeof PLAN_STATUS_CONFIG] ??
    PLAN_STATUS_CONFIG.planned;

  return (
    <div className="space-y-6">
      <WelcomeBanner currentStep={3} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/dashboard/workouts")}
          className="hover:text-foreground transition-colors"
        >
          Periodizações
        </button>
        <span>/</span>
        <button
          onClick={() => router.push(`/dashboard/workouts/periodizations/${periodizationId}`)}
          className="hover:text-foreground transition-colors"
        >
          Periodização
        </button>
        <span>/</span>
        <span className="text-foreground">{plan.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
        <div className="flex items-center gap-2">
          {/* Status menu */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${statusCfg.className} hover:opacity-80`}
            >
              {statusCfg.label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-overlay-10 rounded-xl shadow-xl z-20 p-1.5 flex flex-col gap-0.5 min-w-35">
                {(["planned", "active", "completed"] as const).map((s) => {
                  const cfg = PLAN_STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        handleUpdateStatus(s);
                        setShowStatusMenu(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors hover:bg-overlay-05 ${
                        plan.status === s ? "opacity-50 cursor-default" : ""
                      } ${cfg.className}`}
                      disabled={plan.status === s}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Delete */}
          <button
            onClick={handleDeletePhase}
            disabled={isPending}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            title="Excluir fase"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Config card */}
      <div className="bg-surface border border-overlay-10 rounded-2xl p-6 space-y-5">
        {/* Split picker (creates workouts per letter) */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Divisão de Treino
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSplitPicker((v) => !v)}
              disabled={changingSplit}
              className="flex items-center gap-2 bg-overlay-05 border border-overlay-10 px-4 py-2.5 rounded-xl hover:bg-overlay-10 transition-colors disabled:opacity-50"
            >
              <span className="text-foreground font-bold text-lg uppercase">
                {workouts.map((w) => w.title.charAt(0)).join("") || "--"}
              </span>
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showSplitPicker && (
              <div className="absolute left-0 top-full mt-1 bg-surface border border-overlay-10 rounded-xl shadow-xl z-20 p-2 flex flex-col gap-1 min-w-40">
                {SPLITS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setShowSplitPicker(false);
                      setPendingSplit(s);
                    }}
                    className="px-4 py-2 rounded-lg text-left text-sm font-bold hover:bg-primary/10 hover:text-primary transition-colors text-foreground"
                  >
                    {s}
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({s.length} ficha{s.length !== 1 ? "s" : ""})
                    </span>
                  </button>
                ))}
                {/* Custom split input */}
                <div className="border-t border-overlay-10 mt-1 pt-2 px-1">
                  <p className="text-xs text-muted-foreground mb-1.5 px-1">Personalizado</p>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customSplitInput}
                      onChange={(e) =>
                        setCustomSplitInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
                      }
                      placeholder="Ex: ABCBAC"
                      maxLength={12}
                      className="flex-1 min-w-0 bg-overlay-05 border border-overlay-10 rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono uppercase"
                    />
                    <button
                      type="button"
                      disabled={customSplitInput.length === 0}
                      onClick={() => {
                        setShowSplitPicker(false);
                        setPendingSplit(customSplitInput);
                        setCustomSplitInput("");
                      }}
                      className="px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-overlay-08" />

        {/* Dates */}
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Início
            </p>
            <input
              type="date"
              defaultValue={plan.start_date?.split("T")[0] ?? ""}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== plan.start_date?.split("T")[0]) {
                  handleUpdateDate("start_date", e.target.value);
                }
              }}
              className="w-full bg-overlay-05 border border-overlay-10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Término
            </p>
            <input
              type="date"
              defaultValue={plan.end_date?.split("T")[0] ?? ""}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== plan.end_date?.split("T")[0]) {
                  handleUpdateDate("end_date", e.target.value);
                }
              }}
              className="w-full bg-overlay-05 border border-overlay-10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Workouts section */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Treinos da Fase <span className="text-foreground">{workouts.length}</span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddWorkout(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Novo Treino
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Importar
            </button>
          </div>
        </div>

        {/* Muscle filter tabs */}
        {muscleGroups.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedMuscle(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !selectedMuscle
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-overlay-10 text-muted-foreground hover:bg-overlay-05"
              }`}
            >
              Todos
            </button>
            {muscleGroups.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMuscle(m === selectedMuscle ? null : m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedMuscle === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface border border-overlay-10 text-muted-foreground hover:bg-overlay-05"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Loading overlay when changing split */}
        {changingSplit && (
          <div className="flex items-center gap-3 py-4 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Criando treinos para a divisão...</span>
          </div>
        )}

        {/* Empty state */}
        {!changingSplit && filteredWorkouts.length === 0 && (
          <div className="bg-surface border border-overlay-10 rounded-2xl p-8 text-center">
            {selectedMuscle ? (
              <p className="text-sm text-muted-foreground">
                Nenhum treino com foco em <span className="text-foreground">{selectedMuscle}</span>.
              </p>
            ) : (
              <>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
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
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Crie os treinos desta fase
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Escolha uma divisão (ABC, ABCD...) para gerar as fichas automaticamente.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Ou use <span className="text-foreground">Novo Treino</span> para adicionar
                  manualmente.
                </p>
                <button
                  onClick={() => setShowSplitPicker(true)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Escolher divisão
                </button>
              </>
            )}
          </div>
        )}

        {/* Workout list */}
        {!changingSplit && filteredWorkouts.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} onDelete={setDeletingWorkout} />
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!deletingWorkout}
        onClose={() => setDeletingWorkout(null)}
        onConfirm={handleConfirmDeleteWorkout}
        title="Remover treino"
        itemName={deletingWorkout?.title ?? "este treino"}
        isLoading={isPending}
      />

      <CreateWorkoutModal
        isOpen={showAddWorkout}
        onClose={() => setShowAddWorkout(false)}
        trainingPlanId={phaseId}
        hideExercises
        onSuccess={() => {
          setShowAddWorkout(false);
          router.refresh();
        }}
      />

      <ImportWorkoutModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        phaseId={phaseId}
      />

      {/* Confirmação de troca de divisão */}
      {pendingSplit !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setPendingSplit(null)}
          />
          <div className="relative bg-surface/95 backdrop-blur-xl border border-overlay-10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-warning/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Alterar divisão de treino?</h2>
              <p className="text-muted-foreground text-sm">
                Ao mudar para a divisão{" "}
                <span className="font-bold text-foreground">{pendingSplit}</span>, todos os treinos
                atuais desta fase serão{" "}
                <span className="text-destructive font-semibold">excluídos</span> e{" "}
                {pendingSplit.length} novo{pendingSplit.length !== 1 ? "s" : ""} treino
                {pendingSplit.length !== 1 ? "s" : ""} vazio{pendingSplit.length !== 1 ? "s" : ""}{" "}
                serão criados.
              </p>
              <p className="text-xs text-muted-foreground mt-2">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingSplit(null)}
                className="flex-1 px-4 py-2.5 bg-overlay-05 border border-overlay-10 rounded-lg text-foreground font-medium hover:bg-overlay-10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSplit}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Sim, alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
