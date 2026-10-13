import { type CheckInLogging, diaPorExtenso } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { ChipPick } from '@/components/ui/ChipPick';
import { Field } from '@/components/ui/Field';
import { FlowFrame, FlowLabel, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { useCheckInActions, useHasSpecialist } from '../hooks/useWeeklyCheckIn';
import { LOGGING_OPTIONS, validateCheckIn } from '../validation';

/**
 * A4 · Sua semana: como foi o registro e o peso de hoje, em um minuto.
 *
 * O Aluno não informa peso: com especialista, quem mede é ele (ADR-0030), e o
 * check-in vai para o briefing dele.
 *
 * @example <WeeklyCheckInScreen />
 */
export function WeeklyCheckInScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const hasSpecialist = useHasSpecialist(userId);
  const { submit } = useCheckInActions();
  const [logging, setLogging] = useState<CheckInLogging | null>(null);
  const [weight, setWeight] = useState('');
  const withWeight = hasSpecialist.data === false;
  const result = validateCheckIn({ logging, weight }, withWeight ? 'withWeight' : 'withoutWeight');

  async function send() {
    if (result.status !== 'ready') return;
    try {
      await submit.mutateAsync({ logging: result.logging, weightKg: result.weightKg });
      router.replace(ROUTES.CHECKIN.RESULT);
    } catch {
      registrarFalha('checkin.submit');
      showAlert({
        title: 'Não foi possível enviar',
        message: 'Suas respostas continuam aqui. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  return (
    <FlowFrame
      header={{ right: <NotNow onPress={router.back} /> }}
      primary={{
        label: submit.isPending ? 'Enviando…' : withWeight ? 'Ver meu ajuste' : 'Enviar check-in',
        onPress: () => void send(),
        disabled: result.status !== 'ready' || submit.isPending || hasSpecialist.isLoading,
        hint: result.status === 'ready' ? undefined : result.hint,
      }}
    >
      <FlowTitle eyebrow={diaPorExtenso(new Date())} sub="1 minuto para ajustar seu plano.">
        Sua semana
      </FlowTitle>
      <FlowLabel>Como foi o registro?</FlowLabel>
      <View className="gap-[0.4375rem]">
        {LOGGING_OPTIONS.map((option) => (
          <View key={option.value} className="flex-row">
            <ChipPick
              label={option.label}
              selected={logging === option.value}
              onPress={() => setLogging(option.value)}
            />
          </View>
        ))}
      </View>
      {withWeight ? (
        <View className="mt-5">
          <Field
            label="Seu peso hoje"
            value={weight}
            onChange={setWeight}
            unit="kg"
            numeric
            error={result.status === 'invalid' ? result.error : undefined}
          />
          {result.status === 'invalid' ? null : (
            <InfoNote icon="information-circle-outline" className="mt-[0.5625rem]">
              De manhã, em jejum, depois do banheiro. Uma vez por semana basta.
            </InfoNote>
          )}
        </View>
      ) : null}
    </FlowFrame>
  );
}

function NotNow({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" className="mt-4">
      <Text className="text-xs font-semibold text-hero-secondary">Agora não</Text>
    </TouchableOpacity>
  );
}
