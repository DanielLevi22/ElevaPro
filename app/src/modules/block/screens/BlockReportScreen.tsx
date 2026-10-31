import type { BlockReport } from '@elevapro/shared';
import { formatarDecimal } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { useBlockById, useBlockReport } from '../hooks/useBlockReview';
import { blockHeadline, changesLine, promiseLine } from '../services/blockReportCopy';
import { useReviewStore } from '../store/reviewStore';

/**
 * B4 · O relatório do bloco que acaba: o prometido no primeiro dia contra o
 * real, o antes e o depois, os números do bloco e quantas vezes o plano mudou
 * com a pessoa. Daqui ela segue para o próximo bloco, que já está montado; ou,
 * com `blockId`, é o relatório de um bloco antigo, aberto pelo histórico (C3).
 *
 * @example <BlockReportScreen />
 */
export function BlockReportScreen({ blockId }: { blockId?: string } = {}) {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const active = useActiveBlock(blockId ? null : userId);
  const { data: past } = useBlockById(blockId ?? null);
  const block = blockId ? (past ?? null) : active;
  const pending = useReviewStore((state) => state.pending);
  const { data: report } = useBlockReport(userId, block);
  // Pelo histórico (C3) não há próximo bloco para ver: o botão volta.
  const next = blockId ? router.back : () => router.replace(ROUTES.BLOCK.NEXT);
  const label = blockId
    ? 'Voltar'
    : pending
      ? `Ver o Bloco ${pending.blockNumber}`
      : 'Ver o próximo bloco';
  const icon = blockId ? 'chevron-back' : 'arrow-forward';

  if (!report || !block) {
    return (
      <FlowFrame header={{}} primary={{ label, icon, onPress: next }}>
        <FlowTitle>Juntando os números do bloco…</FlowTitle>
      </FlowFrame>
    );
  }
  const headline = blockHeadline(report, block.name, past?.end_reason === 'changed_early');
  const promise = promiseLine(report);
  return (
    <FlowFrame header={{}} primary={{ label, icon, onPress: next }}>
      <FlowTitle eyebrow={headline.eyebrow} sub={headline.sub}>
        {headline.title}
      </FlowTitle>
      {promise ? (
        <InfoNote icon="analytics-outline" className="mt-3">
          {promise}
        </InfoNote>
      ) : null}
      <BeforeAndAfter report={report} />
      <Numbers report={report} />
      <View className="mt-3">
        <LinhaDeVidro
          icon="sparkles-outline"
          tom="marca"
          titulo={changesLine(report.changes).title}
          sub={changesLine(report.changes).sub}
          direita={<View />}
        />
      </View>
    </FlowFrame>
  );
}

function BeforeAndAfter({ report }: { report: BlockReport }) {
  const rows = [
    report.weight && {
      icon: 'scale-outline' as const,
      title: 'Peso',
      unit: 'kg',
      ...report.weight,
    },
    report.waist && {
      icon: 'resize-outline' as const,
      title: 'Cintura',
      unit: 'cm',
      ...report.waist,
    },
  ].filter((row) => row !== null);
  if (rows.length === 0) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo">Antes e depois</TituloDeSecao>
      <Vidro className="px-3.5">
        {rows.map((row, index) => (
          <BeforeAfterRow
            key={row.title}
            first={index === 0}
            icon={row.icon}
            title={row.title}
            before={`${formatarDecimal(row.before)} ${row.unit}`}
            after={`${formatarDecimal(row.after)} ${row.unit}`}
            badge={signed(row.after - row.before, row.unit)}
          />
        ))}
      </Vidro>
    </>
  );
}

const signed = (delta: number, unit: string) =>
  delta === 0 ? 'igual' : `${delta > 0 ? '+' : '−'}${formatarDecimal(Math.abs(delta))} ${unit}`;

function Numbers({ report }: { report: BlockReport }) {
  const workouts = report.workouts.planned
    ? `${report.workouts.done}/${report.workouts.planned}`
    : String(report.workouts.done);
  const diet = report.diet ? `${report.diet.daysOnTarget}/${report.diet.daysPlanned}` : '—';
  return (
    <>
      <TituloDeSecao estilo="rotulo">Números do bloco</TituloDeSecao>
      <View className="flex-row gap-2">
        <BlocoDeMetrica icon="barbell" tom="marca" valor={workouts} legenda="treinos feitos" />
        <BlocoDeMetrica
          icon="trophy-outline"
          tom="marca"
          valor={String(report.records)}
          legenda="recordes"
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <BlocoDeMetrica icon="restaurant" tom="proteina" valor={diet} legenda="dias na meta" />
        <BlocoDeMetrica
          icon="flame"
          tom="calorias"
          valor={String(report.streakWeeks)}
          legenda="semanas seguidas"
        />
      </View>
    </>
  );
}
