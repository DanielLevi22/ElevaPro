import {
  addDays,
  createProgressService,
  type NutritionPeriod,
  summarizeNutrition,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';
import { dailyCalorieGoal, intakeByDay } from '@/services/nutritionIntake';

const progress = createProgressService(supabase);

/** As 12 semanas da tela e as 12 anteriores, para a variação. */
const DAYS = 24 * 7;

export interface NutritionNumbers {
  period: NutritionPeriod;
  /** A meta diária de calorias do plano; `null` sem plano ou sem meta. */
  dailyGoal: number | null;
  loading: boolean;
}

/**
 * A nutrição em números do Student (tela 7 da #312): lê o plano e os registros do
 * período, soma cada dia e resume as 12 semanas.
 *
 * O log de falha vai sem o erro: o registro de refeição é dado de saúde (Art. 6°, VII).
 *
 * @example const { period, dailyGoal } = useNutritionNumbers(user.id);
 */
export function useNutritionNumbers(studentId: string): NutritionNumbers {
  const today = localDateKey();
  const from = addDays(today, -(DAYS - 1));
  const { data, isLoading } = useQuery({
    queryKey: ['nutritionNumbers', studentId, today],
    queryFn: () =>
      avisandoSeFalhar('progress.read_nutrition', () =>
        progress.getNutritionSources(studentId, from, today)
      ),
  });

  return useMemo(
    () => ({
      period: summarizeNutrition(data ? intakeByDay(data, from, today) : [], today),
      dailyGoal: data ? dailyCalorieGoal(data) : null,
      loading: isLoading,
    }),
    [data, from, today, isLoading]
  );
}
