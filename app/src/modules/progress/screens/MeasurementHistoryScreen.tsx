import { bodyComposition, formatarDecimal, type PhysicalAssessment } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { EmptyCard } from '../components/ChartCard';
import { chipDate } from '../components/measurementLabels';
import { SourceChips } from '../components/SourceChips';
import { useMeasurements } from '../hooks/useMeasurements';
import { useProgressNavigation } from '../navigation/ProgressNavigation';

/**
 * O histórico das medidas de uma origem, da mais recente à mais antiga (#312).
 *
 * É o caminho do aluno para corrigir e apagar o que declarou (Art. 18, III e VI):
 * tocar numa medida declarada abre o formulário dela. A medida do especialista só
 * se lê: corrigir medida clínica reescreve o histórico, e o remédio é medir de novo.
 *
 * @example <MeasurementHistoryScreen studentId={user.id} />
 */
export function MeasurementHistoryScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { routes } = useProgressNavigation();
  const { measurementForm } = routes;
  const { series, source, sources, setSource, loading } = useMeasurements(studentId);
  const latest = series.at(-1);

  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <ProgressHeader
        size="page"
        eyebrow="Suas medidas"
        title="Histórico"
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
          <TituloDeSecao
            estilo="rotulo"
            acao={source === 'self' && measurementForm ? 'toque para corrigir' : undefined}
          >
            {`${series.length} ${series.length === 1 ? 'registro' : 'registros'}`}
          </TituloDeSecao>
          {[...series].reverse().map((record) => (
            <HistoryRow
              key={record.id}
              record={record}
              onPress={
                record.measured_by === 'self' && measurementForm
                  ? () => router.push(measurementForm(record.id))
                  : undefined
              }
            />
          ))}
        </>
      ) : loading ? null : (
        <EmptyCard>Nenhuma medida registrada ainda.</EmptyCard>
      )}
    </GlassScreen>
  );
}

function HistoryRow({ record, onPress }: { record: PhysicalAssessment; onPress?: () => void }) {
  const { weight, fatPercent } = bodyComposition(record);
  const summary = [
    weight === null ? null : `${formatarDecimal(weight)} kg`,
    fatPercent === null ? null : `${formatarDecimal(fatPercent)}% de gordura`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <LinhaDeVidro
      icon={record.measured_by === 'self' ? 'create-outline' : 'medkit-outline'}
      tom="marca"
      titulo={chipDate(record.assessed_at)}
      sub={summary || 'Só medidas'}
      onPress={onPress}
      direita={
        onPress ? undefined : <Text className="text-[0.71875rem] text-placeholder">só leitura</Text>
      }
    />
  );
}
