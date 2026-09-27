import { DIAS_DA_SEMANA, type StrategyResult } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { formatKcal } from '../../services/dietPlanSummary';

/**
 * A "Previsão semanal" do web, no vidro: o que cada dia da estratégia pede.
 * Só aparece na dieta cíclica, onde os dias diferem.
 *
 * @example <WeeklyForecast schedule={calculateDietStrategy('carb_cycling', 2200)} />
 */
export function WeeklyForecast({ schedule }: { schedule: StrategyResult }) {
  return (
    <>
      {schedule.weeklySchedule.map((day) => (
        <Vidro key={day.dayOfWeek} classeExterna="mb-2" className="flex-row items-center gap-3 p-3">
          <Text className="w-11 text-[0.71875rem] font-bold text-placeholder">
            {DIAS_DA_SEMANA[day.dayOfWeek].slice(0, 3)}
          </Text>
          <View className="min-w-0 flex-1">
            <Text className="text-[0.8125rem] font-bold text-foreground">{day.label}</Text>
            <Text className="text-[0.6875rem] text-muted-foreground">{day.description}</Text>
          </View>
          <Text className="text-[0.78125rem] font-bold text-primary-text">
            {`${formatKcal(day.macros.calories)} kcal`}
          </Text>
        </Vidro>
      ))}
    </>
  );
}
