import { useState } from 'react';
import { View } from 'react-native';
import { ChipPick } from '@/components/ui/ChipPick';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { ROUTES } from '@/navigation/types';
import { Chips } from '../components/Chips';
import { OnboardingFrame, OnboardingLabel, OnboardingTitle } from '../components/OnboardingFrame';
import { useSaveAndContinue } from '../hooks/useSaveAndContinue';
import {
  DIET_STYLES,
  FOOD_BUDGETS,
  FOOD_EXCLUSIONS,
  FOOD_ROUTINES,
  MEALS_PER_DAY,
} from '../services/routineOptions';

type Style = (typeof DIET_STYLES)[number]['value'];
type Budget = (typeof FOOD_BUDGETS)[number]['value'];

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * O7 · Sua alimentação (5 de 5): refeições, o que não come, estilo, rotina e
 * orçamento. O plano respeita exatamente as refeições e as exclusões daqui
 * (#365). "Pular por enquanto" segue com o padrão.
 *
 * É a última pergunta: conclui a anamnese, o que tira a pessoa do guarda.
 *
 * @example <FoodScreen />
 */
export function FoodScreen() {
  const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_alimentacao');
  const [meals, setMeals] = useState<number | null>(null);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [style, setStyle] = useState<Style | ''>('');
  const [routine, setRoutine] = useState<string[]>([]);
  const [budget, setBudget] = useState<Budget | ''>('');
  const ready = meals !== null && style !== '';

  // O fim provisório até O8 existir: "Montar meu plano" conclui e leva à tela
  // inicial; a geração do plano é a fatia 2.
  function concluir(answers: Record<string, unknown>) {
    void saveAndGo(answers, ROUTES.TABS.ROOT, true);
  }

  return (
    <OnboardingFrame
      step={5}
      onSkip={() => concluir({})}
      primary={{
        label: saving ? 'Salvando…' : 'Montar meu plano',
        icon: 'sparkles-outline',
        onPress: () =>
          concluir({
            meals_per_day: meals,
            food_exclusions: exclusions,
            diet_style: style,
            food_routine: routine,
            ...(budget ? { food_budget: budget } : {}),
          }),
        disabled: !ready || saving,
        hint: 'Escolha as refeições por dia e o estilo',
      }}
    >
      <OnboardingTitle sub="Comida de verdade, do jeito que você já come.">
        Sua alimentação
      </OnboardingTitle>

      <OnboardingLabel>Refeições por dia</OnboardingLabel>
      <View className="flex-row gap-[0.4375rem]" accessibilityRole="radiogroup">
        {MEALS_PER_DAY.map((option) => (
          <ChipPick
            key={option}
            rotulo={String(option)}
            marcado={meals === option}
            onPress={() => setMeals(option)}
          />
        ))}
      </View>

      <OnboardingLabel right="marque quantos quiser">Não como</OnboardingLabel>
      <Chips
        options={FOOD_EXCLUSIONS}
        selected={exclusions}
        onToggle={(item) => setExclusions((atual) => toggle(atual, item))}
      />

      <OnboardingLabel>Estilo</OnboardingLabel>
      <GlassSegmented<Style | ''> options={DIET_STYLES} value={style} onChange={setStyle} />

      <OnboardingLabel right="marque quantos quiser">Rotina</OnboardingLabel>
      <Chips
        options={FOOD_ROUTINES}
        selected={routine}
        onToggle={(item) => setRoutine((atual) => toggle(atual, item))}
      />

      <OnboardingLabel right="opcional">Orçamento</OnboardingLabel>
      <GlassSegmented<Budget | ''> options={FOOD_BUDGETS} value={budget} onChange={setBudget} />
    </OnboardingFrame>
  );
}
