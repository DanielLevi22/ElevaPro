import { useState } from 'react';
import { View } from 'react-native';
import { ChipPick } from '@/components/ui/ChipPick';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { ROUTES } from '@/navigation/types';
import { Chips } from '../components/Chips';
import { FoodExclusionSearch } from '../components/FoodExclusionSearch';
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

/** Abre a busca no banco de alimentos: o "Outro" do "Não como" não é texto livre. */
const OTHER_FOOD = 'Outro alimento';

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * O7 · Sua alimentação (5 de 5): refeições, o que não come, estilo, rotina e
 * orçamento. O plano respeita exatamente as refeições e as exclusões daqui
 * (#365). "Pular por enquanto" segue com o padrão.
 *
 * É a última pergunta: "Montar meu plano" leva a O8.
 *
 * @example <FoodScreen />
 */
export function FoodScreen() {
  const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_alimentacao');
  const [meals, setMeals] = useState<number | null>(null);
  const [exclusions, setExclusions] = useState<string[]>([]);
  // Os alimentos achados na busca do "Outro alimento", pelo nome do banco.
  const [searchedFoods, setSearchedFoods] = useState<string[]>([]);
  const [style, setStyle] = useState<Style | ''>('');
  const [routine, setRoutine] = useState<string[]>([]);
  const [budget, setBudget] = useState<Budget | ''>('');
  const ready = meals !== null && style !== '';

  // Não conclui a anamnese: quem conclui é "Aprovar plano", em O9.
  function concluir(answers: Record<string, unknown>) {
    void saveAndGo(answers, ROUTES.ONBOARDING.BUILDING);
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
            food_exclusions: [
              ...exclusions.filter((item) => item !== OTHER_FOOD),
              ...searchedFoods,
            ],
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
            label={String(option)}
            selected={meals === option}
            onPress={() => setMeals(option)}
          />
        ))}
      </View>

      <OnboardingLabel right="marque quantos quiser">Não como</OnboardingLabel>
      <Chips
        options={[...FOOD_EXCLUSIONS, OTHER_FOOD]}
        selected={exclusions}
        onToggle={(item) => setExclusions((atual) => toggle(atual, item))}
      />
      {exclusions.includes(OTHER_FOOD) ? (
        <FoodExclusionSearch chosen={searchedFoods} onChange={setSearchedFoods} />
      ) : null}

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
