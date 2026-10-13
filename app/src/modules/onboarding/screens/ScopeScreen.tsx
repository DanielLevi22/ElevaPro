import { View } from 'react-native';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { useNextStep } from '../hooks/useNextStep';
import type { PlanScope } from '../services/onboardingFlow';
import { useOnboardingStore } from '../store/onboardingStore';

const OPCOES: {
  scope: PlanScope;
  icon: 'layers-outline' | 'barbell-outline' | 'restaurant-outline';
  title: string;
  sub: string;
}[] = [
  {
    scope: 'both',
    icon: 'layers-outline',
    title: 'Treino e dieta',
    sub: 'Os dois, combinados para o seu objetivo',
  },
  {
    scope: 'training',
    icon: 'barbell-outline',
    title: 'Só treino',
    sub: 'Sem perguntas de corpo e alimentação',
  },
  {
    scope: 'diet',
    icon: 'restaurant-outline',
    title: 'Só dieta',
    sub: 'Sem perguntas sobre o seu treino',
  },
];

/**
 * Logo depois das boas-vindas: o que a pessoa quer que o app monte. A escolha
 * decide as perguntas (`onboardingFlow`): cada caminho pergunta só o que usa.
 * Nenhuma vem marcada; nenhuma é a "certa".
 *
 * @example <ScopeScreen />
 */
export function ScopeScreen() {
  const scope = useOnboardingStore((state) => state.scope);
  const chooseScope = useOnboardingStore((state) => state.chooseScope);
  const goNext = useNextStep();

  return (
    <OnboardingFrame
      primary={{
        label: 'Continuar',
        onPress: () => void goNext('scope'),
        disabled: scope === null,
        hint: 'Escolha o que você quer montar',
      }}
    >
      <OnboardingTitle sub="Você pode mudar depois.">O que você quer montar?</OnboardingTitle>
      <View className="mt-[1.375rem]" accessibilityRole="radiogroup">
        {OPCOES.map((opcao) => (
          <GlassChoice
            key={opcao.scope}
            icon={opcao.icon}
            title={opcao.title}
            sub={opcao.sub}
            active={scope === opcao.scope}
            onPress={() => chooseScope(opcao.scope)}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
