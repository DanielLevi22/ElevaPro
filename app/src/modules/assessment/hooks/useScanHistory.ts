import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { registrarFalha } from '@/lib/registro';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * As análises do aluno, recarregadas a cada vez que a tela ganha foco.
 *
 * O id vem da rota, que lê a sessão: o módulo não importa o de autenticação.
 *
 * Por foco, e não por montagem: as telas moram na aba Progresso, que fica
 * montada, e um scan novo não apareceria na volta.
 *
 * @example const { scans, loading, remove } = useScanHistory(user.id);
 */
export function useScanHistory(studentId: string) {
  const scans = useAssessmentStore((s) => s.scanHistory);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!studentId) return;
      setLoading(true);
      useAssessmentStore
        .getState()
        .loadHistory(studentId)
        // Sem o erro: o do PostgREST carrega linhas de `body_scans`.
        .catch(() => registrarFalha('body_scan.load_history'))
        .finally(() => setLoading(false));
    }, [studentId])
  );

  /** Apaga uma análise — Art. 18, VI. Devolve se deu certo. */
  const remove = async (scanId: string): Promise<boolean> => {
    try {
      await useAssessmentStore.getState().deleteScan(scanId, studentId);
      return true;
    } catch {
      registrarFalha('body_scan.delete');
      return false;
    }
  };

  return { scans, loading, remove };
}
