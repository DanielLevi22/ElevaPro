"use client";

import { QuickActions, StatCard } from "@/dashboard";
import { useAuthUser } from "@/shared/hooks/useAuthUser";
import { useDashboardStats } from "@/shared/hooks/useDashboardStats";

const ICON = {
  students: (
    <svg
      aria-hidden="true"
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  workouts: (
    <svg
      aria-hidden="true"
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  diets: (
    <svg
      aria-hidden="true"
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  completed: (
    <svg
      aria-hidden="true"
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
};

export default function DashboardPage() {
  // useAuthUser em vez de consultar profiles aqui: query em componente e proibida
  // pelo CLAUDE.md, e este hook ja mantem o perfil em cache.
  const { data: authUser } = useAuthUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Bem-vindo de volta,{" "}
          <span className="font-semibold text-foreground">{authUser?.fullName ?? "..."}</span>!{" "}
          <span className="capitalize">· {today}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total de Alunos"
          value={stats?.totalStudents ?? 0}
          icon={ICON.students}
          color="primary"
          loading={statsLoading}
        />
        <StatCard
          title="Treinos Criados"
          value={stats?.totalWorkouts ?? 0}
          icon={ICON.workouts}
          color="secondary"
          loading={statsLoading}
        />
        <StatCard
          title="Dietas Ativas"
          value={stats?.activeDiets ?? 0}
          icon={ICON.diets}
          color="accent"
          loading={statsLoading}
        />
        <StatCard
          title="Concluídos (7d)"
          value={stats?.completedWorkoutsThisWeek ?? 0}
          icon={ICON.completed}
          color="primary"
          loading={statsLoading}
        />
      </div>

      {/*
        O bloco de atividade saiu daqui em 2026-08-28. O Dashboard e painel de
        numeros; "o que aconteceu e quem precisa de mim" e pergunta de Briefing,
        e e la que o bloco passou a viver.
      */}
      <QuickActions />
    </div>
  );
}
