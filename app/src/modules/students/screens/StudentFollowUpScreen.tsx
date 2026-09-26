import { shortMonthOf } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Chip } from '@/components/ui/Chip';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { StatTile } from '../components/StatTile';
import { TimelineCard } from '../components/TimelineCard';
import { useLinkedStudent } from '../hooks/useLinkedStudent';
import { useStudentActivities } from '../hooks/useStudentActivities';
import { localToday, type TimelineFilter, timelineEntries } from '../services/followUp';
import type { Student } from '../store/studentStore';

/**
 * Acompanhamento do aluno — a tela 7 do fluxo do especialista (#334).
 *
 * É o antigo "Gerenciamento" no kit de vidro: status, atalhos, os cadastros do
 * aluno e, agora, a linha do tempo do que ele fez. A lista de alunos abre aqui;
 * o Desempenho (tela 6) abre pelo atalho "Evolução geral".
 */
export default function StudentFollowUpScreen() {
  const router = useRouter();
  const { studentId, student, loading, retry } = useLinkedStudent();

  if (loading) return <CenteredState />;
  if (!student) return <StudentNotFound onRetry={retry} onBack={router.back} />;

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')}>
      <CabecalhoSobreFoto
        sobrelinha={student.full_name ?? student.email}
        titulo="Acompanhamento"
        onVoltar={router.back}
      />
      <StatusRow student={student} />
      <Shortcuts student={student} />
      <Management studentId={studentId} />
      <Timeline studentId={studentId} />
      <View className="mt-5 flex-row">
        <ActionPill
          icon="archive-outline"
          label="Arquivar aluno"
          onPress={() =>
            showAlert({
              title: 'Em breve',
              message: 'Funcionalidade de arquivar aluno em desenvolvimento',
              type: 'info',
            })
          }
        />
      </View>
    </TelaDeVidroComFoto>
  );
}

/** "mai/26": o mês do vínculo, como a sobrelinha do kit escreve. */
function sinceLabel(linkCreatedAt: string | null): string {
  if (!linkCreatedAt) return '—';
  const date = linkCreatedAt.slice(0, 10);
  return `${shortMonthOf(date)}/${date.slice(2, 4)}`;
}

function StatusRow({ student }: { student: Student }) {
  const active = student.account_status === 'active';
  return (
    <View className="mt-[1.125rem] flex-row gap-2.5">
      <StatTile
        value={active ? 'Ativo' : 'Pendente'}
        label="Status"
        tone={active ? 'positive' : 'warning'}
      />
      <StatTile value={sinceLabel(student.link_created_at)} label="Desde" />
    </View>
  );
}

function Shortcuts({ student }: { student: Student }) {
  const router = useRouter();

  const enterStudentView = async () => {
    await useAuthStore.getState().enterStudentView({
      id: student.id,
      email: student.email,
      full_name: student.full_name ?? '',
    });
    // O estado do modo aluno precisa propagar antes da troca de pilha.
    setTimeout(() => router.replace(ROUTES.TABS.ROOT), 100);
  };

  return (
    <>
      <TituloDeSecao estilo="rotulo">Atalhos</TituloDeSecao>
      <View className="flex-row flex-wrap gap-[0.5625rem]">
        <ActionPill
          icon="download-outline"
          label="Baixar treino"
          onPress={() =>
            showAlert({
              title: 'Em breve',
              message: 'Geração de PDF da ficha completa',
              type: 'info',
            })
          }
        />
        <ActionPill icon="eye-outline" label="Visão do aluno" onPress={enterStudentView} />
        <ActionPill
          icon="stats-chart-outline"
          label="Evolução geral"
          onPress={() => router.navigate(ROUTES.STUDENTS.PROGRESS.HOME(student.id))}
        />
      </View>
    </>
  );
}

function Management({ studentId }: { studentId: string }) {
  const router = useRouter();
  return (
    <>
      <TituloDeSecao estilo="rotulo">Gerenciamento</TituloDeSecao>
      <LinhaDeVidro
        icon="barbell-outline"
        tom="marca"
        titulo="Treinos"
        sub="Gerenciar fichas"
        onPress={() => router.navigate(ROUTES.STUDENTS.WORKOUTS(studentId))}
      />
      <LinhaDeVidro
        icon="restaurant-outline"
        tom="ritmo"
        titulo="Dieta"
        sub="Plano alimentar"
        onPress={() => router.navigate(ROUTES.STUDENTS.NUTRITION(studentId))}
      />
      <LinhaDeVidro
        icon="body-outline"
        tom="gordura"
        titulo="Avaliação"
        sub="Medidas e fotos"
        onPress={() => router.navigate(ROUTES.STUDENTS.ASSESSMENT(studentId))}
      />
      <LinhaDeVidro
        icon="document-text-outline"
        tom="cadencia"
        titulo="Anamnese"
        sub="Questionário"
        onPress={() =>
          router.navigate({ pathname: ROUTES.STUDENTS.ANAMNESIS, params: { studentId } })
        }
      />
    </>
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
      <View className="mt-5 flex-row flex-wrap gap-[0.4375rem]">
        {FILTERS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setFilter(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === option.value }}
          >
            <Chip tom={filter === option.value ? 'destaque' : 'neutro'}>{option.label}</Chip>
          </TouchableOpacity>
        ))}
      </View>
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
  if (failed) return <EmptyText>Não foi possível carregar o acompanhamento.</EmptyText>;
  if (empty) return <EmptyText>Nenhum registro por aqui ainda.</EmptyText>;
  return null;
}

function EmptyText({ children }: { children: string }) {
  return <Text className="py-6 text-center text-legenda text-muted-foreground">{children}</Text>;
}

function CenteredState() {
  const cores = useCores();
  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')} centered>
      <ActivityIndicator size="large" color={cores.primary} />
    </TelaDeVidroComFoto>
  );
}

function StudentNotFound({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')} centered>
      <View className="items-center px-2">
        <Text className="text-center text-h2 font-bold text-foreground">Aluno não encontrado</Text>
        <Text className="mb-6 mt-2 text-center text-legenda text-muted-foreground">
          Não foi possível carregar os dados deste aluno. Ele pode ter sido removido ou você não tem
          acesso.
        </Text>
        <View className="flex-row gap-[0.5625rem]">
          <ActionPill icon="refresh-outline" label="Tentar novamente" onPress={onRetry} />
          <ActionPill icon="arrow-back-outline" label="Voltar" onPress={onBack} />
        </View>
      </View>
    </TelaDeVidroComFoto>
  );
}
