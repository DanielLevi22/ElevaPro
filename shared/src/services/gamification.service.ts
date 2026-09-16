import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement,
  DailyGoal,
  LeaderboardEntry,
  LeaderboardScope,
  StudentStreak,
} from "../types/gamification.types";

/** O que a RPC `get_leaderboard` devolve; `previous_rank` é nulo para quem é novo. */
interface LeaderboardRpcRow {
  student_id: string;
  display_name: string;
  points: number;
  rank: number;
  previous_rank: number | null;
  is_me: boolean;
}

function toLeaderboardEntry(row: LeaderboardRpcRow): LeaderboardEntry {
  return {
    studentId: row.student_id,
    displayName: row.display_name,
    points: row.points,
    rank: row.rank,
    previousRank: row.previous_rank,
    isMe: row.is_me,
  };
}

export const createGamificationService = (supabase: SupabaseClient) => ({
  getDailyGoal: async (date: string, studentId?: string): Promise<DailyGoal | null> => {
    let query = supabase.from("daily_goals").select("*").eq("date", date);
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as DailyGoal | null;
  },

  getWeeklyGoals: async (
    startDate: string,
    endDate: string,
    studentId?: string,
  ): Promise<DailyGoal[]> => {
    let query = supabase
      .from("daily_goals")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as DailyGoal[]) ?? [];
  },

  getStreak: async (studentId?: string): Promise<StudentStreak | null> => {
    let query = supabase.from("student_streaks").select("*");
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as StudentStreak | null;
  },

  getAchievements: async (studentId?: string): Promise<Achievement[]> => {
    let query = supabase.from("achievements").select("*").order("earned_at", { ascending: false });
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as Achievement[]) ?? [];
  },

  updateMealProgress: async (goalId: string, completed: number): Promise<void> => {
    const { error } = await supabase
      .from("daily_goals")
      .update({ meals_completed: completed })
      .eq("id", goalId);
    if (error) throw error;
  },

  updateWorkoutProgress: async (goalId: string, completed: number): Promise<void> => {
    const { error } = await supabase
      .from("daily_goals")
      .update({ workout_completed: completed })
      .eq("id", goalId);
    if (error) throw error;
  },

  calculateDailyGoals: async (studentId: string, date: string): Promise<void> => {
    const { error } = await supabase
      .from("daily_goals")
      .upsert(
        { student_id: studentId, date },
        { onConflict: "student_id,date", ignoreDuplicates: true },
      );
    if (error) throw error;
  },

  useStreakFreeze: async (studentId: string): Promise<void> => {
    const { data: streak, error: fetchError } = await supabase
      .from("student_streaks")
      .select("*")
      .eq("student_id", studentId)
      .single();
    if (fetchError) throw fetchError;
    if (!streak || streak.freeze_available <= 0) throw new Error("No freeze available");

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("student_streaks")
      .update({ freeze_available: streak.freeze_available - 1, last_freeze_date: today })
      .eq("id", streak.id);
    if (error) throw error;
  },

  /**
   * O placar da semana corrente. A semana, o grupo e o nome abreviado são
   * decididos no banco, porque a RLS não deixa o cliente ler o perfil de quem
   * não é vinculado — e não deve deixar.
   *
   * O `global` recusa com 42501 quem não participa do ranking: confira o
   * consentimento `RANKING` antes de chamar.
   *
   * @example
   * const entries = await gamification.fetchLeaderboard("global");
   */
  fetchLeaderboard: async (scope: LeaderboardScope): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase.rpc("get_leaderboard", { p_scope: scope });
    if (error) throw error;
    return ((data ?? []) as LeaderboardRpcRow[]).map(toLeaderboardEntry);
  },
});
