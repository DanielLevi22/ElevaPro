import { achatarRespostas } from '@elevapro/shared/utils/anamnese';
import { useEffect, useState } from 'react';
import { AnamnesisService } from '@/modules/assessment/services/anamnesisService';

export type StudentAnamnesisStatus = 'loading' | 'failed' | 'empty' | 'ready';

/**
 * A anamnese de um aluno, para o especialista ler.
 *
 * Estado local, e não a store da avaliação: lá mora a anamnese de quem está
 * logado, e carregar a do aluno nela a sobrescreveria.
 *
 * @example const { responses, status } = useStudentAnamnesis(studentId);
 */
export function useStudentAnamnesis(studentId: string): {
  responses: Record<string, unknown>;
  status: StudentAnamnesisStatus;
} {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<StudentAnamnesisStatus>('loading');

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setStatus('loading');

    AnamnesisService.getAnamnesis(studentId)
      .then((anamnesis) => {
        if (!active) return;
        // Achatado na carga: a coluna guarda duas formas, e ler `?.value` de um
        // valor plano mostraria "Não respondido" em todo campo — aluno sem
        // anamnese e anamnese em forma nova ficariam idênticos.
        const flat = achatarRespostas(anamnesis?.responses);
        setResponses(flat);
        setStatus(Object.keys(flat).length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (active) setStatus('failed');
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  return { responses, status };
}
