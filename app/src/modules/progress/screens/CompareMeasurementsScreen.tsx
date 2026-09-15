import {
  baselineBefore,
  daysBetween,
  formatarDecimal,
  type MeasurementDifference,
  measurementDifferences,
} from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { EmptyCard } from '../components/ChartCard';
import { SOURCE_LABEL, shortDate } from '../components/measurementLabels';
import { SourceChips } from '../components/SourceChips';
import { useMeasurements } from '../hooks/useMeasurements';

/**
 * Tela 6 do kit de métricas: o que mudou entre dois registros.
 *
 * O registro mais recente contra o mais próximo de 90 dias antes, sempre da mesma
 * origem, campo a campo e sem cor de bom ou ruim. Sem as fotos do kit: a imagem do
 * Body scan nunca é guardada (ADR-0010), e a comparação é só de números (#312).
 *
 * @example <CompareMeasurementsScreen studentId={user.id} hasSpecialist={false} />
 */
interface CompareMeasurementsScreenProps {
  studentId: string;
  /** Muda quem decide o que é bom: "você e seu especialista" ou só "você". */
  hasSpecialist: boolean;
}

const DAYS_PER_MONTH = 30;

export function CompareMeasurementsScreen({
  studentId,
  hasSpecialist,
}: CompareMeasurementsScreenProps) {
  const router = useRouter();
  const { series, source, sources, setSource, loading } = useMeasurements(studentId);
  const latest = series.at(-1);
  const baseline = baselineBefore(series);

  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>
      <View className="pt-3.5">
        <Text
          accessibilityRole="header"
          className="text-[1.3125rem] font-bold tracking-tight text-hero"
        >
          O que mudou
        </Text>
        {latest && baseline ? (
          <Text className="mt-1 text-[0.78125rem] text-hero-secondary">
            {intervalText(baseline.assessed_at, latest.assessed_at)}
          </Text>
        ) : null}
      </View>
      {latest && source ? (
        <SourceChips
          source={source}
          sources={sources}
          date={latest.assessed_at}
          onToggle={setSource}
        />
      ) : null}
      {latest && baseline && source ? (
        <>
          <InfoNote icon="shield-checkmark-outline" className="mt-3">
            {`Os dois registros são "${SOURCE_LABEL[source].toLowerCase()}": comparar a mesma origem é o que torna a diferença confiável.`}
          </InfoNote>
          <Differences items={measurementDifferences(baseline, latest)} />
          <InfoNote icon="information-circle-outline" className="mt-1">
            {hasSpecialist
              ? 'Não pintamos variação de bom ou ruim: se perder cintura é o objetivo, quem sabe é você e seu especialista.'
              : 'Não pintamos variação de bom ou ruim: se perder cintura é o objetivo, quem sabe é você.'}
          </InfoNote>
        </>
      ) : loading ? null : (
        <EmptyCard>A comparação aparece a partir da segunda medida da mesma origem.</EmptyCard>
      )}
    </GlassScreen>
  );
}

function Differences({ items }: { items: MeasurementDifference[] }) {
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={`${items.length} campos`}>
        Diferenças
      </TituloDeSecao>
      {items.map((item) => (
        <Vidro
          key={item.key}
          classeExterna="mb-[0.5625rem]"
          className="flex-row items-center gap-3 p-3"
        >
          <Text className="flex-1 text-[0.84375rem] font-semibold text-foreground">
            {item.label}
          </Text>
          <Text className="font-display-black text-[1.0625rem] tracking-tight text-muted-foreground">
            {`${item.delta > 0 ? '+' : item.delta < 0 ? '−' : ''}${formatarDecimal(Math.abs(item.delta))}`}
            {item.unit ? (
              <Text className="text-[0.6875rem] font-bold">{` ${item.unit}`}</Text>
            ) : null}
          </Text>
        </Vidro>
      ))}
    </>
  );
}

/**
 * @example intervalText("2026-05-12", "2026-08-12") // "12 mai → 12 ago · 3 meses"
 */
function intervalText(from: string, to: string): string {
  const months = Math.round(daysBetween(from.slice(0, 10), to.slice(0, 10)) / DAYS_PER_MONTH);
  const span = months >= 1 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : 'menos de 1 mês';
  return `${shortDate(from)} → ${shortDate(to)} · ${span}`;
}
