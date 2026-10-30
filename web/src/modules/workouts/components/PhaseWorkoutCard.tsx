import { type Workout, workoutLetterOf } from "@elevapro/shared";
import Link from "next/link";

interface PhaseWorkoutCardProps {
  workout: Workout;
  onDelete: (workout: Workout) => void;
}

/**
 * Uma ficha na lista da fase: a letra, o título, quantos exercícios, e o remover.
 *
 * @example <PhaseWorkoutCard workout={workout} onDelete={setDeletingWorkout} />
 */
export function PhaseWorkoutCard({ workout, onDelete }: PhaseWorkoutCardProps) {
  const exerciseCount = workout.exercises?.length ?? 0;
  return (
    <div className="glass group rounded-xl hover:border-primary/40 transition-all flex items-center">
      <Link
        href={`/dashboard/workouts/${workout.id}`}
        className="flex items-center gap-4 flex-1 min-w-0 p-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <span className="text-primary font-bold text-sm">{workoutLetterOf(workout.title)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {workout.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exerciseCount} exercício{exerciseCount !== 1 ? "s" : ""}
          </p>
        </div>
        <svg
          aria-hidden="true"
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
  );
}
