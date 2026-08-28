"use client";

import { type AccountType, supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsersLast7Days: number;
    activeUsersLast30Days: number;
    usersByType: {
      admin: number;
      specialist: number;
      student: number;
      member: number;
    };
  };
  growthMetrics: {
    dailyGrowth: Array<{ date: string; count: number }>;
    monthlyGrowth: Array<{ month: string; count: number }>;
  };
  engagementMetrics: {
    totalWorkouts: number;
    totalDietPlans: number;
    avgWorkoutsPerSpecialist: number;
    avgStudentsPerSpecialist: number;
  };
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      // 1. Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 2. Get new users this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsersThisMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDayOfMonth.toISOString());

      // 3. Get active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activeUsersLast7Days } = await supabase
        .from("workout_sessions")
        .select("student_id", { count: "exact", head: true })
        .gte("started_at", sevenDaysAgo.toISOString());

      // 4. Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsersLast30Days } = await supabase
        .from("workout_sessions")
        .select("student_id", { count: "exact", head: true })
        .gte("started_at", thirtyDaysAgo.toISOString());

      // 5. Get users by type
      const fetchCountByType = async (type: AccountType) => {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("account_type", type);
        return count || 0;
      };

      const [adminCount, specialistCount, studentCount, memberCount] = await Promise.all([
        fetchCountByType("admin"),
        fetchCountByType("specialist"),
        fetchCountByType("student"),
        fetchCountByType("member"),
      ]);

      // 6. Get workout and diet plan counts
      const { count: totalWorkoutsQuery } = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true });

      const { count: totalDietPlansQuery } = await supabase
        .from("diet_plans")
        .select("*", { count: "exact", head: true });

      const totalWorkouts = totalWorkoutsQuery || 0;
      const totalDietPlans = totalDietPlansQuery || 0;

      return {
        userMetrics: {
          totalUsers: totalUsers || 0,
          newUsersThisMonth: newUsersThisMonth || 0,
          activeUsersLast7Days: activeUsersLast7Days || 0,
          activeUsersLast30Days: activeUsersLast30Days || 0,
          usersByType: {
            admin: adminCount,
            specialist: specialistCount,
            student: studentCount,
            member: memberCount,
          },
        },
        growthMetrics: {
          dailyGrowth: [], // Placeholder for now
          monthlyGrowth: [], // Placeholder for now
        },
        engagementMetrics: {
          totalWorkouts,
          totalDietPlans,
          avgWorkoutsPerSpecialist: specialistCount
            ? Math.round(totalWorkouts / specialistCount)
            : 0,
          avgStudentsPerSpecialist: specialistCount
            ? Math.round(studentCount / specialistCount)
            : 0,
        },
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
