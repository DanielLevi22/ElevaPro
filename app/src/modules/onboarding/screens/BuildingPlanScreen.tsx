import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { PassoDeEspera } from '@/components/ui/PassoDeEspera';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { BffHttpError } from '@/shared/bff';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { generateOnboardingPlan } from '../services/planService';
import { usePlanDraftStore } from '../store/planDraftStore';

type Falha = 'rede' | 'plano';

const PASSOS = [
  'Calculando sua meta',
  'Escolhendo seus alimentos',
  'Montando sua semana de treino',
];

/**
 * O8 · Montando: pede o plano ao BFF e leva a O9 quando ele chega.
 *
 * Os três passos aparecem juntos em "Agora", e não acendendo um a um: a rota
 * responde de uma vez, e acender em sequência seria fingir saber em que parte
 * ela está — a regra que tirou a espera fabricada do body scan. Acender de
 * verdade pede a resposta em partes, como a análise corporal faz.
 *
 * @example <BuildingPlanScreen />
 */
export function BuildingPlanScreen() {
  const router = useRouter();
  const setPlan = usePlanDraftStore((state) => state.setPlan);
  const [falha, setFalha] = useState<Falha | null>(null);

  const montar = useCallback(async () => {
    setFalha(null);
    try {
      setPlan(await generateOnboardingPlan());
      router.replace(ROUTES.ONBOARDING.PLAN);
    } catch (erro) {
      const recusado = erro instanceof BffHttpError && erro.code === 'plan_rejected';
      registrarFalha('onboarding.gerar_plano', { recusado });
      setFalha(recusado ? 'plano' : 'rede');
    }
  }, [router, setPlan]);

  useEffect(() => {
    void montar();
  }, [montar]);

  if (!falha) {
    return (
      <OnboardingFrame>
        <OnboardingTitle eyebrow="Leva uns segundos" sub="Estamos juntando tudo que você contou.">
          Montando seu plano
        </OnboardingTitle>
        <Passos estado="agora" />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      primary={{ label: 'Tentar de novo', icon: 'refresh', onPress: () => void montar() }}
    >
      <View className="mt-4 items-start">
        <CaixaDeIcone
          icon={falha === 'rede' ? 'cloud-offline-outline' : 'construct-outline'}
          tom="gordura"
          tamanho="destaque"
        />
      </View>
      {falha === 'rede' ? (
        <OnboardingTitle
          eyebrow="Sem conexão"
          sub="Sua conexão caiu no meio. Suas respostas estão salvas."
        >
          Não conseguimos montar agora
        </OnboardingTitle>
      ) : (
        <OnboardingTitle
          eyebrow="Quase lá"
          sub="O plano que saiu não respeitava tudo que você escolheu, e não mostramos plano assim. Suas respostas estão salvas."
        >
          Vamos montar de novo
        </OnboardingTitle>
      )}
      <Passos estado="parou" />
    </OnboardingFrame>
  );
}

function Passos({ estado }: { estado: 'agora' | 'parou' }) {
  return (
    <Vidro classeExterna="mt-5" className="px-3.5 pb-0.5">
      {PASSOS.map((passo) => (
        <PassoDeEspera
          key={passo}
          rotulo={passo}
          estado={estado === 'parou' ? 'a_seguir' : 'agora'}
        />
      ))}
    </Vidro>
  );
}
