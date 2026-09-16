import { formatarDecimal } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { ColumnChart } from '@/components/ui/charts/ColumnChart';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { ToneTag } from '../components/ToneTag';
import { useScanHistory } from '../hooks/useScanHistory';
import { type HistoryRow, type ScanHistoryView, scanHistoryView } from '../services/scanView';

/**
 * Tela 8 do kit de body scan: as análises do aluno, a evolução da gordura
 * estimada e o caminho para abrir — e apagar — cada uma (#316).
 *
 * @example <ScanHistoryScreen studentId={user.id} />
 */
export function ScanHistoryScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { scans, loading } = useScanHistory(studentId);
  const view = scanHistoryView(scans);
  const newScan = () => router.push(ROUTES.ASSESSMENT.BODY_SCAN);

  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <ProgressHeader
        size="page"
        eyebrow={scans.length === 1 ? '1 análise' : `${scans.length} análises`}
        title="Histórico de scans"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={<BotaoRedondo icone="plus" rotulo="Novo scan" onPress={newScan} />}
      />

      {scans.length === 0 ? (
        loading ? null : (
          <Empty onStart={newScan} />
        )
      ) : (
        <>
          <Evolution view={view} />
          <TituloDeSecao estilo="rotulo">Análises</TituloDeSecao>
          <View className="gap-[0.5625rem]">
            {view.rows.map((row, index) => (
              <Row
                key={row.id}
                row={row}
                latest={index === 0}
                onPress={() => router.push(ROUTES.PROGRESS.SCAN(row.id))}
              />
            ))}
          </View>
          <InfoNote icon="trash-outline" className="mt-2.5">
            Ao apagar uma análise, as medidas estimadas por ela somem e não voltam. Suas outras
            análises continuam. A lixeira fica dentro de cada análise.
          </InfoNote>
        </>
      )}
    </GlassScreen>
  );
}

function Evolution({ view }: { view: ScanHistoryView }) {
  if (view.chart.values.length === 0) return null;
  return (
    <Vidro classeExterna="mt-3.5" className="p-4">
      <Text className="text-[0.6875rem] font-extrabold uppercase tracking-widest text-muted-foreground">
        Evolução estimada
      </Text>
      <View className="mt-3.5">
        <ColumnChart
          values={view.chart.values}
          labels={view.chart.labels}
          tone="brand"
          format={(value) => `${formatarDecimal(value)}%`}
          accessibilityLabel="Gordura estimada em cada análise"
        />
      </View>
      <Text className="mt-2.5 text-[0.71875rem] text-placeholder">
        {view.change ??
          'Gordura estimada por imagem. A evolução aparece a partir da segunda análise.'}
      </Text>
    </Vidro>
  );
}

function Row({ row, latest, onPress }: { row: HistoryRow; latest: boolean; onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Análise de ${row.date}, ${row.tag.label}`}
    >
      <Vidro className={cn('flex-row items-center gap-3 p-3', latest ? 'border-primary' : null)}>
        {/* A foto não é guardada: o quadro mostra o corpo de referência (ADR-0010). */}
        <View className="h-14 w-11 items-center justify-center rounded-[0.6875rem] bg-glass-strong">
          <ReferenceBody height={48} tone="muted" glow={false} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.84375rem] font-bold text-foreground">{row.date}</Text>
          {row.summary ? (
            <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">{row.summary}</Text>
          ) : null}
          <View className="mt-1.5">
            <ToneTag tone={row.tag.tone}>{row.tag.label}</ToneTag>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={escalar(16)} color={cores.placeholder} />
      </Vidro>
    </TouchableOpacity>
  );
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <Vidro classeExterna="mt-6" className="items-center p-5">
      <ReferenceBody height={120} />
      <Text className="mt-4 text-center text-[0.9375rem] font-bold text-foreground">
        Nenhuma análise ainda
      </Text>
      <Text className="mt-1.5 text-center text-[0.8125rem] leading-[1.22rem] text-muted-foreground">
        Três fotos viram uma estimativa de proporção, simetria e postura. O resultado aparece aqui.
      </Text>
      <TouchableOpacity
        onPress={onStart}
        accessibilityRole="button"
        className="mt-4 h-[2.625rem] items-center justify-center rounded-[0.8125rem] bg-primary px-6"
      >
        <Text className="text-[0.71875rem] font-extrabold uppercase tracking-wide text-primary-foreground">
          Começar scan
        </Text>
      </TouchableOpacity>
    </Vidro>
  );
}
