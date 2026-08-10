"use client";

import type { DietPlan } from "@elevapro/shared";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useAuthStore } from "@/modules/auth";
import { NutritionFlowBanner } from "@/modules/nutrition/components/NutritionFlowBanner";
import { EmptyPlanState } from "../components/EmptyPlanState";
import { useCurrentStudentId, useStudentActiveDietPlan } from "../hooks/useStudentDashboardData";

export function StudentNutritionPage() {
  const accountType = useAuthStore((s) => s.accountType);
  const studentId = useCurrentStudentId();
  const { data: activePlan, isLoading } = useStudentActiveDietPlan(studentId);

  const isMember = accountType === "member";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="h-10 w-48 bg-surface/40 rounded-xl animate-pulse" />
        <div className="h-64 bg-surface/40 border border-overlay-08 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Nutrição</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isMember ? "Seu plano alimentar" : "Plano alimentar prescrito pelo seu nutricionista"}
          </p>
        </div>
        {isMember && (
          <Link
            href="/dashboard/student/nutrition/new"
            className="px-5 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors"
          >
            + Novo plano
          </Link>
        )}
      </div>

      {isMember && <NutritionFlowBanner currentStep={activePlan ? 2 : 1} />}

      {!activePlan ? (
        <EmptyPlanState type="nutrition" isMember={isMember} />
      ) : (
        <ActiveDietPlanView plan={activePlan} isMember={isMember} />
      )}
    </div>
  );
}

function ActiveDietPlanView({ plan, isMember }: { plan: DietPlan; isMember: boolean }) {
  const macros = [
    { label: "Calorias", value: plan.target_calories, unit: "kcal", color: "text-foreground" },
    { label: "Proteína", value: plan.target_protein, unit: "g", color: "text-emerald-400" },
    { label: "Carboidrato", value: plan.target_carbs, unit: "g", color: "text-blue-400" },
    { label: "Gordura", value: plan.target_fat, unit: "g", color: "text-yellow-400" },
  ];

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd 'de' MMM", { locale: ptBR }) : "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Plan card */}
      <div className="bg-surface/40 border border-overlay-08 rounded-2xl p-6 flex flex-col gap-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-black text-foreground uppercase tracking-tight text-lg leading-none">
              {plan.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatDate(plan.start_date)} → {formatDate(plan.end_date)}
            </p>
          </div>
          <span className="shrink-0 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            Ativo
          </span>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {macros.map((m) => (
            <div
              key={m.label}
              className="bg-background/50 border border-overlay-08 rounded-xl p-3 flex flex-col gap-1"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {m.label}
              </span>
              <span className={`text-xl font-black leading-none ${m.color}`}>{m.value ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground font-bold">{m.unit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-overlay-08">
          <Link
            href={`/dashboard/diets/${plan.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Gerenciar refeições e alimentos
          </Link>
          {isMember && (
            <Link
              href="/dashboard/student/nutrition/new"
              className="px-5 py-3 bg-overlay-05 border border-overlay-10 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-overlay-10 transition-colors text-center"
            >
              Criar novo plano
            </Link>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Registro de refeições e acompanhamento de macros pelo app mobile
        </p>
      </div>
    </div>
  );
}
