import type { WorkoutSessionType } from '@elevapro/shared';
import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { notasSeConsentido } from '../services/consentimento';

const workoutsService = createWorkoutsService(supabase);

/**
 * Uma linha de `workout_sessions` — o store consulta essa tabela, não uma
 * `workout_logs` (que não existe).
 *
 * O campo se chama `notes` no banco; a interface declarava `feedback`, nome que
 * a tabela nunca teve. Como ninguém lia `log.feedback`, o erro ficou invisível:
 * o insert já gravava `notes` corretamente.
 */
export interface WorkoutLog {
  id: string;
  student_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  intensity: number | null;
  notes: string | null;
  /**
   * Quando o aluno corrigiu o próprio feedback (Art. 18, III). Nulo enquanto
   * nunca corrigiu. Ver migration `0036`.
   */
  feedback_edited_at: string | null;
  session_type: WorkoutSessionType;
  /** Cardio: medidos na sessão. Nulos na musculação. */
  duration_seconds: number | null;
  active_calories: number | null;
  /** Modalidade do cardio. Na musculação o nome vem da prescrição. */
  activity_name: string | null;
  /** Título da prescrição, quando a sessão veio de uma. */
  workout: { title: string | null } | null;
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
  /**
   * Corrige a declaração do aluno sobre a própria sessão — Art. 18, III.
   * `notes: null` apaga só a observação e mantém a sessão no histórico.
   */
  updateSessionFeedback: (
    sessionId: string,
    studentId: string,
    campos: { intensity?: number | null; notes?: string | null }
  ) => Promise<void>;
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
        // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
        .from('workout_sessions')
        .select(
          'id, student_id, workout_id, started_at, completed_at, intensity, notes, feedback_edited_at, session_type, duration_seconds, active_calories, activity_name, created_at, workout:workouts(title)'
        )
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      set({ logs: (data ?? []) as unknown as WorkoutLog[] });
    } catch (error) {
      console.error('Error fetching workout logs:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateSessionFeedback: async (sessionId, studentId, campos) => {
    try {
      // O texto passa pela mesma decisão de consentimento da gravação: sem
      // consentimento vigente o RPE é corrigido e a observação não. `undefined`
      // significa "não mexer"; `null` é o pedido explícito de apagar, e apagar
      // nunca depende de consentimento — é o Art. 18, VI.
      const notas =
        campos.notes === undefined
          ? undefined
          : campos.notes === null || campos.notes.trim() === ''
            ? null
            : ((await notasSeConsentido(studentId, campos.notes)) ?? null);

      const atualizada = await workoutsService.updateSessionFeedback(sessionId, {
        ...(campos.intensity !== undefined ? { intensity: campos.intensity } : {}),
        ...(notas !== undefined ? { notes: notas } : {}),
      });

      set((state) => ({
        logs: state.logs.map((log) =>
          log.id === sessionId
            ? {
                ...log,
                intensity: atualizada.intensity,
                notes: atualizada.notes,
                feedback_edited_at: atualizada.feedback_edited_at,
              }
            : log
        ),
      }));
    } catch (error) {
      // Sem o objeto de erro: o do PostgREST carrega o payload da linha, e o
      // payload aqui é `notes` — dado sensível de saúde (Art. 11).
      console.error('[workoutLogStore] falha ao corrigir feedback da sessão');
      throw error;
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
