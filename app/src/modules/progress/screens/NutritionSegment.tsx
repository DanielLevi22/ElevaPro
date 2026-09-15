import { type PeriodNumber, withThousands } from '@elevapro/shared';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useNutritionNumbers } from '@/hooks/useNutritionNumbers';
import { CardTitle } from '../components/CardTitle';
import { AreaChart } from '../components/charts/AreaChart';
import { ColumnChart } from '../components/charts/ColumnChart';
import { Donut } from '../components/charts/Donut';
import { ProgressHeader } from '../components/ProgressHeader';
import { judgementOf, TrendDelta } from '../components/TrendDelta';
import { TrendStat } from '../components/TrendStat';

/**
 * Tela 7 do kit de métricas: a nutrição em números, no segmento Nutrição.
 *
 * Aderência, média de calorias e de proteína das últimas 12 semanas contra as 12
 * anteriores, a aderência por semana, as calorias contra a meta do plano e os
 * macros médios. Calorias e proteína ficam sem cor de bom ou ruim: comer menos é
 * o objetivo de quem emagrece e o contrário de quem ganha massa (#312).
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
      <ProgressHeader size="nutrition" eyebrow="Últimas 12 semanas" title="Nutrição em números" />
      <View className="mt-3.5">{segments}</View>
      <View className="mt-3 flex-row gap-2.5">
        <TrendStat
          icon="locate"
          tone="green"
          label="Aderência"
          {...displayOf(period.adherence, '%')}
          spark={period.adherence.spark}
          delta={deltaOf(period.adherence, 'pts', true)}
        />
        <TrendStat
          icon="flame"
          tone="amber"
          label="Média kcal"
          {...displayOf(period.calories)}
          spark={period.calories.spark}
          delta={deltaOf(period.calories, 'kcal', false)}
        />
        <TrendStat
          icon="nutrition"
          tone="brand"
          label="Proteína"
          {...displayOf(period.protein, 'g')}
          spark={period.protein.spark}
          delta={deltaOf(period.protein, 'g', false)}
        />
      </View>
      {empty ? (
        <Vidro classeExterna="mt-3" className="items-center p-6">
          <Text className="text-center text-[0.8125rem] text-muted-foreground">
            Sem plano alimentar ou refeição registrada nas últimas 12 semanas.
          </Text>
        </Vidro>
      ) : (
        <>
          <Vidro classeExterna="mt-3" className="p-4">
            <CardTitle note="% das refeições marcadas como feitas">Aderência por semana</CardTitle>
            <ColumnChart
              values={period.weeklyAdherence}
              labels={period.weeklyAdherence.map((_, index) => `S${index + 1}`)}
              tone="green"
              format={(value) => `${value}%`}
              goal={ADHERENCE_GOAL}
              accessibilityLabel={`Aderência das últimas 8 semanas: ${period.weeklyAdherence.map((value) => (value === null ? 'sem plano' : `${value}%`)).join(', ')}`}
            />
          </Vidro>
          <CaloriesCard weekly={period.weeklyCalories} goal={dailyGoal} />
          {period.macros ? (
            <Vidro classeExterna="mt-3" className="p-4">
              <CardTitle note="Média diária dos dias com registro">Macros</CardTitle>
              <Donut
                unit="g / dia"
                slices={[
                  { label: 'Proteína', value: period.macros.protein, tone: 'green' },
                  { label: 'Carboidrato', value: period.macros.carbs, tone: 'brand' },
                  { label: 'Gordura', value: period.macros.fat, tone: 'amber' },
                ]}
              />
            </Vidro>
          ) : null}
        </>
      )}
    </>
  );
}

function CaloriesCard({ weekly, goal }: { weekly: (number | null)[]; goal: number | null }) {
  // A curva liga as semanas com registro; semana vazia não vira um tombo a zero.
  const known = weekly.flatMap((value, index) =>
    value === null ? [] : [{ value, week: index + 1 }]
  );
  if (known.length < 2) return null;
  return (
    <Vidro classeExterna="mt-3" className="p-4">
      <CardTitle
        note={
          goal
            ? 'Média diária de cada semana, contra a meta do plano'
            : 'Média diária de cada semana'
        }
      >
        Calorias
      </CardTitle>
      <AreaChart
        series={[{ values: known.map((item) => item.value), tone: 'amber' }]}
        labels={[`S${known[0].week}`, `S${known[known.length - 1].week}`]}
        format={(value) => String(Math.round(value))}
        goal={goal ? { value: goal, label: 'meta diária' } : undefined}
        accessibilityLabel={`Calorias por dia, média de cada semana: de ${known[0].value} a ${known[known.length - 1].value}`}
      />
    </Vidro>
  );
}

function displayOf(number: PeriodNumber, unit?: string): { value: string; unit?: string } {
  if (number.value === null) return { value: '—' };
  return { value: withThousands(number.value), unit };
}

/** Aderência tem direção boa; calorias e proteína dependem do objetivo e ficam neutras. */
function deltaOf(number: PeriodNumber, unit: string, judged: boolean) {
  if (number.delta === null) return undefined;
  return (
    <TrendDelta
      value={number.delta}
      unit={unit}
      judgement={judged ? judgementOf(number.delta) : 'neutral'}
    />
  );
}
