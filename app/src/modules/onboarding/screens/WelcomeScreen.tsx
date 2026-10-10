import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Anel } from '@/components/ui/Anel';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { useOnboardingStore } from '../store/onboardingStore';

const ICONE_DO_SELO = 15;

/**
 * O1 · Boas-vindas: a promessa do onboarding, com a prévia do que sai no fim.
 *
 * A meta do anel é ilustração, marcada como estimativa: ninguém respondeu nada
 * ainda.
 *
 * @example <WelcomeScreen />
 */
export function WelcomeScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const signOut = useAuthStore((state) => state.signOut);
  const start = useOnboardingStore((state) => state.start);

  useEffect(() => {
    if (userId) start(userId);
  }, [userId, start]);

  return (
    <OnboardingFrame
      primary={{ label: 'Começar', onPress: () => router.push(ROUTES.ONBOARDING.GOAL) }}
      // A conta já existe quando o onboarding abre: "Já tenho conta" é quem criou
      // uma conta nova por engano e quer entrar na antiga.
      secondaryText={{ label: 'Já tenho conta', onPress: () => void signOut() }}
    >
      <View className="relative mt-[1.875rem] h-[20.625rem]">
        <View className="absolute left-0 right-0 top-[3.625rem] items-center">
          <Vidro className="h-[11.5rem] w-[11.5rem] items-center justify-center rounded-full">
            <Anel valor={72} meta={100} rotulo="2.150" tamanho={150} espessura={11}>
              <Text className="font-display-black text-[1.875rem] leading-[1.875rem] tracking-tight text-hero">
                2.150
              </Text>
              <Text className="mt-[0.1875rem] text-[0.65625rem] font-bold text-hero-secondary">
                kcal por dia
              </Text>
              <Text className="mt-[0.1875rem] font-mono text-[0.53125rem] font-bold uppercase tracking-[0.14em] text-placeholder">
                estimativa
              </Text>
            </Anel>
          </Vidro>
        </View>
        <Selo icone="barbell-outline" className="left-[0.375rem] top-[1.375rem]">
          Treino · 4x por semana
        </Selo>
        <Selo icone="restaurant-outline" className="right-1 top-[16.375rem]">
          Dieta · 5 refeições
        </Selo>
      </View>
      <OnboardingTitle
        eyebrow="Eleva Pro"
        large
        sub="Treino e dieta feitos para você, sem precisar conversar com ninguém."
      >
        Seu plano em 3 minutos
      </OnboardingTitle>
    </OnboardingFrame>
  );
}

function Selo({
  icone,
  className,
  children,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  className: string;
  children: string;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className={`absolute ${className}`}>
      <Vidro className="flex-row items-center gap-2 rounded-2xl px-3 py-[0.5625rem]">
        <Ionicons name={icone} size={escalar(ICONE_DO_SELO)} color={cores.primaryText} />
        <Text className="text-xs font-bold text-hero">{children}</Text>
      </Vidro>
    </View>
  );
}
