import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useCan } from '@/auth';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useLightWeekStore } from '@/shared/lightWeek';

const OPTIONS = [
  {
    key: 'pause',
    icon: 'pause-outline',
    title: 'Pausar o plano',
    sub: 'A sequência e o check-in esperam você voltar',
  },
  {
    key: 'light',
    icon: 'leaf-outline',
    title: 'Voltar com semana leve',
    sub: 'Sete dias com cargas 20% menores',
  },
  {
    key: 'keep',
    icon: 'play-outline',
    title: 'Continuar como está',
    sub: 'O plano segue do jeito que estava',
  },
] as const;

type Choice = (typeof OPTIONS)[number]['key'];

/**
 * F5 · Semana corrida? Sete dias sem treino viram uma pergunta, nunca uma
 * cobrança: pausar, voltar mais leve ou seguir.
 *
 * @example <BusyWeekScreen />
 */
export function BusyWeekScreen() {
  const router = useRouter();
  const startLightWeek = useLightWeekStore((state) => state.start);
  const [choice, setChoice] = useState<Choice>('light');
  const canPause = useCan('create', 'RestPeriod');
  const options = OPTIONS.filter((option) => option.key !== 'pause' || canPause);

  function confirm() {
    if (choice === 'pause') {
      router.replace(ROUTES.BLOCK.REST);
      return;
    }
    if (choice === 'light') startLightWeek(localDateKey());
    router.replace(ROUTES.TABS.WORKOUTS);
  }

  return (
    <FlowFrame header={{}} primary={{ label: 'Continuar', onPress: confirm }}>
      <FlowTitle
        eyebrow="Sem pressa"
        sub="Faz uns dias sem treino. Acontece. Como você quer voltar?"
      >
        Semana corrida?
      </FlowTitle>
      <View className="mt-4 gap-2">
        {options.map((option) => (
          <GlassChoice
            key={option.key}
            icon={option.icon}
            title={option.title}
            sub={option.sub}
            active={choice === option.key}
            onPress={() => setChoice(option.key)}
          />
        ))}
      </View>
    </FlowFrame>
  );
}
