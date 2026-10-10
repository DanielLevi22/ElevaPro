import { createAdaptiveAnamnesisService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { LEVEL_OPTIONS } from '../services/onboardingOptions';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * O3 · Nível (2 de 5). O nível vai para `profiles.persona_track`, onde a
 * anamnese adaptativa já o lê: não é dado de saúde e não espera o aceite.
 *
 * @example <LevelScreen />
 */
export function LevelScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const track = useOnboardingStore((state) => state.track);
  const chooseTrack = useOnboardingStore((state) => state.chooseTrack);
  const [saving, setSaving] = useState(false);

  async function continuar() {
    if (!userId || !track) return;
    setSaving(true);
    try {
      await createAdaptiveAnamnesisService(supabase).savePersonaTrack(userId, track);
      // Provisório até o consentimento e O4 existirem: a anamnese adaptativa
      // atual recebe o nível e conclui a anamnese, o que tira a pessoa do guarda.
      router.push(ROUTES.ASSESSMENT.ANAMNESIS);
    } catch {
      registrarFalha('onboarding.salvar_nivel');
      showAlert({
        title: 'Não foi possível salvar',
        message: 'Confira sua conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingFrame
      step={2}
      primary={{
        label: saving ? 'Salvando…' : 'Continuar',
        onPress: () => void continuar(),
        disabled: track === null || saving,
        hint: track === null ? 'Escolha um nível para continuar' : undefined,
      }}
    >
      <OnboardingTitle sub="Isso define o volume e a dificuldade do treino.">
        Como você se descreveria?
      </OnboardingTitle>
      <View className="mt-[1.375rem]" accessibilityRole="radiogroup">
        {LEVEL_OPTIONS.map((option) => (
          <GlassChoice
            key={option.track}
            icon={option.icon}
            title={option.label}
            sub={option.detail}
            active={track === option.track}
            onPress={() => chooseTrack(option.track)}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
