"use client";

import type { Workout } from "@elevapro/shared";
import Link from "next/link";

interface Props {
  workout: Workout;
}

export function WorkoutCard({ workout }: Props) {
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <Link
      href={`/dashboard/student/workouts/${workout.id}`}
      className="group block bg-surface/40 border border-overlay-08 rounded-2xl p-5 hover:border-primary/20 hover:bg-surface/60 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-foreground text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
            {workout.title}
          </h3>
          {workout.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{workout.description}</p>
          )}
        </div>
        <div className="shrink-0 w-8 h-8 rounded-xl bg-surface-highlight border border-overlay-08 flex items-center justify-center text-muted-foreground group-hover:border-primary/20 group-hover:text-primary transition-all">
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {exerciseCount} exercício{exerciseCount !== 1 ? "s" : ""}
        </span>
        {workout.muscle_group && (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            · {workout.muscle_group}
          </span>
        )}
      </div>
    </Link>
  );
}
