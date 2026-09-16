import { bodyComposition, formatarDecimal, type PhysicalAssessment } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TrendDelta } from '@/components/ui/TrendDelta';
import { ROUTES } from '@/navigation/types';
import { ChartCard, EmptyCard } from '../components/ChartCard';
import { AreaChart } from '../components/charts/AreaChart';
import { evenLabels } from '../components/charts/geometry';
import { shortDate } from '../components/measurementLabels';
import { ShortcutRow } from '../components/ShortcutRow';
import { SourceChips } from '../components/SourceChips';
import { TrendStat } from '../components/TrendStat';
import { useMeasurements } from '../hooks/useMeasurements';

/**
 * Tela 4 do kit de métricas: a composição corporal.
 *
 * Peso, gordura, massa magra e IMC do registro mais recente da origem escolhida,
 * a tendência do peso e a divisão do peso. A variação fica neutra: perder peso é
 * o objetivo de um e o problema de outro (#312). Sem a meta de peso do kit, que
 * nada no banco guarda.
 *
 * @example <BodyCompositionScreen studentId={user.id} canDeclare />
 */
interface BodyCompositionScreenProps {
  studentId: string;
  /** O Praticante declara a própria medida; com especialista, quem mede é ele. */
  canDeclare: boolean;
}

export function BodyCompositionScreen({ studentId, canDeclare }: BodyCompositionScreenProps) {
  const router = useRouter();
  const { series, source, sources, setSource, loading } = useMeasurements(studentId);
  const latest = series.at(-1);
  const openForm = () => router.push(ROUTES.PROGRESS.MEASUREMENT_FORM);
  const actions = canDeclare ? (
    <BarraDeDuasAcoes
      secundaria={{
        rotulo: 'Histórico',
        icone: 'time-outline',
        onPress: () => router.push(ROUTES.PROGRESS.MEASUREMENTS),
      }}
      principal={{ rotulo: 'Nova medida', icone: 'add', onPress: openForm }}
    />
  ) : undefined;

  return (
    <GlassScreen
      glow={PROGRESS_GLOW}
      bottomSpace={canDeclare ? 'actionBar' : 'tab'}
      overlay={actions}
    >
      <ProgressHeader
        size="page"
        eyebrow="Avaliação física"
        title="Composição corporal"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={
          canDeclare ? (
            <BotaoRedondo icone="plus" rotulo="Nova medida" onPress={openForm} />
          ) : undefined
        }
      />
      {latest && source ? (
        <>
          <SourceChips
            source={source}
            sources={sources}
            date={latest.assessed_at}
            onToggle={setSource}
          />
          <CompositionStats series={series} />
          <TrendCard
            series={series}
            pick={(record) => bodyComposition(record).weight}
            title="Tendência do peso"
            note="Peso a cada registro"
            suffix=" kg"
            tone="brand"
          />
          <TrendCard
            series={series}
            pick={(record) => bodyComposition(record).fatPercent}
            title="Tendência da gordura"
            note="Percentual a cada registro"
            suffix="%"
            tone="amber"
          />
          <WeightSplit latest={latest} />
          <View className="mt-3">
            <ShortcutRow
              icon="git-compare-outline"
              title="O que mudou"
              subtitle="Compare com o registro de 3 meses antes"
              onPress={() => router.push(ROUTES.PROGRESS.COMPARE)}
            />
            {canDeclare ? null : (
              <ShortcutRow
                icon="time-outline"
                title="Histórico"
                subtitle="Todas as medidas registradas"
                onPress={() => router.push(ROUTES.PROGRESS.MEASUREMENTS)}
              />
            )}
          </View>
        </>
      ) : loading ? null : (
        <EmptyCard>
          {canDeclare
            ? 'Nenhuma medida ainda. Registre peso e medidas para acompanhar a sua composição.'
            : 'Nenhuma avaliação ainda. Quando o seu especialista medir, a composição aparece aqui.'}
        </EmptyCard>
      )}
    </GlassScreen>
  );
}

/** Uma medida da série, com a variação neutra desde o registro anterior. */
function statOf(
  series: readonly PhysicalAssessment[],
  pick: (record: PhysicalAssessment) => number | null
) {
  const values = series.map(pick);
  const known = values.filter((value): value is number => value !== null);
  const current = values.at(-1) ?? null;
  const previous = known.length > 1 ? known[known.length - 2] : null;
  return {
    value: current === null ? '—' : formatarDecimal(current),
    spark: values,
    delta: current !== null && previous !== null ? current - previous : null,
  };
}

function CompositionStats({ series }: { series: readonly PhysicalAssessment[] }) {
  const weight = statOf(series, (record) => bodyComposition(record).weight);
  const fat = statOf(series, (record) => bodyComposition(record).fatPercent);
  const lean = statOf(series, (record) => bodyComposition(record).leanMass);
  const bmi = statOf(series, (record) => bodyComposition(record).bmi);
  const delta = (value: number | null, unit: string) =>
    value === null ? undefined : (
      <TrendDelta value={Math.round(value * 10) / 10} unit={unit} judgement="neutral" />
    );
  return (
    <View className="mt-3 gap-2.5">
      <View className="flex-row gap-2.5">
        <TrendStat
          icon="scale-outline"
          tone="brand"
          label="Peso"
          value={weight.value}
          unit="kg"
          spark={weight.spark}
          delta={delta(weight.delta, 'kg')}
        />
        <TrendStat
          icon="water-outline"
          tone="amber"
          label="Gordura"
          value={fat.value}
          unit="%"
          spark={fat.spark}
          delta={delta(fat.delta, 'pts')}
        />
      </View>
      <View className="flex-row gap-2.5">
        <TrendStat
          icon="body-outline"
          tone="green"
          label="Massa magra"
          value={lean.value}
          unit="kg"
          spark={lean.spark}
          delta={delta(lean.delta, 'kg')}
        />
        <TrendStat
          icon="resize-outline"
          tone="blue"
          label="IMC"
          value={bmi.value}
          spark={bmi.spark}
          delta={delta(bmi.delta, '')}
        />
      </View>
    </View>
  );
}

interface TrendCardProps {
  series: readonly PhysicalAssessment[];
  pick: (record: PhysicalAssessment) => number | null;
  title: string;
  note: string;
  suffix: string;
  tone: 'brand' | 'amber';
}

/** A série de um número ao longo dos registros; sem dois pontos não há tendência. */
function TrendCard({ series, pick, title, note, suffix, tone }: TrendCardProps) {
  const points = series.flatMap((record) => {
    const value = pick(record);
    return value === null ? [] : [{ value, date: record.assessed_at }];
  });
  if (points.length < 2) return null;
  const first = formatarDecimal(points[0].value);
  const last = formatarDecimal(points[points.length - 1].value);
  return (
    <ChartCard title={title} note={note}>
      <AreaChart
        values={points.map((point) => point.value)}
        tone={tone}
        labels={evenLabels(
          points.map((point) => shortDate(point.date)),
          4
        )}
        format={formatarDecimal}
        suffix={suffix}
        accessibilityLabel={`${title}: de ${first} para ${last}${suffix}`}
      />
    </ChartCard>
  );
}

/** Massa magra e massa gorda do registro, quando há gordura para dividir. */
function WeightSplit({ latest }: { latest: PhysicalAssessment }) {
  const { weight, leanMass } = bodyComposition(latest);
  if (weight === null || leanMass === null) return null;
  const fatMass = weight - leanMass;
  return (
    <ChartCard title="Divisão do peso" note="Massa magra e massa gorda no último registro">
      <View className="h-4 flex-row gap-0.5 overflow-hidden rounded-full">
        <View className="bg-metrica-passos" style={{ flex: leanMass }} />
        <View className="bg-metrica-gordura" style={{ flex: fatMass }} />
      </View>
      <View className="mt-2.5 flex-row justify-between">
        <Text className="text-[0.75rem] text-muted-foreground">
          <Text className="font-bold text-texto-macro-proteina">{`${formatarDecimal(leanMass)} kg`}</Text>{' '}
          massa magra
        </Text>
        <Text className="text-[0.75rem] text-muted-foreground">
          <Text className="font-bold text-texto-macro-gordura">{`${formatarDecimal(fatMass)} kg`}</Text>{' '}
          gordura
        </Text>
      </View>
    </ChartCard>
  );
}
