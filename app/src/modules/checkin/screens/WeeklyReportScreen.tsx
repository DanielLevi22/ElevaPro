import {
  primeiroNome,
  type SpecialistNoteWithAuthor,
  type WeekAdjustment,
  type WeeklyReport,
} from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { TrendDelta } from '@/components/ui/TrendDelta';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useWeeklyReport, useWeekNote } from '../hooks/useWeeklyReport';
import {
  adjustmentLine,
  recordLine,
  reportHeadline,
  reportNumbers,
  streakTitle,
} from '../services/reportCopy';
import { useWeeklyReportStore } from '../store/weeklyReportStore';

const ADJUSTMENT_ICON: Record<WeekAdjustment['kind'], keyof typeof Ionicons.glyphMap> = {
  calories: 'flag-outline',
  swap: 'swap-horizontal',
  simplified: 'list-outline',
};

/**
 * R1 · O relatório da semana: os números, o que ficou mais forte, o que mudou
 * no plano e a sequência em semanas. Na semana difícil (R1a), o mesmo
 * relatório sem bronca; para o Aluno, o comentário do especialista.
 *
 * Abrir marca a semana como vista, e o cartão da tela inicial sai.
 *
 * @example <WeeklyReportScreen />
 */
export function WeeklyReportScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const name = useAuthStore((state) => primeiroNome(state.user?.user_metadata?.full_name));
  const { data: report, isError, refetch } = useWeeklyReport(userId);
  const { data: note } = useWeekNote(userId, report);
  const markSeen = useWeeklyReportStore((state) => state.markSeen);
  const home = () => router.replace(ROUTES.TABS.ROOT);

  useEffect(() => {
    if (userId && report) markSeen(userId, report.weekStart);
  }, [userId, report, markSeen]);

  if (isError) {
    return (
      <FlowFrame header={{}} primary={{ label: 'Tentar de novo', onPress: () => void refetch() }}>
        <FlowTitle sub="Confira sua conexão e tente de novo.">
          Não deu para montar o relatório
        </FlowTitle>
      </FlowFrame>
    );
  }
  if (!report) {
    return (
      <FlowFrame header={{}}>
        <FlowTitle>Montando seu relatório…</FlowTitle>
      </FlowFrame>
    );
  }
  const headline = reportHeadline(report, name ?? 'você');
  return (
    <FlowFrame
      header={{}}
      primary={{ label: 'Começar a semana', icon: 'checkmark', onPress: home }}
    >
      <FlowTitle eyebrow={headline.eyebrow} sub={headline.sub}>
        {headline.title}
      </FlowTitle>
      {report.tone === 'empty' ? null : <ReportBody report={report} note={note ?? null} />}
    </FlowFrame>
  );
}

function ReportBody({
  report,
  note,
}: {
  report: WeeklyReport;
  note: SpecialistNoteWithAuthor | null;
}) {
  const numbers = reportNumbers(report);
  return (
    <>
      <View className="mt-4 flex-row gap-2">
        <BlocoDeMetrica
          icon="barbell"
          tom="marca"
          valor={numbers.workouts.value}
          legenda={numbers.workouts.sub}
        />
        <BlocoDeMetrica
          icon="restaurant"
          tom="proteina"
          valor={numbers.diet.value}
          legenda={numbers.diet.sub}
        />
        <BlocoDeMetrica
          icon="scale-outline"
          tom="passos"
          valor={numbers.weight.value}
          legenda={numbers.weight.sub}
        />
      </View>
      {note ? <SpecialistComment note={note} /> : null}
      <Records report={report} />
      <Adjustments report={report} />
      {report.streakWeeks > 0 ? (
        <View className="mt-5">
          <LinhaDeVidro
            icon="flame"
            tom="calorias"
            titulo={streakTitle(report.streakWeeks)}
            sub="Uma semana com pelo menos 1 treino já conta."
            direita={<View />}
          />
        </View>
      ) : null}
    </>
  );
}

function Records({ report }: { report: WeeklyReport }) {
  if (report.records.length === 0) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={recordCount(report.records.length)}>
        Você ficou mais forte
      </TituloDeSecao>
      {report.records.map((record) => {
        const line = recordLine(record);
        return (
          <LinhaDeVidro
            key={record.exerciseId}
            icon="trophy-outline"
            tom="marca"
            titulo={line.title}
            sub={line.sub}
            direita={
              <TrendDelta
                value={record.weight - record.previousWeight}
                unit="kg"
                judgement="good"
              />
            }
          />
        );
      })}
    </>
  );
}

const recordCount = (count: number) => (count === 1 ? '1 recorde' : `${count} recordes`);

function Adjustments({ report }: { report: WeeklyReport }) {
  if (report.adjustments.length === 0) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo">O que mudou no seu plano</TituloDeSecao>
      {report.adjustments.map((adjustment) => {
        const line = adjustmentLine(adjustment);
        return (
          <LinhaDeVidro
            key={`${adjustment.kind}-${adjustment.at}`}
            icon={ADJUSTMENT_ICON[adjustment.kind]}
            tom="marca"
            titulo={line.title}
            sub={line.sub}
            direita={<View />}
          />
        );
      })}
    </>
  );
}

/** R1 Aluno: o que o especialista escreveu na semana, com o nome dele. */
function SpecialistComment({ note }: { note: SpecialistNoteWithAuthor }) {
  return (
    <>
      <TituloDeSecao estilo="rotulo">Seu especialista comentou</TituloDeSecao>
      <Vidro className="gap-1 p-3.5">
        {note.author_name ? (
          <Text className="text-[0.84375rem] font-bold text-foreground">{note.author_name}</Text>
        ) : null}
        <Text className="text-[0.78125rem] leading-[1.15rem] text-muted-foreground">
          {note.body}
        </Text>
      </Vidro>
    </>
  );
}
