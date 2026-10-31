import { formatarDecimal, type TrendPeriod } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { WeightTrend } from '@/components/ui/charts/WeightTrend';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ChartCard, EmptyCard } from '../components/ChartCard';
import { shortDate } from '../components/measurementLabels';
import { useWeightTrend } from '../hooks/useJourney';

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: '4w', label: '4 semanas' },
  { value: '3m', label: '3 meses' },
  { value: 'all', label: 'Tudo' },
];

/**
 * A10 · Tendência de peso: as pesagens, a tendência (média de três) e a faixa
 * do ritmo da meta, com os ajustes aprovados na janela.
 *
 * @example <WeightTrendScreen studentId={user.id} />
 */
export function WeightTrendScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState<TrendPeriod>('3m');
  const { data: trend, isLoading } = useWeightTrend(studentId, period);
  const last = trend?.weights.at(-1);

  return (
    <GlassScreen glow={PROGRESS_GLOW} bottomSpace="tab">
      <ProgressHeader
        size="page"
        eyebrow="Progresso"
        title="Tendência de peso"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      <View className="mt-3">
        <GlassSegmented options={PERIODS} value={period} onChange={setPeriod} />
      </View>
      {trend && trend.weights.length > 0 && last ? (
        <ChartCard
          title={`${formatarDecimal(last.weightKg)} kg`}
          note={`Última pesagem · ${shortDate(last.assessedAt)}`}
        >
          <WeightTrend weights={trend.weights} expectedChangeKg={trend.expectedWeeklyKg} />
        </ChartCard>
      ) : isLoading ? null : (
        <EmptyCard>Nenhuma pesagem neste período. O check-in da semana pede uma.</EmptyCard>
      )}
      {trend && trend.adjustments.length > 0 ? (
        <>
          <TituloDeSecao estilo="rotulo">Ajustes aprovados</TituloDeSecao>
          {trend.adjustments.map((adjustment) =>
            adjustment.kind === 'calories' ? (
              <LinhaDeVidro
                key={adjustment.at}
                icon="flag-outline"
                tom="marca"
                titulo={`Meta ${Math.round(adjustment.before).toLocaleString('pt-BR')} → ${Math.round(adjustment.after).toLocaleString('pt-BR')} kcal`}
                sub={shortDate(adjustment.at)}
                direita={<View />}
              />
            ) : null
          )}
        </>
      ) : null}
      {trend?.expectedWeeklyKg ? (
        <Text className="mt-3 text-center text-[0.71875rem] text-muted-foreground">
          {`Faixa: o ritmo da sua meta, ${formatarDecimal(trend.expectedWeeklyKg)} kg por semana`}
        </Text>
      ) : null}
    </GlassScreen>
  );
}
