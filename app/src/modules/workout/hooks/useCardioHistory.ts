import {
  createCardioHistoryService,
  createHeartRateProfileService,
  type HeartRateProfile,
  type LastCardio,
  type ModalityHistory,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import type { CardioModality } from '../cardioModalities';

const historyService = createCardioHistoryService(supabase);
const profileService = createHeartRateProfileService(supabase);

/**
 * A última sessão de cardio, para o "Repetir a última". Falhar só esconde o
 * cartão: escolher a modalidade à mão continua funcionando.
 *
 * @example const last = useLastCardio(student.id);
 */
export function useLastCardio(studentId: string): LastCardio | null {
  const { data } = useQuery({
    queryKey: ['lastCardio', studentId],
    queryFn: () =>
      avisandoSeFalhar('cardio.read_last', () => historyService.fetchLastCardio(studentId)),
  });
  return data ?? null;
}

/**
 * A última, a melhor e o total do mês na modalidade escolhida.
 *
 * @example const history = useModalityHistory(student.id, cardioModality('run'));
 */
export function useModalityHistory(
  studentId: string,
  modality: CardioModality
): ModalityHistory | null {
  const { activityName, usesGps } = modality;
  const { data } = useQuery({
    queryKey: ['cardioModalityHistory', studentId, activityName],
    queryFn: () =>
      avisandoSeFalhar('cardio.read_history', () =>
        historyService.fetchModalityHistory(studentId, { activityName, usesGps }, new Date())
      ),
  });
  return data ?? null;
}

/**
 * A FC máxima estimada e o aviso de medicação, para as zonas do resumo. Sem
 * resposta, as zonas não aparecem — e nada é inventado no lugar da idade.
 *
 * O log vai sem o erro: a consulta lê `responses` da anamnese.
 *
 * @example const profile = useHeartRateProfile(student.id);
 */
export function useHeartRateProfile(studentId: string): HeartRateProfile | null {
  const { data } = useQuery({
    queryKey: ['heartRateProfile', studentId],
    queryFn: () =>
      avisandoSeFalhar('cardio.read_hr_profile', () =>
        profileService.fetchProfile(studentId, new Date())
      ),
  });
  return data ?? null;
}
