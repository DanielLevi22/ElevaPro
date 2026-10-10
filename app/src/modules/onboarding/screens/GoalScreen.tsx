import { View } from 'react-native';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { useNextStep } from '../hooks/useNextStep';
import { GOAL_OPTIONS } from '../services/onboardingOptions';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * O2 · Objetivo (1 de 5). Sem escolha, o botão fica travado e diz por quê.
 *
 * @example <GoalScreen />
 */
export function GoalScreen() {
  const goal = useOnboardingStore((state) => state.goal);
  const chooseGoal = useOnboardingStore((state) => state.chooseGoal);
  const goNext = useNextStep();

  return (
    <OnboardingFrame
      step={1}
      primary={{
        label: 'Continuar',
        onPress: () => void goNext('goal'),
        disabled: goal === null,
        hint: 'Escolha um objetivo para continuar',
      }}
    >
      <OnboardingTitle sub="Escolha o principal. Você pode mudar depois.">
        Qual é o seu objetivo?
      </OnboardingTitle>
      <View className="mt-[1.375rem]" accessibilityRole="radiogroup">
        {GOAL_OPTIONS.map((option) => (
          <GlassChoice
            key={option.value}
            icon={option.icon}
            title={option.label}
            active={goal === option.value}
            onPress={() => chooseGoal(option.value)}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
