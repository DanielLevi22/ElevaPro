"use client";

import type { DietPlan, Workout } from "@elevapro/shared";
import Link from "next/link";

interface Props {
  todayWorkout: Workout | null | undefined;
  activeDietPlan: DietPlan | null | undefined;
  isLoading: boolean;
}

export function DayOverviewCard({ todayWorkout, activeDietPlan, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-32 bg-surface/40 border border-overlay-08 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <OverviewTile
        icon="🏋️"
        label="Treino de hoje"
        title={todayWorkout?.title ?? "Nenhum treino para hoje"}
        subtitle={todayWorkout ? `${todayWorkout.exercises?.length ?? 0} exercícios` : undefined}
        href={
          todayWorkout
            ? `/dashboard/student/workouts/${todayWorkout.id}`
            : "/dashboard/student/workouts"
        }
        isEmpty={!todayWorkout}
      />
      <OverviewTile
        icon="🥗"
        label="Plano alimentar"
        title={activeDietPlan?.name ?? "Nenhum plano ativo"}
        subtitle={
          activeDietPlan
            ? `Ativo desde ${new Date(activeDietPlan.created_at).toLocaleDateString("pt-BR")}`
            : undefined
        }
        href="/dashboard/student/nutrition"
        isEmpty={!activeDietPlan}
      />
    </div>
  );
}

interface TileProps {
  icon: string;
  label: string;
  title: string;
  subtitle?: string;
  href: string;
  isEmpty: boolean;
}

function OverviewTile({ icon, label, title, subtitle, href, isEmpty }: TileProps) {
  return (
    <Link
      href={href}
      className="group block bg-surface/40 border border-overlay-08 rounded-2xl p-6 hover:border-primary/20 transition-all"
    >
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
        {label}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p
            className={`font-black text-sm uppercase tracking-tight ${isEmpty ? "text-muted-foreground" : "text-foreground group-hover:text-primary transition-colors"}`}
          >
            {title}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Link>
  );
}
