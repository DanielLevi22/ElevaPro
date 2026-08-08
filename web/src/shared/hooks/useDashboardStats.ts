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

  // Get total students (active relationships)
  const { count: totalStudents } = await supabase
    .from("student_specialists")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", user.id)
    .eq("status", "active");

  // Get total workouts created by this personal
  const { count: totalWorkouts } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", user.id);

  // Get active diet plans
  const { count: activeDiets } = await supabase
    .from("diet_plans")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", user.id)
    .eq("status", "active");

  // Get completed workouts this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: completedWorkoutsThisWeek } = await supabase
    .from("workout_sessions")
    .select("workout_id, workouts!inner(specialist_id)", { count: "exact", head: true })
    .eq("workouts.specialist_id", user.id)
    .not("completed_at", "is", null)
    .gte("completed_at", oneWeekAgo.toISOString());

  return {
    totalStudents: totalStudents || 0,
    totalWorkouts: totalWorkouts || 0,
    activeDiets: activeDiets || 0,
    completedWorkoutsThisWeek: completedWorkoutsThisWeek || 0,
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
