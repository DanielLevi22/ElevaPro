import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import {
  CONSENT_REFUSAL_NOTE,
  HealthConsentDetails,
} from '@/components/consent/HealthConsentDetails';
import { showAlert } from '@/components/ui/appAlert';
import { LockHero } from '@/components/ui/LockHero';
import { Pedestal } from '@/components/ui/Pedestal';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { hasCurrentHealthConsent } from '../services/consentStep';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * O aceite de saúde, entre O3 e O4: daqui em diante o onboarding coleta peso,
 * altura e a triagem, e o banco recusa gravar a anamnese sem ele (0083).
 *
 * É etapa do fluxo, e não a folha da porta, para a pessoa saber para que o dado
 * serve no momento em que decide (Art. 8°). Quem já aceitou a versão vigente
 * passa direto.
 *
 * @example <ConsentScreen />
 */
export function ConsentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const declineConsent = useOnboardingStore((state) => state.declineConsent);
  const [saving, setSaving] = useState(false);
  // Quem chega pela retomada pode já ter aceitado: até saber, a tela não mostra
  // o texto, senão ele pisca antes de pular (o O3 já pergunta antes de abrir).
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) return;
    hasCurrentHealthConsent(userId).then((consented) => {
      if (consented) seguirComOAceite(router);
      else setChecking(false);
    });
  }, [userId, router]);

  async function aceitar() {
    if (!userId) return;
    setSaving(true);
    try {
      await createHealthService(supabase).grantCollectionConsent(userId);
      // As autorizações do perfil mostram o aceite: sem invalidar, diriam "pendente".
      await queryClient.invalidateQueries({ queryKey: ['consentStatus'] });
      seguirComOAceite(router);
    } catch {
      // Sem o erro: o do PostgREST pode trazer o payload do consentimento.
      registrarFalha('onboarding.registrar_consentimento');
      showAlert({
        title: 'Não foi possível registrar',
        message: 'Confira sua conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function recusar() {
    declineConsent();
    // Provisório até O6 existir: quem recusa segue só com treino, a partir de O6.
    router.replace(ROUTES.TABS.ROOT);
  }

  if (checking) return null;

  return (
    <OnboardingFrame
      step={2}
      primary={{
        label: saving ? 'Registrando…' : 'Aceitar e continuar',
        icon: 'checkmark',
        onPress: () => void aceitar(),
        disabled: saving,
      }}
      secondaryText={{ label: 'Agora não, seguir só com treino', onPress: recusar }}
    >
      <View className="mt-6 items-center">
        <Pedestal size={104} lift={4}>
          <LockHero scale={0.56} />
        </Pedestal>
      </View>
      <OnboardingTitle sub="As próximas perguntas são sobre o seu corpo e a sua saúde. Antes, leia o que guardamos, o que o app decide e quem lê.">
        Seus dados de saúde
      </OnboardingTitle>
      <HealthConsentDetails hasSpecialist={false} />
      <Text className="mt-4 text-[0.71875rem] leading-[1.08rem] text-muted-foreground">
        {CONSENT_REFUSAL_NOTE}
      </Text>
    </OnboardingFrame>
  );
}

function seguirComOAceite(router: ReturnType<typeof useRouter>) {
  router.replace(ROUTES.ONBOARDING.ABOUT);
}
