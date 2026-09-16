import { type Stimulus, summarizeTrainingLoad, type TrainingLoadSummary } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ROUTES } from '@/navigation/types';
import { ChartCard, EmptyCard } from '../components/ChartCard';
import { AreaChart } from '../components/charts/AreaChart';
import { Donut, type DonutSlice } from '../components/charts/Donut';
import { evenLabels } from '../components/charts/geometry';
import { formatLoad, loadUnit } from '../components/charts/loadFormat';
import { MuscleBars } from '../components/charts/MuscleBars';
import { PeriodChips, type PeriodWeeks } from '../components/PeriodChips';
import { ProgressHeader } from '../components/ProgressHeader';
import { ShortcutRow } from '../components/ShortcutRow';
import { judgementOf, TrendDelta } from '../components/TrendDelta';
import { useTrainingSets } from '../hooks/useTrainingSets';

/**
 * Tela 2 do kit de métricas: a evolução em números, no segmento Treino.
 *
 * Carga por semana, volume por grupo com o período anterior e estímulo pela faixa
 * de repetições, no período escolhido. Sem a meta do ciclo do kit: nada no banco a
 * guarda (#312).
 *
 * @example <TrainingSegment studentId={user.id} segments={<GlassSegmented … />} />
 */
interface TrainingSegmentProps {
  studentId: string;
  segments: ReactNode;
}

/** Cada semana do período lê duas: a dela e a do período anterior, para a variação. */
const DAYS_READ_PER_WEEK = 7 * 2;
const MAX_LABELS = 6;

const STIMULUS: Record<Stimulus, { label: string; tone: DonutSlice['tone'] }> = {
  hypertrophy: { label: 'Hipertrofia', tone: 'brand' },
  strength: { label: 'Força', tone: 'blue' },
  endurance: { label: 'Resistência', tone: 'purple' },
};

export function TrainingSegment({ studentId, segments }: TrainingSegmentProps) {
  const router = useRouter();
  const [weeks, setWeeks] = useState<PeriodWeeks>(12);
  const { sets, today, loading } = useTrainingSets(studentId, weeks * DAYS_READ_PER_WEEK);
  const load = useMemo(() => summarizeTrainingLoad(sets, today, weeks), [sets, today, weeks]);

  return (
    <>
      <ProgressHeader size="page" eyebrow="Sua evolução" title="Em números" />
      <View className="mt-4">{segments}</View>
      <PeriodChips value={weeks} onChange={setWeeks} />
      {load.total === 0 && !loading ? (
        <EmptyCard>
          Nenhuma série com carga neste período. As séries concluídas no treino aparecem aqui.
        </EmptyCard>
      ) : (
        <LoadCards load={load} weeks={weeks} />
      )}
      <View className="mt-3">
        <ShortcutRow
          icon="barbell-outline"
          title="Evolução de cargas"
          subtitle="A carga máxima de cada exercício"
          onPress={() => router.push(ROUTES.PROGRESS.LOADS)}
        />
      </View>
    </>
  );
}

function LoadCards({ load, weeks }: { load: TrainingLoadSummary; weeks: number }) {
  return (
    <>
      <WeeklyLoadCard load={load} weeks={weeks} />
      {load.byMuscle.length > 0 ? (
        <ChartCard title="Volume por grupo muscular" note="Carga × repetições no período">
          <MuscleBars data={load.byMuscle} />
        </ChartCard>
      ) : null}
      {load.stimulus.length > 0 ? (
        <ChartCard title="Distribuição dos estímulos" note="Séries pela faixa de repetições">
          <Donut
            unit="séries"
            slices={load.stimulus.map((item) => ({ ...STIMULUS[item.kind], value: item.sets }))}
          />
        </ChartCard>
      ) : null}
    </>
  );
}

function WeeklyLoadCard({ load, weeks }: { load: TrainingLoadSummary; weeks: number }) {
  const unit = loadUnit(Math.max(...load.weekly.map((week) => week.kilograms), load.total));
  return (
    <ChartCard title="Carga total levantada" note="Soma de carga × repetições por semana">
      <View className="mb-2.5 flex-row items-baseline gap-2">
        <Text className="font-display-black text-[1.875rem] tracking-tight text-foreground">
          {formatLoad(load.total, unit)}
        </Text>
        {load.deltaPercent === null ? null : (
          <TrendDelta
            value={load.deltaPercent}
            unit="% vs. anterior"
            judgement={judgementOf(load.deltaPercent)}
          />
        )}
      </View>
      <AreaChart
        values={load.weekly.map((week) => week.kilograms)}
        tone="brand"
        labels={evenLabels(
          load.weekly.map((_, index) => `S${index + 1}`),
          MAX_LABELS
        )}
        format={(kilograms) => formatLoad(kilograms, unit, false)}
        suffix={` ${unit}`}
        accessibilityLabel={`Carga por semana nas últimas ${weeks} semanas, total ${formatLoad(load.total, unit)}`}
      />
    </ChartCard>
  );
}
