import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';

export interface WorkoutLog {
  id: string;
  student_id: string;
  workout_id: string;
  completed_at: string;
  feedback: string | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  workout_id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
}

export interface ExerciseLog {
  id: string;
  workout_session_id: string;
  workout_item_id: string;
  sets_completed: number;
  reps_completed: string;
  weight_used: string;
  completed: boolean;
}

interface WorkoutLogState {
  logs: WorkoutLog[];
  loading: boolean;
  fetchLogs: (studentId: string) => Promise<void>;
  createLog: (
    workoutId: string,
    feedback?: string
  ) => Promise<{ success: boolean; error?: string }>;
  isWorkoutCompletedToday: (workoutId: string) => boolean;
}

export const useWorkoutLogStore = create<WorkoutLogState>((set, get) => ({
  logs: [],
  loading: false,

  fetchLogs: async (studentId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      set({ logs: data || [] });
    } catch (error) {
      console.error('Error fetching workout logs:', error);
    } finally {
      set({ loading: false });
    }
  },

  createLog: async (workoutId: string, feedback?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const now = new Date().toISOString();

      const { error } = await supabase.from('workout_sessions').insert({
        student_id: user.id,
        workout_id: workoutId,
        notes: feedback || null,
        started_at: now,
        completed_at: now,
      });

      if (error) {
        console.error('Error creating workout log:', error);
        return { success: false, error: error.message };
      }

      // Refresh logs
      await get().fetchLogs(user.id);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error creating workout log:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  isWorkoutCompletedToday: (workoutId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return get().logs.some(
      (log) => log.workout_id === workoutId && log.completed_at?.startsWith(today)
    );
  },
}));
