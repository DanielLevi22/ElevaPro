import type { DietGoalSuggestion } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { formatKcal } from '../../services/dietPlanSummary';
import { StepButton } from './StepButton';

/**
 * A "Meta diária" do kit (tela 17): TMB e GET à direita, a meta grande na
 * primária e a linha do déficit ou superávit. "−"/"+" ajustam de 50 em 50.
 *
 * @example <DailyGoalCard targetCalories={2240} suggestion={sugestao} onChange={setMeta} />
 */
interface DailyGoalCardProps {
  targetCalories: number;
  suggestion: DietGoalSuggestion | null;
  onChange: (kcal: number) => void;
}

const STEP = 50;

const GOAL_LABEL = {
  cutting: 'emagrecimento',
  maintenance: 'manutenção',
  bulking: 'hipertrofia',
} as const;

function balanceLine(targetCalories: number, suggestion: DietGoalSuggestion | null): string {
  if (!suggestion) return 'Sem anamnese completa: defina a meta à mão.';
  const delta = targetCalories - suggestion.tdee;
  const goal = GOAL_LABEL[suggestion.goal];
  if (delta === 0) return `No gasto do dia · ${goal}`;
  const kind = delta < 0 ? 'Déficit' : 'Superávit';
  return `${kind} de ${formatKcal(Math.abs(delta))} kcal · ${goal}`;
}

export function DailyGoalCard({ targetCalories, suggestion, onChange }: DailyGoalCardProps) {
  return (
    <Vidro classeExterna="mt-[1.125rem]" className="p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[0.65625rem] font-bold uppercase tracking-[0.12em] text-placeholder">
          Meta diária
        </Text>
        {suggestion && (
          <Text className="text-[0.71875rem] text-muted-foreground">
            {`TMB ${formatKcal(suggestion.tmb)} · GET ${formatKcal(suggestion.tdee)}`}
          </Text>
        )}
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="font-display-black text-[2.625rem] tracking-tighter text-primary-text">
          {formatKcal(targetCalories)}
          <Text className="text-base font-bold text-muted-foreground"> kcal</Text>
        </Text>
        <View className="flex-row gap-2">
          <StepButton
            direction="down"
            label="Diminuir a meta"
            onPress={() => onChange(targetCalories - STEP)}
          />
          <StepButton
            direction="up"
            label="Aumentar a meta"
            onPress={() => onChange(targetCalories + STEP)}
          />
        </View>
      </View>
      <Text className="mt-0.5 text-[0.75rem] text-muted-foreground">
        {balanceLine(targetCalories, suggestion)}
      </Text>
    </Vidro>
  );
}
