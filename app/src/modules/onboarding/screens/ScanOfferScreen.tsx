import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';

/** As três poses do escaneamento: apresentam o recurso, sem pedir nada. */
const POSES = [
  { pose: 'side', height: 92, label: 'Perfil' },
  { pose: 'front', height: 108, label: 'Frente' },
  { pose: 'back', height: 92, label: 'Costas' },
] as const;

type Escolha = 'sem_fotos' | 'com_fotos';

/**
 * Depois de O4: com ou sem o escaneamento corporal por foto. É uma pergunta, e
 * não um convite com saída de emergência: as duas respostas têm o mesmo peso,
 * nenhuma vem marcada, e "sem fotos" vem primeiro para a ordem não empurrar
 * para a câmera. Fotografar o corpo é escolha da pessoa, e o plano sai igual
 * sem isso (ADR-0044).
 *
 * O scan não estima peso nem altura (ADR-0022): refina o que O4 coletou.
 *
 * @example <ScanOfferScreen />
 */
export function ScanOfferScreen() {
  const router = useRouter();
  const [escolha, setEscolha] = useState<Escolha | null>(null);

  function continuar() {
    if (escolha === 'com_fotos') {
      router.push({ pathname: ROUTES.ASSESSMENT.BODY_SCAN, params: { retorno: 'onboarding' } });
      return;
    }
    router.push(ROUTES.ONBOARDING.HEALTH);
  }

  return (
    <OnboardingFrame
      step={3}
      primary={{
        label: 'Continuar',
        onPress: continuar,
        disabled: escolha === null,
        hint: 'Escolha uma das duas opções',
      }}
    >
      <View className="mt-3 items-center">
        <Chip tom="ia">Escaneamento corporal · Tecnologia IA</Chip>
        <View
          className="mt-3 flex-row items-end justify-center gap-4"
          accessible
          accessibilityLabel="O escaneamento usa três fotos: frente, perfil e costas"
        >
          {POSES.map(({ pose, height, label }) => (
            <View key={pose} className="items-center">
              <ReferenceBody pose={pose} height={height} glow={false} />
              <Text className="mt-1 font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <OnboardingTitle sub="O Eleva pode estimar seu corpo por foto. É opcional: seu plano sai completo nos dois casos.">
        Como você quer seguir?
      </OnboardingTitle>
      <View className="mt-[1.375rem]" accessibilityRole="radiogroup">
        <GlassChoice
          icon="arrow-forward-circle-outline"
          title="Seguir sem fotos"
          sub="Usamos seu peso e sua altura. Dá para fazer as fotos depois, em Progresso."
          active={escolha === 'sem_fotos'}
          onPress={() => setEscolha('sem_fotos')}
        />
        <GlassChoice
          icon="scan-outline"
          title="Fazer o escaneamento"
          sub="3 fotos, cerca de 1 minuto. Estima seu percentual de gordura e suas medidas."
          active={escolha === 'com_fotos'}
          onPress={() => setEscolha('com_fotos')}
        />
      </View>
      <Text className="mt-2 text-[0.71875rem] leading-[1rem] text-hero-secondary">
        Se fizer: as fotos são analisadas e descartadas. Só o resultado fica salvo, e é uma
        estimativa.
      </Text>
    </OnboardingFrame>
  );
}
