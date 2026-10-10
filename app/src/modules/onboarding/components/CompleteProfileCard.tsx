import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { type ProfileGap, useProfileCompletion } from '../hooks/useProfileCompletion';

const COPY: Record<ProfileGap, { titulo: string; texto: string; acao: string }> = {
  consent_declined: {
    titulo: 'Libere sua dieta',
    texto:
      'Seu plano está só com treino. Com o aceite dos dados de saúde, montamos a sua dieta também.',
    acao: 'Ver o aceite',
  },
  screening_undisclosed: {
    titulo: 'Complete seu perfil',
    texto: 'Responda a triagem de saúde para liberar a dieta. Leva menos de um minuto.',
    acao: 'Responder a triagem',
  },
};

const DESTINO: Record<
  ProfileGap,
  typeof ROUTES.ONBOARDING.CONSENT | typeof ROUTES.ONBOARDING.HEALTH
> = {
  consent_declined: ROUTES.ONBOARDING.CONSENT,
  screening_undisclosed: ROUTES.ONBOARDING.HEALTH,
};

/**
 * O12 · "Complete seu perfil": a próxima ação da tela inicial (ADR-0033) para o
 * Praticante cujo plano saiu sem dieta. Sem nada faltando, não aparece.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<CompleteProfileCard />} />
 */
export function CompleteProfileCard() {
  const router = useRouter();
  const gap = useProfileCompletion();
  if (!gap) return null;
  const copy = COPY[gap];

  return (
    <Vidro classeExterna="mt-5" className="gap-3 p-[0.9375rem]">
      <View className="flex-row items-center gap-3">
        <CaixaDeIcone icon="restaurant-outline" tom="gordura" />
        <View className="flex-1">
          <Text className="text-[0.90625rem] font-bold text-hero">{copy.titulo}</Text>
          <Text className="mt-0.5 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
            {copy.texto}
          </Text>
        </View>
      </View>
      <BotaoDeDestaque
        rotulo={copy.acao}
        tamanho="cartao"
        onPress={() => router.push(DESTINO[gap])}
      />
    </Vidro>
  );
}
