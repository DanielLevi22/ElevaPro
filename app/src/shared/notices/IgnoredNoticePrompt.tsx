import { useRouter } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { ROUTES } from '@/navigation/types';
import {
  IGNORED_TO_ASK,
  type IgnoredCount,
  type NoticeRefKey,
  refOf,
  useNoticeChoicesStore,
} from './noticeChoicesStore';
import { useNoticePreferencesStore } from './noticePreferencesStore';

/**
 * E6 · O aviso ignorado 3 vezes seguidas: em vez de insistir, o app pergunta.
 * Outro horário empurra a refeição uma hora (o treino vai para Avisos, onde
 * se fixa o horário), parar tira o aviso, e deixar zera a conta.
 *
 * @example <IgnoredNoticePrompt />
 */
export function IgnoredNoticePrompt() {
  const router = useRouter();
  const ignored = useNoticeChoicesStore((state) => state.ignored);
  const resolveIgnored = useNoticeChoicesStore((state) => state.resolveIgnored);
  const update = useNoticePreferencesStore((state) => state.update);
  const asking = (Object.entries(ignored) as [NoticeRefKey, IgnoredCount][]).find(
    ([, item]) => item.count >= IGNORED_TO_ASK
  );
  if (!asking) return null;
  const [refKey, { label }] = asking;
  const isWorkout = refOf(refKey).kind === 'workout';

  const later = () => {
    resolveIgnored(refKey, isWorkout ? 'keep' : 'later');
    if (isWorkout) router.push(ROUTES.SETTINGS.NOTICES);
  };
  const mute = () => {
    resolveIgnored(refKey, 'mute');
    if (isWorkout) update({ workout: false });
  };

  return (
    <GlassSheet
      visible
      onClose={() => resolveIgnored(refKey, 'keep')}
      primary={{ label: isWorkout ? 'Mudar o horário' : 'Uma hora mais tarde', onPress: later }}
      secondary={{ label: 'Parar este aviso', onPress: mute }}
    >
      <Text className="text-center font-display-black text-[1.375rem] tracking-tight text-hero">
        {`Mudar o aviso do ${label.toLocaleLowerCase('pt-BR')}?`}
      </Text>
      <Text className="mt-2 text-center text-[0.875rem] text-hero-secondary">
        Ele tocou três vezes sem resposta. Talvez o horário não combine com o seu dia.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => resolveIgnored(refKey, 'keep')}
        className="mt-3 items-center py-2"
      >
        <Text className="text-[0.875rem] font-bold text-primary">Deixar como está</Text>
      </TouchableOpacity>
    </GlassSheet>
  );
}
