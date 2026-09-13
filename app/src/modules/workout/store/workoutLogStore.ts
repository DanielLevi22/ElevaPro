import { createWorkoutsService, type SessaoDoHistorico } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { notasSeConsentido } from '../services/consentimento';

const workoutsService = createWorkoutsService(supabase);

/** Uma linha do histórico. O formato mora no `shared`, junto da consulta. */
export type WorkoutLog = SessaoDoHistorico;

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
    campos: { perceived_exertion?: number | null; notes?: string | null }
  ) => Promise<void>;
}

/**
 * O histórico de sessões do aluno e a correção do feedback de cada uma.
 *
 * A consulta mora no `shared` (`fetchSessionHistory`); aqui ficam o estado da
 * lista e a decisão de consentimento, que é do app — é ele que sabe quem está
 * escrevendo.
 */
export const useWorkoutLogStore = create<WorkoutLogState>((set) => ({
  logs: [],
  loading: false,

  fetchLogs: async (studentId: string) => {
    set({ loading: true });
    try {
      set({ logs: await workoutsService.fetchSessionHistory(studentId) });
    } catch {
      // Sem o objeto de erro: a linha carrega `notes`, dado sensível de saúde.
      console.error('[workoutLogStore] falha ao carregar o histórico de sessões');
    } finally {
      set({ loading: false });
    }
  },

  updateSessionFeedback: async (sessionId, studentId, campos) => {
    try {
      // O texto passa pela mesma decisão de consentimento da gravação: sem
      // consentimento vigente a PSE é corrigida e a observação não. `undefined`
      // significa "não mexer"; `null` é o pedido explícito de apagar, e apagar
      // nunca depende de consentimento — é o Art. 18, VI.
      const notas =
        campos.notes === undefined
          ? undefined
          : campos.notes === null || campos.notes.trim() === ''
            ? null
            : ((await notasSeConsentido(studentId, campos.notes)) ?? null);

      const atualizada = await workoutsService.updateSessionFeedback(sessionId, {
        ...(campos.perceived_exertion !== undefined
          ? { perceived_exertion: campos.perceived_exertion }
          : {}),
        ...(notas !== undefined ? { notes: notas } : {}),
      });

      set((state) => ({
        logs: state.logs.map((log) =>
          log.id === sessionId
            ? {
                ...log,
                perceived_exertion: atualizada.perceived_exertion,
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
}));
