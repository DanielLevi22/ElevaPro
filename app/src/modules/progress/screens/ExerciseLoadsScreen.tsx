import {
  type ExerciseProgress,
  exerciseProgress,
  foldForSearch,
  formatarCarga,
  formatarVolume,
  shortMonthOf,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { judgementOf, TrendDelta } from '@/components/ui/TrendDelta';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { CardTitle } from '../components/CardTitle';
import { EmptyCard } from '../components/ChartCard';
import { AreaChart } from '../components/charts/AreaChart';
import { evenLabels } from '../components/charts/geometry';
import { useTrainingSets } from '../hooks/useTrainingSets';

/**
 * Tela 3 do kit de métricas: a evolução da carga de cada exercício.
 *
 * O cartão do exercício escolhido, com a curva da máxima por sessão, e a lista de
 * todos os exercícios das últimas 12 semanas. Tocar numa linha a leva ao cartão.
 * Sem o "alvo" do kit: nenhuma carga-alvo é gravada (#312).
 *
 * @example <ExerciseLoadsScreen studentId={user.id} />
 */
interface ExerciseLoadsScreenProps {
  studentId: string;
}

const WEEKS = 12;
const MAX_LABELS = 4;

export function ExerciseLoadsScreen({ studentId }: ExerciseLoadsScreenProps) {
  const router = useRouter();
  const { sets, today, loading } = useTrainingSets(studentId, WEEKS * 7);
  const exercises = useMemo(() => exerciseProgress(sets, today, WEEKS), [sets, today]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const visible = filterByName(exercises, query);
  // O cartão acompanha a busca: o escolhido fica enquanto aparece na lista filtrada.
  const selected =
    visible.find((item) => item.exerciseId === selectedId) ?? visible[0] ?? exercises[0];

  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <ProgressHeader
        size="page"
        eyebrow="Por exercício"
        title="Evolução de cargas"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={
          <BotaoRedondo
            icone="search"
            rotulo="Buscar exercício"
            onPress={() => setSearching((open) => !open)}
          />
        }
      />
      {searching ? (
        <GlassSearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar exercício…"
          className="mt-3.5"
          autoFocus
        />
      ) : null}
      {selected ? (
        <SelectedExercise exercise={selected} />
      ) : loading ? null : (
        <EmptyCard>{`Nenhum exercício com carga nas últimas ${WEEKS} semanas.`}</EmptyCard>
      )}
      {exercises.length > 0 ? (
        <TituloDeSecao estilo="rotulo" acao={`${WEEKS} semanas`}>
          Todos os exercícios
        </TituloDeSecao>
      ) : null}
      {visible.map((item) => (
        <ExerciseRow
          key={item.exerciseId}
          exercise={item}
          onPress={() => setSelectedId(item.exerciseId)}
        />
      ))}
    </GlassScreen>
  );
}

function SelectedExercise({ exercise }: { exercise: ExerciseProgress }) {
  return (
    <Vidro classeExterna="mt-3.5" className="p-4">
      <CardTitle note="Carga máxima por sessão">{exercise.name}</CardTitle>
      <View className="mb-2.5 flex-row items-baseline gap-2">
        <Text className="font-display-black text-[1.875rem] tracking-tight text-foreground">
          {formatarCarga(exercise.currentMax)}
        </Text>
        {exercise.deltaPercent === null ? null : (
          <TrendDelta
            value={exercise.deltaPercent}
            unit={`% em ${WEEKS} sem`}
            judgement={judgementOf(exercise.deltaPercent)}
          />
        )}
      </View>
      <MaxLoadCurve exercise={exercise} />
      <Figures exercise={exercise} />
    </Vidro>
  );
}

/** A curva da máxima por sessão; com uma sessão só, não há curva a desenhar. */
function MaxLoadCurve({ exercise }: { exercise: ExerciseProgress }) {
  if (exercise.series.length < 2) {
    return (
      <Text className="text-[0.75rem] text-placeholder">
        A curva aparece a partir da segunda sessão.
      </Text>
    );
  }
  return (
    <AreaChart
      values={exercise.series.map((point) => point.max)}
      tone="brand"
      labels={evenLabels(
        exercise.series.map((point) => shortMonthOf(point.date)),
        MAX_LABELS
      )}
      format={(kilograms) => formatarCarga(kilograms).replace(' kg', '')}
      suffix=" kg"
      accessibilityLabel={`${exercise.name}: carga máxima de ${formatarCarga(exercise.series[0].max)} para ${formatarCarga(exercise.currentMax)}`}
    />
  );
}

/** Melhor série, volume e sessões, abaixo da curva. */
function Figures({ exercise }: { exercise: ExerciseProgress }) {
  const { weight, reps } = exercise.bestSet;
  return (
    <View className="mt-3 flex-row gap-4 border-t border-glass-border pt-3">
      <Figure label="Melhor série" value={`${formatarCarga(weight)}${reps ? ` × ${reps}` : ''}`} />
      <Figure label="Volume" value={formatarVolume(exercise.volume)} />
      <Figure label="Sessões" value={String(exercise.sessions)} />
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[0.59375rem] font-bold uppercase tracking-[0.1em] text-placeholder">
        {label}
      </Text>
      <Text className="mt-[0.1875rem] text-[0.84375rem] font-bold text-foreground">{value}</Text>
    </View>
  );
}

const ROW_ICON_SIZE = 16;

function ExerciseRow({ exercise, onPress }: { exercise: ExerciseProgress; onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const falling = (exercise.deltaPercent ?? 0) < 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      className="mb-[0.5625rem]"
    >
      <Vidro className="flex-row items-center gap-3 p-[0.8125rem]">
        <View className="h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.6875rem] bg-glass-strong">
          <Ionicons
            name="barbell"
            size={escalar(ROW_ICON_SIZE)}
            color={falling ? cores.textoBatimento : cores.primaryText}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[0.84375rem] font-semibold text-foreground">
            {exercise.name}
          </Text>
          <Text className="mt-px text-[0.71875rem] text-muted-foreground">{`Máxima atual · ${formatarCarga(exercise.currentMax)}`}</Text>
        </View>
        {exercise.deltaPercent === null ? null : (
          <TrendDelta
            value={exercise.deltaPercent}
            unit="%"
            judgement={judgementOf(exercise.deltaPercent)}
          />
        )}
      </Vidro>
    </TouchableOpacity>
  );
}

/** Sem acento e sem caixa: "supino" acha "Supino Reto". */
function filterByName(exercises: ExerciseProgress[], query: string): ExerciseProgress[] {
  const wanted = foldForSearch(query);
  if (!wanted) return exercises;
  return exercises.filter((item) => foldForSearch(item.name).includes(wanted));
}
