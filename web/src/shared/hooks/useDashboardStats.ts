"use client";

import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
  totalStudents: number;
  totalWorkouts: number;
  activeDiets: number;
  completedWorkoutsThisWeek: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // As quatro contagens sao independentes: em serie, o dashboard esperava quatro
  // idas ao banco antes de pintar qualquer numero.
  const [students, workouts, diets, completed] = await Promise.all([
    supabase
      .from("student_specialists")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", user.id)
      .eq("status", "active"),
    supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", user.id),
    supabase
      .from("diet_plans")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", user.id)
      .eq("status", "active"),
    supabase
      .from("workout_sessions")
      .select("workout_id, workouts!inner(specialist_id)", { count: "exact", head: true })
      .eq("workouts.specialist_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", oneWeekAgo.toISOString()),
  ]);

  return {
    totalStudents: students.count || 0,
    totalWorkouts: workouts.count || 0,
    activeDiets: diets.count || 0,
    completedWorkoutsThisWeek: completed.count || 0,
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
