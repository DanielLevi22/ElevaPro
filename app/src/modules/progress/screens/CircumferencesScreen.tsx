import {
  baselineBefore,
  circumferences,
  formatarDecimal,
  type PhysicalAssessment,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { TrendDelta } from '@/components/ui/TrendDelta';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { CardTitle } from '../components/CardTitle';
import { EmptyCard } from '../components/ChartCard';
import { RadarChart } from '../components/charts/RadarChart';
import { shortDate } from '../components/measurementLabels';
import { SourceChips } from '../components/SourceChips';
import { useMeasurements } from '../hooks/useMeasurements';

/**
 * Tela 5 do kit de métricas: as circunferências.
 *
 * O radar do registro mais recente contra o mais próximo de 90 dias antes, na mesma
 * origem, e as 8 medidas com a diferença, em tom neutro. "Editar" só aparece quando o
 * registro aberto foi declarado pelo próprio aluno: a medida do especialista não se
 * corrige (#312).
 *
 * @example <CircumferencesScreen studentId={user.id} canDeclare />
 */
interface CircumferencesScreenProps {
  studentId: string;
  canDeclare: boolean;
}

const RADAR_KEYS = ['chest', 'arm', 'thigh', 'calf', 'hip', 'waist'] as const;
const MIN_RADAR_AXES = 3;

export function CircumferencesScreen({ studentId, canDeclare }: CircumferencesScreenProps) {
  const router = useRouter();
  const { series, source, sources, setSource, loading } = useMeasurements(studentId);
  const latest = series.at(-1);
  const baseline = baselineBefore(series);
  const editable = latest?.measured_by === 'self';
  const register = {
    rotulo: 'Registrar medida',
    icone: 'add' as const,
    onPress: () => router.push(ROUTES.PROGRESS.MEASUREMENT_FORM),
  };
  // "Editar" só existe com um registro declarado aberto: a medida do especialista
  // não se corrige, e um botão desabilitado ali promete o que nunca vai acontecer.
  const actions = !canDeclare ? undefined : editable && latest ? (
    <BarraDeDuasAcoes
      secundaria={{
        rotulo: 'Editar',
        icone: 'pencil',
        onPress: () =>
          router.push({ pathname: ROUTES.PROGRESS.MEASUREMENT_FORM, params: { id: latest.id } }),
      }}
      principal={register}
    />
  ) : (
    <BotaoFixoNoRodape rotulo={register.rotulo} icone={register.icone} onPress={register.onPress} />
  );

  return (
    <GlassScreen
      glow={PROGRESS_GLOW}
      bottomSpace={canDeclare ? 'actionBar' : 'tab'}
      overlay={actions}
    >
      <ProgressHeader
        size="page"
        eyebrow="8 medidas"
        title="Circunferências"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      {latest && source ? (
        <>
          <SourceChips
            source={source}
            sources={sources}
            date={latest.assessed_at}
            onToggle={setSource}
          />
          {baseline ? <SilhouetteCard latest={latest} baseline={baseline} /> : null}
          <TituloDeSecao
            estilo="rotulo"
            acao={baseline ? `vs. ${shortDate(baseline.assessed_at)}` : undefined}
          >
            Medidas (cm)
          </TituloDeSecao>
          <MeasureRows latest={latest} baseline={baseline} />
          <InfoNote icon="information-circle-outline" className="mt-1">
            Fita do especialista e medida que você declara não são a mesma coisa: compare sempre
            registros da mesma origem.
          </InfoNote>
        </>
      ) : loading ? null : (
        <EmptyCard>Nenhuma medida registrada ainda.</EmptyCard>
      )}
    </GlassScreen>
  );
}

function SilhouetteCard({
  latest,
  baseline,
}: {
  latest: PhysicalAssessment;
  baseline: PhysicalAssessment;
}) {
  const now = circumferences(latest);
  const before = circumferences(baseline);
  const axes = RADAR_KEYS.flatMap((key) => {
    const current = now.find((item) => item.key === key);
    const previous = before.find((item) => item.key === key);
    if (current?.value == null || previous?.value == null) return [];
    return [
      {
        label: current.short,
        now: current.value,
        before: previous.value,
      },
    ];
  });
  if (axes.length < MIN_RADAR_AXES) return null;
  return (
    <Vidro classeExterna="mt-3.5" className="px-2.5 pb-2.5 pt-4">
      <View className="px-1.5">
        <CardTitle
          note={`Linha cheia ${shortDate(latest.assessed_at)} · tracejada ${shortDate(baseline.assessed_at)}`}
        >
          Silhueta comparada
        </CardTitle>
      </View>
      <RadarChart
        axes={axes}
        accessibilityLabel={axes
          .map((axis) => `${axis.label}: ${axis.now} cm, antes ${axis.before}`)
          .join(', ')}
      />
    </Vidro>
  );
}

const ROW_ICON_SIZE = 15;

function MeasureRows({
  latest,
  baseline,
}: {
  latest: PhysicalAssessment;
  baseline: PhysicalAssessment | null;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const before = baseline ? circumferences(baseline) : [];
  return (
    <>
      {circumferences(latest).map((item) => {
        const previous = before.find((entry) => entry.key === item.key)?.value ?? null;
        const delta =
          item.value !== null && previous !== null
            ? Math.round((item.value - previous) * 10) / 10
            : null;
        return (
          <Vidro
            key={item.key}
            classeExterna="mb-[0.5625rem]"
            className="flex-row items-center gap-3 p-3"
          >
            <View className="h-[1.875rem] w-[1.875rem] items-center justify-center rounded-[0.625rem] bg-glass-strong">
              <Ionicons name="remove" size={escalar(ROW_ICON_SIZE)} color={cores.placeholder} />
            </View>
            <Text className="flex-1 text-[0.84375rem] font-semibold text-foreground">
              {item.label}
            </Text>
            {delta === null ? null : <TrendDelta value={delta} unit="cm" judgement="neutral" />}
            <Text className="w-14 text-right font-display-black text-base tracking-tight text-foreground">
              {item.value === null ? '—' : formatarDecimal(item.value)}
            </Text>
          </Vidro>
        );
      })}
    </>
  );
}
