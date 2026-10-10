import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';

/** As três poses do escaneamento, com a de frente maior no meio. */
const POSES = [
  { pose: 'side', height: 132, label: 'Perfil' },
  { pose: 'front', height: 158, label: 'Frente' },
  { pose: 'back', height: 132, label: 'Costas' },
] as const;

/** O que a pessoa ganha, em português de gente: sem "massa magra" nem "%" sozinho. */
const GANHOS: { icon: keyof typeof Ionicons.glyphMap; titulo: string; sub: string }[] = [
  {
    icon: 'body-outline',
    titulo: 'Seu percentual de gordura e suas medidas',
    sub: 'Cintura, quadril, braço e coxa, sem fita métrica',
  },
  {
    icon: 'nutrition-outline',
    titulo: 'Um plano ajustado ao seu corpo',
    sub: 'Não só ao seu peso na balança',
  },
  {
    icon: 'trending-up-outline',
    titulo: 'Sua evolução, foto a foto',
    sub: 'Repita quando quiser e compare em Progresso',
  },
];

/**
 * Depois de O4: o escaneamento corporal por foto, apresentado como o que ele é,
 * uma das coisas que o Eleva faz e outros apps não (ADR-0044). Oferta, nunca
 * passo: pular fica à vista, e diz que o plano sai do mesmo jeito, para ninguém
 * desistir do onboarding por não querer se fotografar agora.
 *
 * O scan não estima peso nem altura (ADR-0022): refina o que O4 coletou.
 *
 * @example <ScanOfferScreen />
 */
export function ScanOfferScreen() {
  const router = useRouter();

  return (
    <OnboardingFrame
      step={3}
      primary={{
        label: 'Fazer meu escaneamento',
        icon: 'scan-outline',
        onPress: () =>
          router.push({ pathname: ROUTES.ASSESSMENT.BODY_SCAN, params: { retorno: 'onboarding' } }),
      }}
      secondaryText={{
        label: 'Pular por agora · seu plano sai do mesmo jeito',
        onPress: () => router.push(ROUTES.ONBOARDING.HEALTH),
      }}
    >
      <View className="mt-4 items-center">
        <Chip tom="ia">Tecnologia IA</Chip>
        <View
          className="mt-4 flex-row items-end justify-center gap-5"
          accessible
          accessibilityLabel="Três fotos: frente, perfil e costas"
        >
          {POSES.map(({ pose, height, label }) => (
            <View key={pose} className="items-center">
              <ReferenceBody pose={pose} height={height} glow={pose === 'front'} />
              <Text className="mt-1.5 font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <OnboardingTitle
        eyebrow="Escaneamento corporal · opcional"
        sub="Com três fotos do seu celular, a IA estima como é o seu corpo hoje. Leva cerca de um minuto."
      >
        Seu corpo em 3 fotos
      </OnboardingTitle>
      <View className="mt-4">
        {GANHOS.map((ganho) => (
          <LinhaDeVidro
            key={ganho.titulo}
            icon={ganho.icon}
            tom="marca"
            titulo={ganho.titulo}
            sub={ganho.sub}
            direita={<View />}
          />
        ))}
      </View>
      <InfoNote icon="shield-checkmark-outline" className="mt-1">
        As fotos são analisadas e descartadas. Só o resultado fica salvo, e é uma estimativa.
      </InfoNote>
    </OnboardingFrame>
  );
}
