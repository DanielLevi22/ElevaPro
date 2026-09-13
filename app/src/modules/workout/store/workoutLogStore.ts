import { createWorkoutsService, type SessaoDoHistorico } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { registrarFalha } from '@/lib/registro';
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
export const useWorkoutLogStore = create<WorkoutLogState>((set, get) => ({
  logs: [],
  loading: false,

  fetchLogs: async (studentId: string) => {
    set({ loading: true });
    try {
      set({ logs: await workoutsService.fetchSessionHistory(studentId) });
    } catch {
      // Sem o objeto de erro: a linha carrega `notes`, dado sensível de saúde.
      registrarFalha('historico.carregar');
    } finally {
      set({ loading: false });
    }
  },

  updateSessionFeedback: async (sessionId, studentId, campos) => {
    const salva = get().logs.find((log) => log.id === sessionId)?.notes ?? null;
    const patch = {
      ...(campos.perceived_exertion !== undefined
        ? { perceived_exertion: campos.perceived_exertion }
        : {}),
      ...(await notasParaGravar(campos.notes, salva, studentId)),
    };
    if (Object.keys(patch).length === 0) return;

    try {
      const atualizada = await workoutsService.updateSessionFeedback(sessionId, patch);
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
      registrarFalha('historico.corrigirFeedback');
      throw error;
    }
  },
}));

/**
 * A observação que vai no patch, ou nenhuma.
 *
 * O texto passa pela mesma decisão de consentimento da gravação: sem
 * consentimento vigente a PSE é corrigida e a observação não. `undefined`
 * significa "não mexer"; `null` é o pedido explícito de apagar, e apagar nunca
 * depende de consentimento — é o Art. 18, VI.
 *
 * O texto igual ao já salvo também é "não mexer": a tela de correção devolve a
 * observação inteira mesmo quando só a PSE mudou, e mandá-la de novo pela
 * decisão de consentimento apagaria, sem consentimento vigente, uma observação
 * que o aluno não tocou.
 *
 * @example await notasParaGravar('dor no ombro', null, aluno.id) // { notes: 'dor no ombro' }
 */
async function notasParaGravar(
  notas: string | null | undefined,
  salva: string | null,
  studentId: string
): Promise<{ notes?: string | null }> {
  if (notas === undefined) return {};
  if (notas === null) return { notes: null };
  const texto = notas.trim();
  if (texto === (salva?.trim() ?? '')) return {};
  if (texto === '') return { notes: null };
  return { notes: (await notasSeConsentido(studentId, notas)) ?? null };
}
