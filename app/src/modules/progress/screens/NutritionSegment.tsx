import { type NutritionPeriod, type Trend, withThousands } from '@elevapro/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ColumnChart } from '@/components/ui/charts/ColumnChart';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { trendDelta } from '@/components/ui/TrendDelta';
import { useNutritionNumbers } from '@/hooks/useNutritionNumbers';
import { ChartCard, EmptyCard } from '../components/ChartCard';
import { AreaChart } from '../components/charts/AreaChart';
import { Donut } from '../components/charts/Donut';
import { HubBackButton } from '../components/HubBackButton';
import { TrendStat } from '../components/TrendStat';

/**
 * Tela 7 do kit de métricas: a nutrição em números, no segmento Nutrição.
 *
 * Aderência, média de calorias e de proteína das últimas 12 semanas contra as 12
 * anteriores, a aderência por semana, as calorias contra a meta do plano e os
 * macros médios. Calorias e proteína ficam sem cor de bom ou ruim: comer menos é o
 * objetivo de quem emagrece e o contrário de quem ganha massa (#312).
 *
 * @example <NutritionSegment studentId={user.id} segments={<GlassSegmented … />} />
 */
interface NutritionSegmentProps {
  studentId: string;
  segments: ReactNode;
}

const ADHERENCE_GOAL = 90;

export function NutritionSegment({ studentId, segments }: NutritionSegmentProps) {
  const { period, dailyGoal, loading } = useNutritionNumbers(studentId);
  const empty = !loading && period.adherence.value === null && period.calories.value === null;

  return (
    <>
      <ProgressHeader
        size="nutrition"
        eyebrow="Últimas 12 semanas"
        title="Nutrição em números"
        leading={<HubBackButton />}
      />
      <View className="mt-3.5">{segments}</View>
      <NutritionStats period={period} />
      {empty ? (
        <EmptyCard>Sem plano alimentar ou refeição registrada nas últimas 12 semanas.</EmptyCard>
      ) : (
        <>
          <AdherenceCard weekly={period.weeklyAdherence} />
          <CaloriesCard weekly={period.weeklyCalories} goal={dailyGoal} />
          <MacrosCard macros={period.macros} />
        </>
      )}
    </>
  );
}

function NutritionStats({ period }: { period: NutritionPeriod }) {
  const { adherence, calories, protein } = period;
  return (
    <View className="mt-3 flex-row gap-2.5">
      <TrendStat
        icon="locate"
        tone="green"
        label="Aderência"
        {...displayOf(adherence, '%')}
        spark={adherence.spark}
        delta={trendDelta(adherence, 'pts')}
      />
      <TrendStat
        icon="flame"
        tone="amber"
        label="Média kcal"
        {...displayOf(calories)}
        spark={calories.spark}
        delta={trendDelta(calories, 'kcal', false)}
      />
      <TrendStat
        icon="nutrition"
        tone="brand"
        label="Proteína"
        {...displayOf(protein, 'g')}
        spark={protein.spark}
        delta={trendDelta(protein, 'g', false)}
      />
    </View>
  );
}

function AdherenceCard({ weekly }: { weekly: (number | null)[] }) {
  const described = weekly.map((value) => (value === null ? 'sem plano' : `${value}%`)).join(', ');
  return (
    <ChartCard title="Aderência por semana" note="% das refeições marcadas como feitas">
      <ColumnChart
        values={weekly}
        labels={weekly.map((_, index) => `S${index + 1}`)}
        tone="green"
        format={(value) => `${value}%`}
        goal={ADHERENCE_GOAL}
        accessibilityLabel={`Aderência das últimas 12 semanas: ${described}`}
      />
    </ChartCard>
  );
}

/** A curva liga as semanas com registro; semana vazia não vira um tombo a zero. */
function CaloriesCard({ weekly, goal }: { weekly: (number | null)[]; goal: number | null }) {
  const known = weekly.flatMap((value, index) =>
    value === null ? [] : [{ value, week: index + 1 }]
  );
  if (known.length < 2) return null;
  const [first, last] = [known[0], known[known.length - 1]];
  return (
    <ChartCard
      title="Calorias"
      note={
        goal ? 'Média diária de cada semana, contra a meta do plano' : 'Média diária de cada semana'
      }
    >
      <AreaChart
        values={known.map((item) => item.value)}
        tone="amber"
        labels={[`S${first.week}`, `S${last.week}`]}
        format={(value) => withThousands(Math.round(value))}
        goal={goal ? { value: goal, label: 'meta diária' } : undefined}
        accessibilityLabel={`Calorias por dia, média de cada semana: de ${first.value} a ${last.value}`}
      />
    </ChartCard>
  );
}

function MacrosCard({ macros }: { macros: NutritionPeriod['macros'] }) {
  if (!macros) return null;
  return (
    <ChartCard title="Macros" note="Média diária dos dias com registro">
      <Donut
        unit="g / dia"
        slices={[
          { label: 'Proteína', value: macros.protein, tone: 'green' },
          { label: 'Carboidrato', value: macros.carbs, tone: 'brand' },
          { label: 'Gordura', value: macros.fat, tone: 'amber' },
        ]}
      />
    </ChartCard>
  );
}

/** O valor com milhar e a unidade, ou "—" sem dado: zero kcal leria como jejum. */
function displayOf(trend: Trend, unit?: string): { value: string; unit?: string } {
  if (trend.value === null) return { value: '—' };
  return { value: withThousands(trend.value), unit };
}
