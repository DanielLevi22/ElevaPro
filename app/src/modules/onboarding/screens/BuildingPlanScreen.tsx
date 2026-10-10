import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { PassoDeEspera } from '@/components/ui/PassoDeEspera';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { ProjectionCurve } from '../components/ProjectionCurve';
import { useWeightProjection } from '../hooks/useWeightProjection';
import { classifyPlanFailure, failureCode, type PlanFailure } from '../services/planFailure';
import { generateOnboardingPlan } from '../services/planService';
import { usePlanDraftStore } from '../store/planDraftStore';

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
  const [falha, setFalha] = useState<PlanFailure | null>(null);
  const projection = useWeightProjection();

  const montar = useCallback(async () => {
    setFalha(null);
    try {
      setPlan(await generateOnboardingPlan());
      router.replace(ROUTES.ONBOARDING.PLAN);
    } catch (erro) {
      const causa = classifyPlanFailure(erro);
      registrarFalha('onboarding.gerar_plano', { causa, codigo: failureCode(erro) });
      setFalha(causa);
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
        {projection ? <ProjectionCurve projection={projection} /> : null}
        <Passos estado="agora" />
      </OnboardingFrame>
    );
  }

  const texto = FALHAS[falha];
  const destino = DESTINO_DA_FALHA[falha];
  return (
    <OnboardingFrame
      primary={{
        label: texto.acao,
        icon: destino ? 'arrow-forward' : 'refresh',
        onPress: () => (destino ? router.replace(destino) : void montar()),
      }}
    >
      <View className="mt-4 items-start">
        <CaixaDeIcone icon={texto.icon} tom="gordura" tamanho="destaque" />
      </View>
      <OnboardingTitle eyebrow={texto.eyebrow} sub={texto.sub}>
        {texto.titulo}
      </OnboardingTitle>
      {projection ? <ProjectionCurve projection={projection} faded /> : null}
      <Passos estado="parou" />
    </OnboardingFrame>
  );
}

/** O que cada falha diz. Nenhuma culpa a conexão da pessoa sem ser a conexão. */
const FALHAS: Record<
  PlanFailure,
  {
    icon: keyof typeof Ionicons.glyphMap;
    eyebrow: string;
    titulo: string;
    sub: string;
    acao: string;
  }
> = {
  rede: {
    icon: 'cloud-offline-outline',
    eyebrow: 'Sem conexão',
    titulo: 'Não conseguimos montar agora',
    sub: 'Não conseguimos falar com o servidor. Confira sua internet; suas respostas estão salvas.',
    acao: 'Tentar de novo',
  },
  plano: {
    icon: 'construct-outline',
    eyebrow: 'Quase lá',
    titulo: 'Vamos montar de novo',
    sub: 'O plano que saiu não respeitava tudo que você escolheu, e não mostramos plano assim. Suas respostas estão salvas.',
    acao: 'Tentar de novo',
  },
  aceite: {
    icon: 'shield-checkmark-outline',
    eyebrow: 'Falta um passo',
    titulo: 'Falta o seu aceite',
    sub: 'Para montar o plano com seus dados de saúde, precisamos do seu aceite.',
    acao: 'Ver o aceite',
  },
  respostas: {
    icon: 'create-outline',
    eyebrow: 'Falta um passo',
    titulo: 'Faltam algumas respostas',
    sub: 'Precisamos da sua idade, altura, peso e sexo para calcular a meta.',
    acao: 'Responder',
  },
  servidor: {
    icon: 'construct-outline',
    eyebrow: 'Algo deu errado',
    titulo: 'O erro foi do nosso lado',
    sub: 'Não foi a sua conexão. Tente de novo em instantes; suas respostas estão salvas.',
    acao: 'Tentar de novo',
  },
};

/** As falhas que não se resolvem tentando de novo levam a pessoa ao passo que falta. */
const DESTINO_DA_FALHA: Partial<
  Record<PlanFailure, typeof ROUTES.ONBOARDING.CONSENT | typeof ROUTES.ONBOARDING.ABOUT>
> = {
  aceite: ROUTES.ONBOARDING.CONSENT,
  respostas: ROUTES.ONBOARDING.ABOUT,
};

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
