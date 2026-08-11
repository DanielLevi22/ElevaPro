"use client";

import type { Periodization, TrainingPlan } from "@elevapro/shared";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  activatePeriodizationAction,
  addPhaseAction,
  completePeriodizationAction,
} from "@/app/dashboard/workouts/actions";
import { Button } from "@/shared/components/ui/Button";
import { formatDateRange } from "@/shared/utils/formatDate";
import { CreatePeriodizationModal } from "../components/CreatePeriodizationModal";
import { WelcomeBanner } from "../components/WelcomeBanner";

const OBJECTIVE_LABELS: Record<string, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  endurance: "Resistência",
  weight_loss: "Emagrecimento",
  conditioning: "Condicionamento",
  general_fitness: "Saúde Geral",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejada", className: "bg-secondary/10 text-secondary" },
  active: { label: "Ativa", className: "bg-success/10 text-success" },
  completed: { label: "Concluída", className: "bg-overlay-05 text-muted-foreground" },
};

const PLAN_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejada", className: "bg-secondary/10 text-secondary" },
  active: { label: "Ativa", className: "bg-success/10 text-success" },
  completed: { label: "Concluída", className: "bg-overlay-05 text-muted-foreground" },
};

function PlanCard({ plan, periodizationId }: { plan: TrainingPlan; periodizationId: string }) {
  const statusCfg = PLAN_STATUS_CONFIG[plan.status] ?? PLAN_STATUS_CONFIG.planned;

  return (
    <Link
      href={`/dashboard/workouts/periodizations/${periodizationId}/phases/${plan.id}`}
      className="group bg-surface border border-overlay-10 rounded-xl p-4 hover:border-primary/40 transition-all flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {plan.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateRange(plan.start_date, plan.end_date, "medium")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground">
          {plan.workouts_count ?? 0} ficha{(plan.workouts_count ?? 0) !== 1 ? "s" : ""}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
        <svg
          className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

interface Props {
  periodization: Periodization;
  plans: TrainingPlan[];
}

export default function PeriodizationDetailsPage({ periodization, plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPeriodization, setEditingPeriodization] = useState(false);

  const periodizationId = periodization.id;
  const status = STATUS_CONFIG[periodization.status] ?? STATUS_CONFIG.planned;
  const objective = OBJECTIVE_LABELS[periodization.objective ?? ""] ?? periodization.objective;

  const handleAddPhase = () => {
    startTransition(async () => {
      await addPhaseAction(periodizationId);
      router.refresh();
    });
  };

  const handleActivate = () => {
    startTransition(async () => {
      await activatePeriodizationAction(periodizationId);
      router.refresh();
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      await completePeriodizationAction(periodizationId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <WelcomeBanner currentStep={2} />

      {/* Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/dashboard/workouts")}
          className="hover:text-foreground transition-colors"
        >
          Periodizações
        </button>
        <span>/</span>
        <span className="text-foreground">{periodization.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-surface border border-overlay-10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{periodization.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                {status.label}
              </span>
            </div>
            {periodization.student && (
              <p className="text-muted-foreground">{periodization.student.full_name}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 rounded-md bg-overlay-05 text-xs">{objective}</span>
              <span>
                {formatDateRange(periodization.start_date, periodization.end_date, "medium")}
              </span>
              <span>
                {plans.length} fase{plans.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Status actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditingPeriodization(true)}
              className="px-4 py-2 bg-overlay-05 border border-overlay-10 text-muted-foreground rounded-lg text-sm font-medium hover:bg-overlay-10 transition-colors"
            >
              Editar
            </button>
            {periodization.status === "planned" && (
              <button
                onClick={handleActivate}
                disabled={isPending}
                className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
              >
                Ativar
              </button>
            )}
            {periodization.status === "active" && (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="px-4 py-2 bg-overlay-05 text-muted-foreground border border-overlay-10 rounded-lg text-sm font-medium hover:bg-overlay-10 transition-colors disabled:opacity-50"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Fases</h2>
          <Button onClick={handleAddPhase} isLoading={isPending}>
            {isPending ? null : <Plus className="w-4 h-4" />}
            Nova Fase
          </Button>
        </div>

        {plans.length === 0 ? (
          <div className="bg-surface border border-overlay-10 rounded-2xl p-8 text-center">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Adicione a primeira fase
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              Uma fase é um bloco de treinos com foco específico.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Ex: <span className="text-foreground">"Semanas 1–4 · Adaptação"</span>,{" "}
              <span className="text-foreground">"Semanas 5–8 · Força"</span>
            </p>
            <Button onClick={handleAddPhase} isLoading={isPending}>
              Nova Fase
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} periodizationId={periodizationId} />
            ))}
          </div>
        )}
      </div>

      <CreatePeriodizationModal
        isOpen={editingPeriodization}
        onClose={() => setEditingPeriodization(false)}
        onSuccess={() => router.refresh()}
        periodizationId={periodizationId}
        initialData={{
          name: periodization.name,
          objective: periodization.objective as
            | "hypertrophy"
            | "strength"
            | "endurance"
            | "weight_loss"
            | "conditioning"
            | "general_fitness",
          student_id: periodization.student_id,
          start_date: periodization.start_date ?? "",
          end_date: periodization.end_date ?? "",
        }}
      />
    </div>
  );
}
