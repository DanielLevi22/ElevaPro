import { consistencyWeeks, type ProgressSummary, summarizeProgress } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import type { DailyActivityState } from '@/hooks/useDailyActivity';
import { ROUTES } from '@/navigation/types';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { ProgressHeader } from '../components/ProgressHeader';
import { ShortcutRow } from '../components/ShortcutRow';
import { StreakCard } from '../components/StreakCard';
import { trendDelta } from '../components/TrendDelta';
import { TrendStat } from '../components/TrendStat';

/**
 * Tela 1 do kit de métricas: o hub de Progresso, no segmento Geral.
 *
 * A sequência, os três números dos últimos 30 dias contra os 30 anteriores, o
 * heatmap de 13 semanas e os atalhos. Tudo sai da atividade real (#312): sessões
 * concluídas e refeições registradas contra o plano do dia.
 *
 * @example <OverviewSegment activity={activity} segments={<GlassSegmented … />} onOpenTraining={…} />
 */
interface OverviewSegmentProps {
  activity: DailyActivityState;
  segments: ReactNode;
  onOpenTraining: () => void;
}

export function OverviewSegment({ activity, segments, onOpenTraining }: OverviewSegmentProps) {
  const { days, today, streak } = activity;
  const summary = useMemo(() => summarizeProgress(days, today), [days, today]);
  const weeks = useMemo(() => consistencyWeeks(days, today), [days, today]);

  return (
    <>
      <ProgressHeader size="segment" eyebrow="Últimos 30 dias" title="Seu progresso" />
      <View className="mt-4">{segments}</View>
      <StreakCard standing={streak} />
      <SummaryStats summary={summary} />
      <TituloDeSecao estilo="rotulo" acao="13 semanas">
        Consistência
      </TituloDeSecao>
      <Vidro className="p-[0.9375rem]">
        <ConsistencyGrid weeks={weeks} />
      </Vidro>
      <Shortcuts onOpenTraining={onOpenTraining} />
    </>
  );
}

function SummaryStats({ summary }: { summary: ProgressSummary }) {
  const { workouts, adherence, topDays } = summary;
  return (
    <View className="mt-3 flex-row gap-2.5">
      <TrendStat
        icon="barbell"
        tone="brand"
        label="Treinos"
        value={String(workouts.value ?? 0)}
        spark={workouts.spark}
        delta={trendDelta(workouts)}
      />
      <TrendStat
        icon="restaurant"
        tone="green"
        label="Aderência"
        value={adherence.value === null ? '—' : String(adherence.value)}
        unit={adherence.value === null ? undefined : '%'}
        spark={adherence.spark}
        delta={trendDelta(adherence, 'pts')}
      />
      <TrendStat
        icon="star"
        tone="purple"
        label="Dias top"
        value={String(topDays.value ?? 0)}
        spark={topDays.spark}
        delta={trendDelta(topDays)}
      />
    </View>
  );
}

/** O relatório do período entra aqui quando a tela existir: atalho para rota que não existe é pior que atalho que falta. */
function Shortcuts({ onOpenTraining }: { onOpenTraining: () => void }) {
  const router = useRouter();
  return (
    <>
      <TituloDeSecao estilo="rotulo">Atalhos</TituloDeSecao>
      <ShortcutRow
        icon="stats-chart"
        title="Evolução em números"
        subtitle="Volume, carga e estímulos"
        onPress={onOpenTraining}
      />
      <ShortcutRow
        icon="barbell-outline"
        title="Evolução de cargas"
        subtitle="A carga máxima de cada exercício"
        onPress={() => router.push(ROUTES.PROGRESS.LOADS)}
      />
      <ShortcutRow
        icon="scale-outline"
        title="Composição corporal"
        subtitle="Peso, gordura e massa magra"
        onPress={() => router.push(ROUTES.PROGRESS.BODY)}
      />
      <ShortcutRow
        icon="resize-outline"
        title="Circunferências"
        subtitle="8 medidas acompanhadas"
        onPress={() => router.push(ROUTES.PROGRESS.CIRCUMFERENCES)}
      />
      <ShortcutRow
        icon="time-outline"
        title="Histórico de sessões"
        subtitle="Corrigir o que você registrou"
        onPress={() => router.push(ROUTES.STUDENT.SESSION_HISTORY)}
      />
      <ShortcutRow
        icon="document-text-outline"
        title="Relatório do período"
        subtitle="Os últimos 90 dias, com exportação em PDF"
        onPress={() => router.push(ROUTES.PROGRESS.REPORT)}
      />
    </>
  );
}
