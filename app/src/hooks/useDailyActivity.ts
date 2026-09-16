import {
  activityStreak,
  addDays,
  createProgressService,
  type DailyActivity,
  dailyActivities,
  type StreakStanding,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';

const progress = createProgressService(supabase);

/** O heatmap olha 13 semanas, e o resumo 60 dias: os dias vão, no mínimo, até aqui. */
const MIN_DAYS = 98;

export interface DailyActivityState {
  /** Do dia mais antigo com atividade (ou de 98 dias atrás) até hoje. */
  days: DailyActivity[];
  streak: StreakStanding;
  today: string;
  loading: boolean;
  reload: () => Promise<unknown>;
}

/**
 * O que o Student fez em cada dia, e a sequência que sai disso (issue #312).
 *
 * Mora fora dos módulos porque a tela inicial e o hub de Progresso mostram a
 * mesma sequência, e um módulo não importa o outro. As duas leituras não dependem
 * uma da outra e vão juntas.
 *
 * O log de falha vai sem o erro: o do PostgREST pode carregar as linhas, e o
 * registro de refeição é dado de saúde (Art. 6°, VII).
 *
 * Sem `studentId` não busca nada: o especialista também abre a tela inicial.
 *
 * @example const { days, streak } = useDailyActivity(user.id);
 */
export function useDailyActivity(studentId: string | undefined): DailyActivityState {
  const today = localDateKey();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dailyActivity', studentId, today],
    enabled: Boolean(studentId),
    queryFn: () => {
      const id = studentId ?? '';
      return avisandoSeFalhar('progress.read_activity', () =>
        Promise.all([progress.listActivityHistory(id), progress.getMealPlanOutline(id)])
      );
    },
  });

  const days = useMemo(() => {
    if (!data) return [];
    const [history, outline] = data;
    const earliest = [
      ...history.sessions.map((session) => session.date),
      ...history.mealLogs.map((log) => log.logged_date),
    ].reduce((oldest, date) => (date < oldest ? date : oldest), addDays(today, -(MIN_DAYS - 1)));
    return dailyActivities({ from: earliest, to: today, ...history, ...outline });
  }, [data, today]);

  const streak = useMemo(() => activityStreak(days, today), [days, today]);
  return { days, streak, today, loading: isLoading, reload: refetch };
}
