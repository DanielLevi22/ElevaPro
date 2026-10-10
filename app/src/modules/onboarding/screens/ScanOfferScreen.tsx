import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';

/**
 * Depois de O4: a análise corporal como oferta, nunca como passo (ADR-0044).
 * Fotos do corpo no primeiro minuto são atrito, e a ativação não pode depender
 * delas: "Agora não" tem o mesmo peso que "Fazer agora".
 *
 * O scan não estima peso nem altura (ADR-0022): refina o que O4 coletou. Com o
 * % de gordura, a proteína do plano sai da massa magra.
 *
 * @example <ScanOfferScreen />
 */
export function ScanOfferScreen() {
  const router = useRouter();
  const seguir = () => router.push(ROUTES.ONBOARDING.HEALTH);

  return (
    <OnboardingFrame
      step={3}
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: 'Agora não', icone: 'arrow-forward', onPress: seguir }}
          principal={{
            rotulo: 'Fazer agora',
            icone: 'camera-outline',
            onPress: () =>
              router.push({
                pathname: ROUTES.ASSESSMENT.BODY_SCAN,
                params: { retorno: 'onboarding' },
              }),
          }}
        />
      }
    >
      <View className="mt-[2.125rem] items-start">
        <CaixaDeIcone icon="body-outline" tom="marca" tamanho="destaque" />
      </View>
      <OnboardingTitle
        eyebrow="Opcional"
        sub="Três fotos, cerca de um minuto. Estimamos seu percentual de gordura e suas medidas para afinar a meta."
      >
        Quer um plano mais preciso?
      </OnboardingTitle>
      <View className="mt-5">
        <LinhaDeVidro
          icon="fish-outline"
          tom="marca"
          titulo="Proteína pela sua massa magra"
          sub="Em vez de pelo peso total"
          direita={<View />}
        />
        <LinhaDeVidro
          icon="time-outline"
          tom="marca"
          titulo="Dá para fazer depois"
          sub="Em Progresso, quando quiser; o plano se ajusta"
          direita={<View />}
        />
      </View>
      <Text className="mt-3 text-[0.71875rem] leading-[1rem] text-hero-secondary">
        É estimativa por foto, com margem de erro. As fotos não são guardadas.
      </Text>
    </OnboardingFrame>
  );
}
