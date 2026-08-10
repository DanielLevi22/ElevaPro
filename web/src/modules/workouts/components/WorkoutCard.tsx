interface WorkoutCardProps {
  workout: {
    id: string;
    title: string;
    description?: string | null;
    created_at: string;
    exercise_count?: number;
    assigned_count?: number;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
  const formattedDate = new Date(workout.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group bg-overlay-05 backdrop-blur-lg border border-overlay-10 rounded-xl p-6 hover:border-overlay-15 hover:shadow-lg hover:shadow-white/5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground mb-2 truncate">{workout.title}</h3>
          {workout.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{workout.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <span className="text-sm text-muted-foreground">
            {workout.exercise_count || 0} exercícios
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-secondary"
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
          </div>
          <span className="text-sm text-muted-foreground">
            {workout.assigned_count || 0} alunos
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-overlay-10">
        <span className="text-xs text-muted-foreground">Criado em {formattedDate}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(workout.id)}
            className="p-2 hover:bg-overlay-10 rounded-lg transition-colors"
            title="Editar treino"
          >
            <svg
              className="w-4 h-4 text-muted-foreground hover:text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          <button
            onClick={() => onDelete(workout.id)}
            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
            title="Deletar treino"
          >
            <svg
              className="w-4 h-4 text-muted-foreground hover:text-destructive"
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
      </div>
    </div>
  );
}
