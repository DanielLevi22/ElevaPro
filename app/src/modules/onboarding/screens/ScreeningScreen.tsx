import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { LinkCodeSheet } from '@/components/linkCode/LinkCodeSheet';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { useSaveAndContinue } from '../hooks/useSaveAndContinue';
import { useOnboardingStore } from '../store/onboardingStore';

const ICONE_DA_LINHA = 18;

/**
 * O5b · Triagem: o resultado de O5 quando não há dieta. Duas variações: condição
 * clínica, que pede acompanhamento individual, e "prefiro não informar", que
 * deixa refazer a triagem.
 *
 * Diz o critério e oferece revisão: é decisão automatizada (Art. 20). O texto
 * não repete a condição marcada; ela não sai de O5.
 *
 * "Encontrar um especialista" abre o vínculo por código (`LinkCodeSheet`): a
 * pessoa compartilha o dela ou digita o do especialista. O app ainda não tem
 * onde procurar um. A ação principal é seguir com o treino.
 *
 * @example router.push({ pathname: ROUTES.ONBOARDING.SCREENING, params: { reason: 'undisclosed' } })
 */
export function ScreeningScreen() {
  const router = useRouter();
  const { reason, injury } = useLocalSearchParams<{ reason?: string; injury?: string }>();
  const undisclosed = reason === 'undisclosed';
  const dietOnly = useOnboardingStore((state) => state.scope) === 'diet';
  const { saveAndGo } = useSaveAndContinue('onboarding.concluir_sem_plano');
  const studentId = useAuthStore((state) => state.session?.user.id ?? null);
  const [findingSpecialist, setFindingSpecialist] = useState(false);
  const findSpecialist = () => setFindingSpecialist(true);
  // Quem pediu só dieta e não tem dieta liberada não tem o que montar: pode trocar
  // para treino, ou ir para a tela inicial com o onboarding concluído (sem isso o
  // guarda o traria de volta a O1 a cada abertura).
  const seguirComTreino = () => {
    if (dietOnly) useOnboardingStore.getState().chooseScope('training');
    router.push(ROUTES.ONBOARDING.TRAINING);
  };

  return (
    <OnboardingFrame
      step={3}
      primary={{
        label: dietOnly
          ? 'Montar só o treino'
          : undisclosed
            ? 'Continuar com o treino'
            : 'Continuar só com o treino',
        icon: 'barbell-outline',
        onPress: seguirComTreino,
      }}
      secondaryText={
        undisclosed
          ? {
              label: 'Responder a triagem',
              onPress: () => router.replace(ROUTES.ONBOARDING.HEALTH),
            }
          : dietOnly
            ? {
                label: 'Ir para a tela inicial',
                onPress: () => void saveAndGo({}, ROUTES.TABS.ROOT, true),
              }
            : { label: 'Encontrar um especialista', onPress: findSpecialist }
      }
    >
      <View className="mt-[2.125rem] items-start">
        <CaixaDeIcone
          icon={undisclosed ? 'shield-checkmark-outline' : 'medkit-outline'}
          tom="gordura"
          tamanho="destaque"
        />
      </View>
      {undisclosed ? (
        <OnboardingTitle
          eyebrow="Para sua segurança"
          sub="Sem saber da sua saúde, não montamos dieta por enquanto. Seu treino continua normal."
        >
          Vamos começar pelo treino
        </OnboardingTitle>
      ) : (
        <OnboardingTitle
          eyebrow="Para sua segurança"
          sub="Com a condição que você marcou, a alimentação pede acompanhamento individual. Por isso o app não monta dieta nesse caso. Seu treino continua normal."
        >
          Sua dieta precisa de um especialista
        </OnboardingTitle>
      )}
      <View className="mt-5">
        <LinhaDeVidro
          icon="barbell-outline"
          tom="marca"
          titulo="Treino feito para você"
          sub="Montamos agora, como os outros"
          direita={<Marca />}
        />
        {injury === '1' ? (
          <LinhaDeVidro
            icon="bandage-outline"
            tom="marca"
            titulo="Lesão ou dor considerada"
            sub="Evitamos exercícios que pesam no local"
            direita={<Marca />}
          />
        ) : null}
        <LinhaDeVidro
          icon="restaurant-outline"
          tom="gordura"
          titulo={undisclosed ? 'Dieta: sem plano por enquanto' : 'Dieta com um especialista'}
          sub={
            undisclosed
              ? 'Responda a triagem quando quiser para liberar'
              : 'Toque para se conectar ao seu especialista por código'
          }
          onPress={undisclosed ? () => router.replace(ROUTES.ONBOARDING.HEALTH) : findSpecialist}
        />
      </View>
      <LinkCodeSheet
        visible={findingSpecialist}
        side="student"
        userId={studentId}
        onClose={() => setFindingSpecialist(false)}
      />
    </OnboardingFrame>
  );
}

function Marca() {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <Ionicons
      name="checkmark-circle-outline"
      size={escalar(ICONE_DA_LINHA)}
      color={cores.primaryText}
    />
  );
}
