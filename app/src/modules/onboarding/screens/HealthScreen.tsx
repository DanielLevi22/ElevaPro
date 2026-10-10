import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { ChipMulti } from '@/components/ui/ChipMulti';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { saveOnboardingAnswers } from '../services/onboardingAnswers';
import {
  HEALTH_CONDITIONS,
  type HealthCondition,
  type ScreeningAnswer,
  screen,
  screeningRecord,
  toggleCondition,
} from '../services/screening';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * O5 · Sua saúde (3 de 5): a triagem. Obrigatória, com "Prefiro não informar";
 * não tem "Pular" (#365).
 *
 * As condições marcadas ficam só nesta tela: o que vai ao servidor é o resultado
 * (`screeningRecord`, ADR-0044).
 *
 * @example <HealthScreen />
 */
export function HealthScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const setDietAllowed = useOnboardingStore((state) => state.setDietAllowed);
  const [selected, setSelected] = useState<HealthCondition[]>([]);
  const [saving, setSaving] = useState(false);

  async function concluir(answer: ScreeningAnswer) {
    if (!userId) return;
    setSaving(true);
    try {
      await saveOnboardingAnswers(userId, screeningRecord(answer));
      const result = screen(answer);
      setDietAllowed(result.diet === 'allowed');
      if (result.diet === 'allowed') router.push(ROUTES.ONBOARDING.TRAINING);
      else {
        const injury = answer.kind === 'answered' && answer.conditions.includes('injury');
        router.push({
          pathname: ROUTES.ONBOARDING.SCREENING,
          params: { reason: result.reason, injury: injury ? '1' : '0' },
        });
      }
    } catch {
      registrarFalha('onboarding.salvar_triagem');
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
      step={3}
      primary={{
        label: saving ? 'Salvando…' : 'Continuar',
        onPress: () => void concluir({ kind: 'answered', conditions: selected }),
        disabled: selected.length === 0 || saving,
        hint: 'Marque uma opção, ou "Nenhum"',
      }}
      secondaryText={{
        label: 'Prefiro não informar',
        onPress: () => void concluir({ kind: 'declined' }),
      }}
    >
      <OnboardingTitle sub="Marque quantos quiser.">Algum destes se aplica a você?</OnboardingTitle>
      <View className="mt-[1.375rem] flex-row flex-wrap gap-2">
        {HEALTH_CONDITIONS.map((condition) => (
          <ChipMulti
            key={condition.id}
            rotulo={condition.label}
            marcado={selected.includes(condition.id)}
            onPress={() => setSelected((atual) => toggleCondition(atual, condition.id))}
          />
        ))}
      </View>
      <Vidro classeExterna="mt-[1.375rem]" className="flex-row items-center gap-3 p-3.5">
        <CaixaDeIcone icon="shield-checkmark-outline" tom="marca" />
        <Text className="flex-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          <Text className="font-bold text-hero">Isso nos ajuda a montar um plano seguro. </Text>
          Fica só entre você e o app.
        </Text>
      </Vidro>
    </OnboardingFrame>
  );
}
