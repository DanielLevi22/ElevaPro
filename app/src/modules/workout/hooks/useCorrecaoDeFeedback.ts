import { useCallback, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { useWorkoutLogStore, type WorkoutLog } from '../store/workoutLogStore';

interface CorrecaoDeFeedback {
  /** A sessão com o modal de correção aberto. */
  emCorrecao: WorkoutLog | null;
  /** A sessão cuja observação espera a confirmação para ser apagada. */
  confirmandoApagar: WorkoutLog | null;
  corrigir: (log: WorkoutLog) => void;
  fecharCorrecao: () => void;
  salvarCorrecao: (pse: number, notas: string) => Promise<void>;
  pedirParaApagar: () => void;
  fecharConfirmacao: () => void;
  apagarObservacao: () => Promise<void>;
}

/**
 * O fluxo de correção do feedback de uma sessão: abrir, salvar a PSE e a
 * observação corrigidas, ou apagar a observação depois de confirmar.
 *
 * O modal fecha antes da gravação de propósito: a lista mostra a correção
 * quando ela volta, e uma falha vira alerta — sem o erro, que carrega `notes`.
 *
 * @example
 * const correcao = useCorrecaoDeFeedback(user?.id);
 * <LinhaDaSessao log={log} onCorrigir={() => correcao.corrigir(log)} />
 */
export function useCorrecaoDeFeedback(alunoId: string | undefined): CorrecaoDeFeedback {
  const updateSessionFeedback = useWorkoutLogStore((s) => s.updateSessionFeedback);
  const [emCorrecao, setEmCorrecao] = useState<WorkoutLog | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState<WorkoutLog | null>(null);

  const salvarCorrecao = useCallback(
    async (pse: number, notas: string) => {
      if (!emCorrecao || !alunoId) return;
      setEmCorrecao(null);
      await gravarOuAvisar('Não consegui salvar a correção. Tente de novo.', () =>
        updateSessionFeedback(emCorrecao.id, alunoId, { perceived_exertion: pse, notes: notas })
      );
    },
    [emCorrecao, alunoId, updateSessionFeedback]
  );

  const apagarObservacao = useCallback(async () => {
    if (!confirmandoApagar || !alunoId) return;
    setConfirmandoApagar(null);
    await gravarOuAvisar('Não consegui apagar a observação. Tente de novo.', () =>
      updateSessionFeedback(confirmandoApagar.id, alunoId, { notes: null })
    );
  }, [confirmandoApagar, alunoId, updateSessionFeedback]);

  return {
    emCorrecao,
    confirmandoApagar,
    corrigir: setEmCorrecao,
    fecharCorrecao: () => setEmCorrecao(null),
    salvarCorrecao,
    pedirParaApagar: () => {
      setConfirmandoApagar(emCorrecao);
      setEmCorrecao(null);
    },
    fecharConfirmacao: () => setConfirmandoApagar(null),
    apagarObservacao,
  };
}

async function gravarOuAvisar(mensagem: string, gravar: () => Promise<void>): Promise<void> {
  try {
    await gravar();
  } catch {
    // Sem o erro: o do PostgREST carrega o payload, e o payload é `notes`.
    // A store já registrou a falha.
    showAlert({ type: 'error', title: 'Não deu', message: mensagem });
  }
}
