import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';

const ICONE_DA_LINHA = 18;

/**
 * O5b · Triagem: o resultado de O5 quando não há dieta. Duas variações: condição
 * clínica, que pede acompanhamento individual, e "prefiro não informar", que
 * deixa refazer a triagem.
 *
 * Diz o critério e oferece revisão: é decisão automatizada (Art. 20). O texto
 * não repete a condição marcada; ela não sai de O5.
 *
 * O desenho tem "Encontrar um especialista" como ação principal, e o app ainda
 * não tem onde procurar um. Até ter, a ação principal é seguir com o treino, e a
 * linha da dieta diz como chegar ao especialista.
 *
 * @example router.push({ pathname: ROUTES.ONBOARDING.SCREENING, params: { reason: 'undisclosed' } })
 */
export function ScreeningScreen() {
  const router = useRouter();
  const { reason, injury } = useLocalSearchParams<{ reason?: string; injury?: string }>();
  const undisclosed = reason === 'undisclosed';
  const seguirComTreino = () => router.push(ROUTES.ONBOARDING.TRAINING);

  return (
    <OnboardingFrame
      step={3}
      primary={{
        label: undisclosed ? 'Continuar com o treino' : 'Continuar só com o treino',
        icon: 'barbell-outline',
        onPress: seguirComTreino,
      }}
      secondaryText={
        undisclosed
          ? {
              label: 'Responder a triagem',
              onPress: () => router.replace(ROUTES.ONBOARDING.HEALTH),
            }
          : undefined
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
              : 'Quando um especialista te convidar pelo app, o plano dele aparece aqui'
          }
          onPress={undisclosed ? () => router.replace(ROUTES.ONBOARDING.HEALTH) : undefined}
          direita={undisclosed ? undefined : <View />}
        />
      </View>
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
