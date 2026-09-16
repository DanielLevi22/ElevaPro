import type { BodyScanRecord } from '@elevapro/shared';
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
export interface ScanHistory {
  /** Do mais recente para o mais antigo. */
  scans: BodyScanRecord[];
  loading: boolean;
  /** Apaga uma análise — Art. 18, VI. Devolve se deu certo. */
  remove: (scanId: string) => Promise<boolean>;
}

export function useScanHistory(studentId: string): ScanHistory {
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

export interface OneScan extends ScanHistory {
  /** A análise pedida; `undefined` enquanto carrega ou quando não está na lista. */
  scan: BodyScanRecord | undefined;
  /** Carregou e a análise não está: apagada, ou de outra conta. */
  missing: boolean;
}

/**
 * Uma análise do histórico, pelo id — o que a leitura e as medidas abrem.
 *
 * @example const { scan, missing } = useScan(user.id, scanId);
 */
export function useScan(studentId: string, scanId: string): OneScan {
  const history = useScanHistory(studentId);
  const scan = history.scans.find((item) => item.id === scanId);
  return { ...history, scan, missing: !scan && !history.loading };
}
