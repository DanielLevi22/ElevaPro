import {
  createJourneyService,
  type Journey,
  type TrendPeriod,
  type WeightTrend,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';

const journeys = createJourneyService(supabase);

/**
 * A tendência de peso da janela escolhida (A10).
 *
 * @example const { data: tendencia } = useWeightTrend(user.id, '3m');
 */
export function useWeightTrend(studentId: string, period: TrendPeriod) {
  const today = localDateKey();
  return useQuery<WeightTrend>({
    queryKey: ['weight-trend', studentId, period, today],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('progress.weight_trend', () =>
        journeys.fetchWeightTrend(studentId, period, today)
      ),
  });
}

/**
 * Tudo o que aconteceu desde que o plano nasceu (D1).
 *
 * @example const { data: jornada } = useJourney(user.id);
 */
export function useJourney(studentId: string) {
  const today = localDateKey();
  return useQuery<Journey>({
    queryKey: ['journey', studentId, today],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('progress.journey', () => journeys.fetchJourney(studentId, today)),
  });
}
