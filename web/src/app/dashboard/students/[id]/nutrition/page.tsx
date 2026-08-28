"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ProgressCharts } from "@/nutrition";
import { useDietPlans, useStudentNutritionStats } from "@/shared/hooks/useNutrition";

export default function StudentNutritionPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { data: dietPlans = [], isLoading: plansLoading } = useDietPlans(studentId);
  const { data: stats, isLoading: statsLoading } = useStudentNutritionStats(studentId);

  const activePlan = dietPlans.find((plan) => plan.status === "active");

  // Calculate date range
  const getDateRange = () => {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date();

    switch (dateRange) {
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      case "all":
        return { startDate: undefined, endDate: end };
    }

    return { startDate: start.toISOString().split("T")[0], endDate: end };
  };

  const { startDate, endDate } = getDateRange();

  if (plansLoading || statsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-foreground">Progresso Nutricional</h1>
          {activePlan && (
            <p className="text-muted-foreground mt-2">
              Plano Ativo: <span className="text-foreground font-medium">{activePlan.name}</span>
            </p>
          )}
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "all"] as const).map((range) => (
            <button
              type="button"
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {range === "7d" && "7 dias"}
              {range === "30d" && "30 dias"}
              {range === "90d" && "90 dias"}
              {range === "all" && "Tudo"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aderência</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(stats.adherenceRate)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-blue-400"
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
              <div>
                <p className="text-xs text-muted-foreground">Refeições Registradas</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalLogs}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Refeições Completas</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedMeals}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peso Atual</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.latestWeight ? `${stats.latestWeight}kg` : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <ProgressCharts studentId={studentId} startDate={startDate} endDate={endDate} />

      {/* No Active Plan Warning */}
      {!activePlan && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-yellow-400"
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
          <h3 className="text-lg font-semibold text-foreground mb-2">Sem Plano Ativo</h3>
          <p className="text-muted-foreground mb-4">
            Este aluno não possui um plano de dieta ativo no momento.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/diets")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Criar Plano de Dieta
          </button>
        </div>
      )}
    </div>
  );
}
