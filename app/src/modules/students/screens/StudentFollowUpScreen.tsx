import { shortMonthOf } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { StatTile } from '@/components/ui/StatTile';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { useLinkedStudent } from '../hooks/useLinkedStudent';
import type { Student } from '../store/studentStore';

/**
 * Acompanhamento do aluno — a tela 7 do fluxo do especialista (#334).
 *
 * É o antigo "Gerenciamento" no kit de vidro: status, atalhos e os cadastros do
 * aluno. A linha do tempo do que ele fez abre pelas "Atividades". A lista de
 * alunos abre aqui; o Desempenho (tela 6) abre pelo atalho "Evolução geral".
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
      <View className="mt-5 flex-row">
        <ActionPill
          icon="archive-outline"
          label="Arquivar aluno"
          onPress={() => showComingSoon('Funcionalidade de arquivar aluno em desenvolvimento')}
        />
      </View>
    </TelaDeVidroComFoto>
  );
}

/** O que ainda não existe avisa em vez de sumir: o especialista sabe que vem. */
function showComingSoon(message: string): void {
  showAlert({ title: 'Em breve', message, type: 'info' });
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

  return (
    <>
      <TituloDeSecao estilo="rotulo">Atalhos</TituloDeSecao>
      <View className="flex-row flex-wrap gap-[0.5625rem]">
        <ActionPill
          icon="download-outline"
          label="Baixar treino"
          onPress={() => showComingSoon('Geração de PDF da ficha completa')}
        />
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
        onPress={() => router.navigate(ROUTES.TABS.NUTRITION)}
      />
      {/* A análise por foto continua do próprio aluno (#436); aqui é a avaliação
          física que o especialista mede, a mesma do web. */}
      <LinhaDeVidro
        icon="clipboard-outline"
        tom="proteina"
        titulo="Avaliações"
        sub="Avaliação física"
        onPress={() => router.navigate(ROUTES.STUDENTS.ASSESSMENTS.LIST(studentId))}
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
      <LinhaDeVidro
        icon="time-outline"
        tom="passos"
        titulo="Atividades"
        sub="Histórico do aluno"
        onPress={() => router.navigate(ROUTES.STUDENTS.ACTIVITIES(studentId))}
      />
    </>
  );
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
