"use client";

import { getPrecisionScore, getTrackQuestions } from "@elevapro/shared";
import Link from "next/link";
import { useAuthStore } from "@/modules/auth";
import { useStudentAnamnesis } from "@/modules/students/hooks/useStudentAnamnesis";
import { DayOverviewCard } from "../components/DayOverviewCard";
import { GamificationBar } from "../components/GamificationBar";
import {
  useCurrentStudentId,
  useStudentAchievements,
  useStudentActiveDietPlan,
  useStudentPersonaTrack,
  useStudentStreak,
  useStudentWorkoutPlans,
} from "../hooks/useStudentDashboardData";

function AnamnesisProgressBanner({ studentId }: { studentId: string | null }) {
  const { data: existing } = useStudentAnamnesis(studentId);
  const { data: savedTrack } = useStudentPersonaTrack(studentId);

  if (!studentId) return null;

  const track = savedTrack ?? "beginner";
  const questions = getTrackQuestions(track as Parameters<typeof getTrackQuestions>[0]);
  const responses = (existing?.responses ?? {}) as Record<string, unknown>;
  const score = getPrecisionScore(questions, responses);
  const isComplete = !!existing?.completed_at;
  const hasStarted = Object.keys(responses).length > 0;

  if (isComplete && score >= 80) return null;

  const barColor = score >= 60 ? "#f59e0b" : "#818cf8";

  return (
    <Link
      href="/dashboard/student/anamnesis"
      className="flex items-center gap-4 p-4 rounded-2xl border border-overlay-08 bg-surface/50 hover:bg-surface-highlight/60 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">
            {isComplete
              ? "Perfil incompleto"
              : hasStarted
                ? "Continuar perfil"
                : "Criar perfil de treino"}
          </p>
          <span className="text-xs font-black text-muted-foreground tabular-nums">{score}%</span>
        </div>
        <div className="h-1 bg-surface-highlight rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {score >= 60
            ? "Complete para melhorar a precisão do seu plano"
            : "Responda as perguntas para personalizar seu plano"}
        </p>
      </div>
      <svg
        aria-hidden="true"
        className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export function StudentHomePage() {
  const accountType = useAuthStore((s) => s.accountType);
  const studentId = useCurrentStudentId();

  const { data: workouts, isLoading: loadingWorkouts } = useStudentWorkoutPlans(studentId);
  const { data: activeDiet, isLoading: loadingDiet } = useStudentActiveDietPlan(studentId);
  const { data: streak } = useStudentStreak(studentId);
  const { data: achievements = [] } = useStudentAchievements(studentId);

  const isMember = accountType === "member";
  // Most recent workout as "today's workout" — mobile owns execution scheduling
  const todayWorkout = workouts?.[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Seu dia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isMember
            ? "Acompanhe seus planos e progresso"
            : "Veja o que seu personal preparou para hoje"}
        </p>
      </div>

      <GamificationBar streak={streak} achievements={achievements} />

      {isMember && <AnamnesisProgressBanner studentId={studentId} />}

      <DayOverviewCard
        todayWorkout={todayWorkout}
        activeDietPlan={activeDiet}
        isLoading={loadingWorkouts || loadingDiet}
      />
    </div>
  );
}
