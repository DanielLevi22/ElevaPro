import type { DietPlan } from '@elevapro/core';
import { supabase } from '@elevapro/supabase';
import { AssistantService } from '@/modules/ai';

export interface WeeklyAdherenceData {
  totalMeals: number;
  completedMeals: number;
  missedProtein: number; // Days with low protein
  missedCalories: number; // Days with high deviation
  logs: unknown[];
}

export const AnalysisService = {
  /**
   * Fetches logs for the last 7 days and calculates basic adherence stats.
   */
  getWeeklyStats: async (studentId: string, _plan: DietPlan): Promise<WeeklyAdherenceData> => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data: logs, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('student_id', studentId)
      .gte('logged_date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('logged_date', today.toISOString().split('T')[0]);

    if (error) throw error;

    // Basic calculation (can be improved with real macro tracking from logs if available)
    // For now, relies on 'completed' boolean.
    const totalMeals = 7 * 4; // Assuming avg 4 meals/day context or we could count expected meals
    const completedMeals = logs?.filter((l) => l.completed).length || 0;

    return {
      totalMeals,
      completedMeals,
      missedProtein: 0, // Placeholder for deep analysis
      missedCalories: 0, // Placeholder
      logs: logs || [],
    };
  },

  /**
   * Generates a text summary using centralized AI Co-Pilot
   */
  generateSummary: async (
    studentName: string,
    adherence: WeeklyAdherenceData,
    planName: string
  ): Promise<string> => {
    return AssistantService.analyzeNutritionAdherence(
      studentName,
      {
        totalMeals: adherence.totalMeals,
        completedMeals: adherence.completedMeals,
        logs: adherence.logs as Record<string, unknown>[],
      },
      planName
    );
  },
};
