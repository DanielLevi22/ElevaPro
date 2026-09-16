import { formatarDecimal, type LoadRecord, type PeriodReport } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { AdherenceGoalBar } from '../components/AdherenceGoalBar';
import { CardTitle } from '../components/CardTitle';
import { EmptyCard } from '../components/ChartCard';
import { chipDate, localChipDate, SOURCE_LABEL, shortDate } from '../components/measurementLabels';
import { usePeriodReport } from '../hooks/usePeriodReport';
import { sharePeriodReport } from '../services/shareReportPdf';

/**
 * Tela 8 do kit de métricas: o relatório dos últimos 90 dias.
 *
 * Só números que outra tela já mostra, e nenhuma frase que interprete: a variação
 * de peso e gordura vai em tom neutro, porque perder peso é o objetivo de um e o
 * problema de outro (#312).
 *
 * @example <PeriodReportScreen studentId={user.id} studentName="Ana Souza" />
 */
interface PeriodReportScreenProps {
  studentId: string;
  /** O nome que vai no papel; nunca o e-mail nem o id (§5). Nulo sai sem nome. */
  studentName: string | null;
}

export function PeriodReportScreen({ studentId, studentName }: PeriodReportScreenProps) {
  const router = useRouter();
  const { report, periodization, specialist, note, loading } = usePeriodReport(studentId);
  const [exporting, setExporting] = useState(false);

  const exportSheet = async () => {
    if (!report) return;
    setExporting(true);
    const shared = await sharePeriodReport({
      studentName,
      period: periodLabel(report),
      subtitle: subtitle(periodization, specialist),
      panel: report.panel,
      records: report.records,
      streak: report.streak,
      composition: report.composition
        ? { ...report.composition, source: SOURCE_LABEL[report.composition.source].toLowerCase() }
        : null,
      note: note
        ? { body: note.body, author: note.author_name, date: localChipDate(note.created_at) }
        : null,
      formatDate: shortDate,
    });
    setExporting(false);
    if (!shared) {
      showAlert({
        title: 'Não foi possível exportar',
        message: 'O arquivo não pôde ser gerado ou compartilhado. Tente de novo.',
        type: 'error',
      });
    }
  };

  // O aviso antes de gerar, e não depois: o arquivo sai do controle do app no
  // instante em que a folha de compartilhar entrega (§5).
  const confirmExport = () =>
    showConfirm({
      title: 'Exportar em PDF?',
      message:
        'O arquivo leva peso, medidas e o que o seu especialista escreveu. Quem receber poderá ler tudo.',
      confirmText: 'Exportar',
      onConfirm: exportSheet,
    });

  return (
    <GlassScreen
      glow={PROGRESS_GLOW}
      bottomSpace={report && !report.empty ? 'actionBar' : 'tab'}
      overlay={
        report && !report.empty ? (
          <BarraDeDuasAcoes
            secundaria={{
              rotulo: 'Ver detalhes',
              icone: 'stats-chart-outline',
              onPress: () =>
                router.push({ pathname: ROUTES.PROGRESS.HOME, params: { segment: 'training' } }),
            }}
            principal={{
              rotulo: exporting ? 'Gerando' : 'Exportar PDF',
              icone: 'download-outline',
              desabilitada: exporting,
              onPress: confirmExport,
            }}
          />
        ) : undefined
      }
    >
      <ProgressHeader
        size="page"
        eyebrow="Últimos 90 dias"
        title="Relatório do período"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={
          report && !report.empty ? (
            <BotaoRedondo icone="download" rotulo="Exportar PDF" onPress={confirmExport} />
          ) : undefined
        }
      />
      {report && !report.empty ? (
        <>
          <Text className="mt-1 text-[0.78125rem] text-hero-secondary">
            {[periodLabel(report), subtitle(periodization, specialist)].filter(Boolean).join(' · ')}
          </Text>
          <Panel report={report} />
          <Highlights report={report} />
          {note ? (
            <NoteCard body={note.body} author={note.author_name} date={note.created_at} />
          ) : null}
        </>
      ) : loading ? null : (
        <EmptyCard>O relatório aparece quando houver treino ou refeição no período.</EmptyCard>
      )}
    </GlassScreen>
  );
}

const periodLabel = (report: PeriodReport): string =>
  `${shortDate(report.from)} → ${chipDate(report.to)}`;

/** O nome do ciclo, e o especialista só para quem tem um. */
const subtitle = (periodization: string | null, specialist: string | null): string | null =>
  [periodization, specialist ? `com ${specialist}` : null].filter(Boolean).join(' · ') || null;

function Panel({ report }: { report: PeriodReport }) {
  const { panel } = report;
  return (
    <>
      <TituloDeSecao estilo="rotulo">No período</TituloDeSecao>
      <Vidro className="p-3.5">
        <CardTitle note="Refeições feitas sobre as planejadas">Aderência</CardTitle>
        <View className="mt-1 flex-row items-end gap-1.5">
          <Text className="font-display-black text-[1.75rem] tracking-tight text-foreground">
            {panel.adherence === null ? '—' : `${panel.adherence}%`}
          </Text>
          <Text className="pb-1.5 text-[0.71875rem] text-muted-foreground">
            {`meta de ${panel.goal}%`}
          </Text>
        </View>
        {panel.adherence === null ? null : (
          <AdherenceGoalBar value={panel.adherence} goal={panel.goal} />
        )}
      </Vidro>
      <View className="mt-2.5 flex-row gap-2.5">
        <Count label="Treinos" value={panel.workouts} />
        <Count label="Cardio" value={panel.cardioSessions} />
        <Count label="Medidas" value={panel.measurements} />
      </View>
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <Vidro classeExterna="flex-1" className="items-center p-3">
      <Text className="font-display-black text-[1.375rem] tracking-tight text-foreground">
        {value}
      </Text>
      <Text className="mt-0.5 text-[0.6875rem] font-semibold text-muted-foreground">{label}</Text>
    </Vidro>
  );
}

function Highlights({ report }: { report: PeriodReport }) {
  const { streak, composition, records } = report;
  return (
    <>
      <TituloDeSecao estilo="rotulo">Destaques</TituloDeSecao>
      <LinhaDeVidro
        icon="flame-outline"
        tom="marca"
        titulo={`Sequência de ${streak.current} ${streak.current === 1 ? 'dia' : 'dias'}`}
        sub={
          streak.toTie === 0
            ? 'É o seu recorde.'
            : `Recorde de ${streak.best} dias — faltam ${streak.toTie}.`
        }
      />
      {records.map((record) => (
        <RecordRow key={record.exerciseId} record={record} />
      ))}
      {composition ? (
        <LinhaDeVidro
          icon="body-outline"
          tom="marca"
          titulo={compositionTitle(composition.weightDelta, composition.fatDelta)}
          sub={`${SOURCE_LABEL[composition.source]} · sem julgar a direção`}
        />
      ) : null}
    </>
  );
}

function RecordRow({ record }: { record: LoadRecord }) {
  return (
    <LinhaDeVidro
      icon="trophy-outline"
      tom="marca"
      titulo={`${record.name}: ${formatarDecimal(record.weight)} kg`}
      sub={`Recorde de carga em ${shortDate(record.date)}`}
    />
  );
}

/** Peso e gordura sem cor e sem frase: só o número e o sinal. */
function compositionTitle(weightDelta: number | null, fatDelta: number | null): string {
  const parts = [
    weightDelta === null ? null : `Peso ${withSign(weightDelta)} kg`,
    fatDelta === null ? null : `gordura ${withSign(fatDelta)} pts`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Sem variação medida';
}

const withSign = (value: number): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatarDecimal(Math.abs(value))}`;

function NoteCard({ body, author, date }: { body: string; author: string | null; date: string }) {
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={localChipDate(date)}>
        Nota do especialista
      </TituloDeSecao>
      <Vidro className="p-3.5">
        <Text className="text-[0.84375rem] leading-relaxed text-foreground">{body}</Text>
        <Text className="mt-2 text-[0.71875rem] text-muted-foreground">
          {author ?? 'Especialista'}
        </Text>
      </Vidro>
    </>
  );
}
