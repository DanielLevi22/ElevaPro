"use client";

import { useState } from "react";
import { useAnalytics } from "@/shared/hooks/useAnalytics";

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const calculateGrowthPercentage = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
          Analytics
        </h1>
        <p className="text-muted-foreground">Métricas e insights da plataforma</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {(["7d", "30d", "90d"] as const).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            {range === "7d"
              ? "Últimos 7 dias"
              : range === "30d"
                ? "Últimos 30 dias"
                : "Últimos 90 dias"}
          </button>
        ))}
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Métricas de Usuários</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.userMetrics.totalUsers || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total de Usuários</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.userMetrics.newUsersThisMonth || 0}
            </p>
            <p className="text-sm text-muted-foreground">Novos este Mês</p>
            <p className="text-xs text-green-400 mt-2">
              +
              {calculateGrowthPercentage(
                data?.userMetrics.newUsersThisMonth || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total teste ci
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.userMetrics.activeUsersLast7Days || 0}
            </p>
            <p className="text-sm text-muted-foreground">Ativos (7d)</p>
            <p className="text-xs text-blue-400 mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.activeUsersLast7Days || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.userMetrics.activeUsersLast30Days || 0}
            </p>
            <p className="text-sm text-muted-foreground">Ativos (30d)</p>
            <p className="text-xs text-purple-400 mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.activeUsersLast30Days || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>
        </div>
      </div>

      {/* User Distribution */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Distribuição de Usuários</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-purple-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-xl">👑</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Admins</span>
            </div>
            <p className="text-3xl font-bold text-purple-400">
              {data?.userMetrics.usersByType.admin || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.usersByType.admin || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>

          <div className="bg-surface border border-orange-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <span className="text-xl">💼</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Personal Trainers</span>
            </div>
            <p className="text-3xl font-bold text-orange-400">
              {data?.userMetrics.usersByType.specialist || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.usersByType.specialist || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>

          <div className="bg-surface border border-blue-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl">🎓</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Alunos</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {data?.userMetrics.usersByType.student || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.usersByType.student || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>

          <div className="bg-surface border border-green-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-xl">🚀</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Membros</span>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {data?.userMetrics.usersByType.member || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {calculateGrowthPercentage(
                data?.userMetrics.usersByType.member || 0,
                data?.userMetrics.totalUsers || 0,
              )}
              % do total
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Métricas de Engajamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <span className="text-2xl">💪</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.engagementMetrics.totalWorkouts || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total de Treinos</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">🥗</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.engagementMetrics.totalDietPlans || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total de Dietas</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.engagementMetrics.avgWorkoutsPerSpecialist || 0}
            </p>
            <p className="text-sm text-muted-foreground">Média Treinos/Prof</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">👨‍🎓</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {data?.engagementMetrics.avgStudentsPerSpecialist || 0}
            </p>
            <p className="text-sm text-muted-foreground">Média Alunos/Personal</p>
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Saúde da Plataforma</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Taxa de Engajamento de Usuários
              </span>
              <span className="text-sm font-bold text-foreground">
                {calculateGrowthPercentage(
                  data?.userMetrics.activeUsersLast7Days || 0,
                  data?.userMetrics.totalUsers || 0,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                style={{
                  width: `${calculateGrowthPercentage(data?.userMetrics.activeUsersLast7Days || 0, data?.userMetrics.totalUsers || 0)}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Atividade dos Personal Trainers
              </span>
              <span className="text-sm font-bold text-foreground">
                {data?.engagementMetrics.avgWorkoutsPerSpecialist || 0} treinos/personal
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min((data?.engagementMetrics.avgWorkoutsPerSpecialist || 0) * 10, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Taxa de Crescimento (Este Mês)
              </span>
              <span className="text-sm font-bold text-foreground">
                {calculateGrowthPercentage(
                  data?.userMetrics.newUsersThisMonth || 0,
                  data?.userMetrics.totalUsers || 0,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${calculateGrowthPercentage(data?.userMetrics.newUsersThisMonth || 0, data?.userMetrics.totalUsers || 0)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
