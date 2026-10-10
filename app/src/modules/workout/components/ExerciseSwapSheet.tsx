import type { Exercise, WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { type SwapMode, useExerciseSwap } from '../hooks/useExerciseSwap';
import { useTodaySwapsStore } from '../store/todaySwapsStore';

interface ModeOption {
  mode: SwapMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const MODES: readonly ModeOption[] = [
  { mode: 'today', icon: 'calendar-outline', label: 'Trocar só hoje' },
  { mode: 'always', icon: 'repeat', label: 'Trocar sempre' },
  { mode: 'less', icon: 'thumbs-down-outline', label: 'Recomendar menos' },
];

const VENUE: Record<string, string> = {
  casa: 'Em casa',
  academia: 'Academia',
  ambos: 'Casa ou academia',
};

const BOTTOM_GAP = 40;

interface ExerciseSwapSheetProps {
  /** O exercício aberto; `null` fecha a folha. */
  item: WorkoutExercise | null;
  workoutId: string;
  studentId: string;
  /**
   * Treino sem especialista, do próprio Praticante: troca de vez e "recomendar
   * menos". O Aluno troca só hoje; a prescrição é do especialista.
   */
  selfGuided: boolean;
  /** Depois da troca, para quem está com o treino aberto mostrar o novo exercício. */
  onSwapped: (item: WorkoutExercise, exercise: Exercise) => void;
  onClose: () => void;
}

/**
 * A folha "Trocar exercício" (desenho 6d): como a troca vale e três
 * alternativas do mesmo músculo, que dê para fazer onde a pessoa treina.
 *
 * @example
 * <ExerciseSwapSheet item={aberto} workoutId={treino.id} studentId={alunoId} selfGuided onSwapped={aplicar} onClose={fechar} />
 */
export function ExerciseSwapSheet(props: ExerciseSwapSheetProps) {
  const { item, studentId, selfGuided, onClose } = props;
  const insets = useSafeAreaInsets();
  const escalar = useEscala();
  const swap = useExerciseSwap(item, studentId);
  const [mode, setMode] = useState<SwapMode>('today');
  const [saving, setSaving] = useState(false);
  const swapToday = useTodaySwapsStore((state) => state.swapToday);

  useEffect(() => {
    if (item) setMode('today');
  }, [item]);

  if (!item) return null;

  const choose = async (exercise: Exercise) => {
    setSaving(true);
    try {
      await swap.persist(mode, item, exercise);
      swapToday(props.workoutId, item.id, exercise);
      props.onSwapped(item, exercise);
      onClose();
    } catch {
      showAlert({
        type: 'error',
        title: 'Troca não salva',
        message: 'Não consegui trocar o exercício no seu plano. Confira a conexão e tente de novo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-veu-da-folha"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar sem trocar"
        />
        <View
          className="rounded-t-[1.75rem] border-t border-glass-border bg-background px-[1.125rem] pt-2.5"
          style={{ paddingBottom: insets.bottom + escalar(BOTTOM_GAP) }}
        >
          <View className="mx-auto mb-3.5 h-[0.3125rem] w-[2.375rem] rounded-full bg-placeholder" />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
              Trocar exercício
            </Text>
            <BotaoRedondo icone="x" rotulo="Fechar sem trocar" onPress={onClose} />
          </View>
          <Text numberOfLines={1} className="mt-1 text-[0.78125rem] text-muted-foreground">
            {subtitleOf(item, selfGuided)}
          </Text>
          {selfGuided ? <ModeTiles mode={mode} onChange={setMode} /> : null}
          <Alternatives {...swap} saving={saving} onChoose={(exercise) => void choose(exercise)} />
        </View>
      </View>
    </Modal>
  );
}

/** "Remada curvada · 4 × 8–10"; o Aluno lê também que a troca é só de hoje. */
function subtitleOf(item: WorkoutExercise, selfGuided: boolean): string {
  const name = item.exercise?.name ?? 'Exercício';
  const prescription = item.sets ? ` · ${item.sets} × ${item.reps ?? '—'}` : '';
  return selfGuided ? `${name}${prescription}` : `${name}${prescription} · só no treino de hoje`;
}

function ModeTiles({ mode, onChange }: { mode: SwapMode; onChange: (mode: SwapMode) => void }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="mt-3 flex-row gap-[0.4375rem]" accessibilityRole="radiogroup">
      {MODES.map((option) => {
        const active = option.mode === mode;
        return (
          <TouchableOpacity
            key={option.mode}
            onPress={() => onChange(option.mode)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={cn(
              'flex-1 items-center rounded-[0.875rem] px-1.5 py-2.5',
              active
                ? 'border-[0.09375rem] border-primary bg-primary/15'
                : 'border border-glass-border bg-glass-strong'
            )}
          >
            <Ionicons
              name={active ? 'checkmark-circle-outline' : option.icon}
              size={escalar(17)}
              color={active ? cores.primaryText : cores.mutedForeground}
            />
            <Text className="mt-1.5 text-center text-[0.71875rem] font-bold leading-tight text-foreground">
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface AlternativesProps {
  alternatives: Exercise[];
  context: { atHome: boolean | null } | null;
  loading: boolean;
  failed: boolean;
  saving: boolean;
  onChoose: (exercise: Exercise) => void;
}

function Alternatives({
  alternatives,
  context,
  loading,
  failed,
  saving,
  onChoose,
}: AlternativesProps) {
  const place =
    context?.atHome === true ? 'em casa' : context?.atHome === false ? 'na academia' : '';
  return (
    <View className="mt-4">
      <View className="mx-0.5 mb-1.5 flex-row justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
          Alternativas
        </Text>
        {place ? <Text className="text-[0.71875rem] text-muted-foreground">{place}</Text> : null}
      </View>
      {loading || saving ? <ActivityIndicator className="py-6" /> : null}
      {failed ? (
        <EmptyNote text="Não consegui buscar as alternativas. Feche e tente de novo." />
      ) : null}
      {!loading && !failed && !saving && alternatives.length === 0 ? (
        <EmptyNote text="Nenhuma alternativa do mesmo músculo para onde você treina." />
      ) : null}
      {!loading && !saving
        ? alternatives.map((exercise, index) => (
            <AlternativeRow
              key={exercise.id}
              exercise={exercise}
              first={index === 0}
              onPress={() => onChoose(exercise)}
            />
          ))
        : null}
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <Text className="py-4 text-[0.78125rem] text-muted-foreground">{text}</Text>;
}

interface AlternativeRowProps {
  exercise: Exercise;
  first: boolean;
  onPress: () => void;
}

function AlternativeRow({ exercise, first, onPress }: AlternativeRowProps) {
  const cores = useCores();
  const escalar = useEscala();
  const venue = VENUE[exercise.venue] ?? '';
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trocar por ${exercise.name}`}
      className={cn(
        'flex-row items-center gap-3 py-[0.6875rem]',
        !first && 'border-t border-glass-border'
      )}
    >
      <View className="h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.6875rem] bg-glass-strong">
        <Ionicons name="barbell-outline" size={escalar(17)} color={cores.foreground} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[0.875rem] font-bold text-foreground">
          {exercise.name}
        </Text>
        <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">
          {venue ? `${venue} · mesmo músculo` : 'Mesmo músculo'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={escalar(16)} color={cores.placeholder} />
    </TouchableOpacity>
  );
}
