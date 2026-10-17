import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { type ProfileGap, useProfileCompletion } from '../hooks/useProfileCompletion';
import { useOnboardingStore } from '../store/onboardingStore';

const COPY: Record<
  ProfileGap,
  { titulo: string; texto: string; acao: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  consent_declined: {
    titulo: 'Libere sua dieta',
    texto:
      'Seu plano está só com treino. Com o aceite dos dados de saúde, montamos a sua dieta também.',
    acao: 'Ver o aceite',
    icon: 'restaurant-outline',
  },
  screening_undisclosed: {
    titulo: 'Complete seu perfil',
    texto: 'Responda a triagem de saúde para liberar a dieta. Leva menos de um minuto.',
    acao: 'Responder a triagem',
    icon: 'restaurant-outline',
  },
  scan_never_done: {
    titulo: 'Seu corpo em 3 fotos',
    texto:
      'O escaneamento corporal estima seu percentual de gordura e suas medidas, para você acompanhar a evolução.',
    acao: 'Conhecer o escaneamento',
    icon: 'scan-outline',
  },
};

const DESTINO: Record<
  ProfileGap,
  | typeof ROUTES.ONBOARDING.CONSENT
  | typeof ROUTES.ONBOARDING.HEALTH
  | typeof ROUTES.ASSESSMENT.BODY_SCAN
> = {
  consent_declined: ROUTES.ONBOARDING.CONSENT,
  screening_undisclosed: ROUTES.ONBOARDING.HEALTH,
  scan_never_done: ROUTES.ASSESSMENT.BODY_SCAN,
};

/**
 * O12 · "Complete seu perfil": a próxima ação da tela inicial (ADR-0033) para o
 * Praticante cujo plano saiu sem dieta, ou que ainda não conhece o
 * escaneamento. Esse último só apresenta o recurso, e "Agora não" o esconde
 * por 30 dias: oferecer não pode virar cobrança. Sem nada faltando, não
 * aparece.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<CompleteProfileCard />} />
 */
export function CompleteProfileCard() {
  const router = useRouter();
  const gap = useProfileCompletion();
  const studentId = useAuthStore((state) => state.session?.user.id ?? null);
  if (!gap) return null;
  const copy = COPY[gap];

  return (
    <Vidro classeExterna="mt-5" className="gap-3 p-[0.9375rem]">
      <View className="flex-row items-center gap-3">
        <CaixaDeIcone icon={copy.icon} tom={gap === 'scan_never_done' ? 'marca' : 'gordura'} />
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
      {gap === 'scan_never_done' ? (
        <TouchableOpacity
          onPress={() => studentId && useOnboardingStore.getState().dismissScanCard(studentId)}
          accessibilityRole="button"
          className="items-center py-1"
        >
          <Text className="text-[0.78125rem] font-semibold text-hero-secondary">Agora não</Text>
        </TouchableOpacity>
      ) : null}
    </Vidro>
  );
}
