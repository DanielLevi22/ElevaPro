export interface DailyGoal {
  id: string;
  student_id: string;
  date: string;
  meals_target: number;
  meals_completed: number;
  workout_target: number;
  workout_completed: number;
  completed: boolean;
  completion_percentage: number;
}

export interface Achievement {
  id: string;
  student_id: string;
  type: "streak" | "milestone" | "challenge";
  title: string;
  description: string;
  icon: string;
  earned_at: string;
  points: number;
}

export interface StudentStreak {
  id: string;
  student_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  freeze_available: number;
  last_freeze_date: string | null;
}

/**
 * Uma linha do placar da semana, como a RPC `get_leaderboard` devolve.
 *
 * Sem foto: o global mostra só a inicial, e o nome de quem não é o próprio
 * usuário vem abreviado ("Ana C."). Ver a migration 0059.
 */
export interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  points: number;
  /** Empates dividem a posição. */
  rank: number;
  /** A posição na semana anterior; `null` para quem não pontuou nela. */
  previousRank: number | null;
  isMe: boolean;
}

/** `global` é o placar dos participantes; `my_students`, o do especialista. */
export type LeaderboardScope = "global" | "my_students";
