import { addDays, type CompletedSet, createProgressService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';

const progress = createProgressService(supabase);

export interface TrainingSets {
  sets: CompletedSet[];
  today: string;
  loading: boolean;
  reload: () => Promise<unknown>;
}

/**
 * As séries concluídas dos últimos `days` dias, para as contas de treino.
 *
 * Cada período pede a sua janela, e o cache guarda cada uma: voltar de "1 ano" para
 * "4 sem" não busca de novo, e abrir em 12 semanas não lê dois anos de séries.
 *
 * @example const { sets, today } = useTrainingSets(user.id, 24 * 7);
 */
export function useTrainingSets(studentId: string, days: number): TrainingSets {
  const today = localDateKey();
  const since = addDays(today, -(days - 1));
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trainingSets', studentId, since],
    queryFn: () =>
      avisandoSeFalhar('progress.read_sets', () => progress.listCompletedSets(studentId, since)),
  });
  return { sets: data ?? [], today, loading: isLoading, reload: refetch };
}
