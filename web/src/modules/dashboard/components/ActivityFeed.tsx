interface Activity {
  id: string;
  type: "workout_completed" | "student_added" | "diet_created";
  studentName: string;
  description: string;
  timestamp: Date;
  avatar?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const activityIcons = {
  workout_completed: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  student_added: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  ),
  diet_created: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  ),
};

const activityColors = {
  workout_completed: "text-green-500 bg-green-500/10",
  student_added: "text-primary bg-primary/10",
  diet_created: "text-accent bg-accent/10",
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
  return date.toLocaleDateString("pt-BR");
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5.5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 bg-overlay-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-overlay-10 rounded w-3/4" />
                <div className="h-3 bg-overlay-10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5.5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h3>
        <div className="text-center py-8">
          <div className="text-muted-foreground text-sm">
            <p>Nenhuma atividade recente</p>
            <p className="text-xs mt-1">As atividades dos seus alunos aparecerão aqui</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5.5">
      <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-overlay-05 transition-colors"
          >
            <div className={`p-2 rounded-full ${activityColors[activity.type]}`}>
              {activityIcons[activity.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">{activity.studentName}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {getRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Activity };
