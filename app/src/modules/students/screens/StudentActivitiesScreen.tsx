import { shortMonthOf } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { FilterChips } from '../components/FilterChips';
import { TimelineCard } from '../components/TimelineCard';
import { useLinkedStudent } from '../hooks/useLinkedStudent';
import { useStudentActivities } from '../hooks/useStudentActivities';
import { localToday, type TimelineFilter, timelineEntries } from '../services/followUp';

/**
 * Atividades do aluno: a linha do tempo do que ele fez, com os filtros.
 *
 * Morava no fim do Acompanhamento, onde crescia sem fim e empurrava o resto da
 * tela; aqui ela tem a tela inteira, e o Acompanhamento fica com os atalhos.
 */
export default function StudentActivitiesScreen() {
  const router = useRouter();
  const { studentId, student } = useLinkedStudent();

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')}>
      <CabecalhoSobreFoto
        sobrelinha={student?.full_name ?? student?.email ?? 'Aluno'}
        titulo="Atividades"
        onVoltar={router.back}
      />
      <Timeline studentId={studentId} />
    </TelaDeVidroComFoto>
  );
}

const FILTERS: readonly { value: TimelineFilter; label: string }[] = [
  { value: 'all', label: 'Histórico' },
  { value: 'training', label: 'Treinos' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'measures', label: 'Medidas' },
];

function Timeline({ studentId }: { studentId: string }) {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const { days, loading, failed } = useStudentActivities(studentId);
  const today = localToday();
  const entries = timelineEntries(days, filter, today);

  return (
    <>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} className="mt-5" />
      <TituloDeSecao estilo="rotulo" acao={monthLabel(today)}>
        Linha do tempo
      </TituloDeSecao>
      <TimelineBody loading={loading} failed={failed} empty={entries.length === 0} />
      {entries.map((entry) => (
        <TimelineCard key={entry.id} entry={entry} />
      ))}
    </>
  );
}

/** "Set 2026", o mês corrente no canto do título, como no kit. */
function monthLabel(today: string): string {
  const month = shortMonthOf(today);
  return `${month[0].toUpperCase()}${month.slice(1)} ${today.slice(0, 4)}`;
}

function TimelineBody({
  loading,
  failed,
  empty,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
}) {
  const cores = useCores();
  if (loading) return <ActivityIndicator color={cores.primary} className="py-6" />;
  if (failed) return <EmptyText>Não foi possível carregar as atividades.</EmptyText>;
  if (empty) return <EmptyText>Nenhum registro por aqui ainda.</EmptyText>;
  return null;
}

function EmptyText({ children }: { children: string }) {
  return <Text className="py-6 text-center text-legenda text-muted-foreground">{children}</Text>;
}
