import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { ChipPick } from '@/components/ui/ChipPick';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { InfoNote } from '@/components/ui/InfoNote';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { useRestActions } from '@/hooks/useRestPeriods';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { REST_DURATIONS, type RestDuration, restUntil } from '../services/restCopy';

/**
 * O motivo só muda o texto da tela, e não é gravado: "doente" e "machucada"
 * são dado de saúde que a pausa não precisa (0092).
 */
const REASONS = [
  {
    key: 'sick',
    icon: 'thermometer-outline',
    title: 'Estou doente',
    note: 'Melhoras. O plano espera você.',
  },
  {
    key: 'hurt',
    icon: 'bandage-outline',
    title: 'Tive uma lesão',
    note: 'Cuide disso. Se a dor ficar, troque o plano pelo "…" da aba Treinos.',
  },
  {
    key: 'busy',
    icon: 'airplane-outline',
    title: 'Viagem ou rotina corrida',
    note: 'Boa viagem. A gente segura sua sequência.',
  },
] as const;

/** O que a pausa segura de fato: a sequência não quebra e o check-in não fica devido. */
const PAUSED = ['Sequência', 'Check-in da semana'];

/**
 * A8 · Modo Descanso: o motivo e até quando. Pausa a sequência e o check-in;
 * nada se perde, e a volta é pelo início, a qualquer hora.
 *
 * @example <RestModeScreen />
 */
export function RestModeScreen() {
  const router = useRouter();
  const { start } = useRestActions();
  const [reason, setReason] = useState<(typeof REASONS)[number]['key'] | null>(null);
  const [duration, setDuration] = useState<RestDuration>('1w');
  const note = REASONS.find((option) => option.key === reason)?.note;

  async function pause() {
    try {
      await start.mutateAsync(restUntil(duration, localDateKey()));
      router.replace(ROUTES.TABS.ROOT);
      showAlert({
        title: 'Modo Descanso ligado',
        message: note ?? 'O plano espera você.',
        type: 'success',
      });
    } catch {
      registrarFalha('rest.start');
      showAlert({
        title: 'Não foi possível pausar',
        message: 'Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  return (
    <FlowFrame
      header={{}}
      primary={{
        label: 'Pausar plano',
        icon: 'pause',
        onPress: () => void pause(),
        disabled: !reason || start.isPending,
        hint: 'Escolha o motivo',
      }}
    >
      <FlowTitle sub="A sequência e o check-in ficam pausados. Nada se perde.">
        Modo Descanso
      </FlowTitle>
      <TituloDeSecao estilo="rotulo">Motivo</TituloDeSecao>
      <View className="gap-2">
        {REASONS.map((option) => (
          <GlassChoice
            key={option.key}
            icon={option.icon}
            title={option.title}
            active={reason === option.key}
            onPress={() => setReason(option.key)}
          />
        ))}
      </View>
      <TituloDeSecao estilo="rotulo">Até quando</TituloDeSecao>
      <View className="flex-row gap-[0.4375rem]">
        {REST_DURATIONS.map((option) => (
          <ChipPick
            key={option.key}
            label={option.label}
            selected={duration === option.key}
            onPress={() => setDuration(option.key)}
          />
        ))}
      </View>
      <TituloDeSecao estilo="rotulo">Fica pausado</TituloDeSecao>
      <View className="flex-row flex-wrap gap-2">
        {PAUSED.map((item) => (
          <View key={item} className="h-8 justify-center rounded-full bg-glass-strong px-3">
            <Text className="text-xs font-semibold text-foreground">{item}</Text>
          </View>
        ))}
      </View>
      <InfoNote icon="lock-closed-outline" className="mt-4">
        O motivo não fica guardado: ele só serve para esta tela.
      </InfoNote>
    </FlowFrame>
  );
}
