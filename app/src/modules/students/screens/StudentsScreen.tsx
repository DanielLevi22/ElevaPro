import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { FilterChips } from '../components/FilterChips';
import { StudentActionsSheet } from '../components/StudentActionsSheet';
import { StudentRow } from '../components/StudentRow';
import { type StudentFilter, type StudentListState, useStudentList } from '../hooks/useStudentList';
import { type Student, useStudentStore } from '../store/studentStore';

/**
 * A lista de alunos do especialista — a tela 2 do fluxo no kit de vidro (#334).
 *
 * Tudo o que a lista antiga fazia continua: busca, ordem por nome ou recentes,
 * filtros de risco e pendência, página, reenviar convite e remover (agora no "…"
 * de cada linha, com a avaliação física no lugar do "Editar", que não gravava). O chip "Arquivados" do kit fica de fora: arquivar ainda
 * não existe.
 */
export default function StudentsScreen() {
  const router = useRouter();
  const list = useStudentList();
  const [actionsFor, setActionsFor] = useState<Student | null>(null);
  const handlers = useStudentActions();

  const openCreate = () => router.push(ROUTES.STUDENTS.CREATE);

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('back')}
      bottomSpace="fixedButton"
      refresh={{ refreshing: list.isLoading && list.students.length === 0, onRefresh: list.reload }}
      overlay={<BotaoFixoNoRodape rotulo="Novo aluno" icone="add" onPress={openCreate} />}
    >
      <Header total={list.totalCount} atRisk={list.atRiskCount} onCreate={openCreate} />
      <GlassSearchField
        value={list.search}
        onChangeText={list.setSearch}
        placeholder="Buscar aluno…"
        className="mt-4"
      />
      <Filters list={list} />
      <SortTitle list={list} />
      {list.visible.length === 0 && !list.isLoading ? (
        <EmptyState filter={list.filter} onCreate={openCreate} />
      ) : (
        list.visible.map((student) => (
          <StudentRow
            key={student.id}
            student={student}
            state={list.stateOf(student)}
            adherence={list.adherenceByStudent[student.id]}
            onPress={() => router.push(ROUTES.STUDENTS.DETAILS(student.id))}
            onActions={() => setActionsFor(student)}
          />
        ))
      )}
      <ListFooter
        loading={list.isLoading && list.students.length > 0}
        hasMore={list.hasMore}
        onMore={list.loadMore}
      />

      <StudentActionsSheet
        student={actionsFor}
        onClose={() => setActionsFor(null)}
        onAssess={(student) => router.push(ROUTES.STUDENTS.ASSESSMENT(student.id))}
        onResendInvite={handlers.resendInvite}
        onRemove={handlers.remove}
      />
    </TelaDeVidroComFoto>
  );
}

function Header({
  total,
  atRisk,
  onCreate,
}: {
  total: number;
  atRisk: number;
  onCreate: () => void;
}) {
  const eyebrow = `${total} ${total === 1 ? 'aluno' : 'alunos'}${atRisk > 0 ? ` · ${atRisk} em risco` : ''}`;
  return (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
          {eyebrow}
        </Text>
        <Text
          testID="students-header-title"
          className="mt-0.5 text-[1.375rem] font-bold tracking-tight text-hero"
        >
          Alunos
        </Text>
      </View>
      <BotaoRedondo icone="plus" rotulo="Novo aluno" onPress={onCreate} />
    </View>
  );
}

function Filters({ list }: { list: StudentListState }) {
  const options: readonly { value: StudentFilter; label: string }[] = [
    { value: 'all', label: `Todos · ${list.students.length}` },
    { value: 'atRisk', label: `Em risco · ${list.atRiskCount}` },
    { value: 'pending', label: `Pendentes · ${list.pendingCount}` },
  ];
  return <FilterChips options={options} value={list.filter} onChange={list.setFilter} />;
}

/** O rótulo da ordem, por critério e sentido: tabela, e não ternário dentro de ternário. */
const SORT_LABEL = {
  full_name: { asc: 'A–Z', desc: 'Z–A' },
  created_at: { asc: 'Mais antigos', desc: 'Recentes' },
} as const;

/**
 * "Lista" com a ordem à direita, como o kit ("A–Z"). Tocar alterna o sentido;
 * segurar troca entre nome e recentes — as duas ordens que a lista antiga tinha.
 */
function SortTitle({ list }: { list: StudentListState }) {
  const byName = list.sortBy === 'full_name';
  const label = SORT_LABEL[list.sortBy][list.sortOrder];
  return (
    <View className="mb-2.5 mt-5 flex-row items-baseline justify-between px-0.5">
      <Text className="text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
        Lista
      </Text>
      <TouchableOpacity
        onPress={list.toggleSortOrder}
        onLongPress={() => list.setSortBy(byName ? 'created_at' : 'full_name')}
        accessibilityRole="button"
        accessibilityHint="Toque para inverter; segure para ordenar por nome ou por data"
      >
        <Text className="text-[0.71875rem] font-semibold text-primary-text">{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ filter, onCreate }: { filter: StudentFilter; onCreate: () => void }) {
  if (filter !== 'all') {
    return (
      <Text className="py-8 text-center text-legenda text-muted-foreground">
        {filter === 'atRisk' ? 'Nenhum aluno em risco agora.' : 'Nenhum convite pendente.'}
      </Text>
    );
  }
  return (
    <View className="items-center py-8">
      <Text className="text-h2 font-bold text-foreground">Nenhum aluno ainda</Text>
      <Text className="mb-4 mt-1 text-legenda text-muted-foreground">
        Comece cadastrando seu primeiro aluno.
      </Text>
      <ActionPill icon="person-add-outline" label="Novo aluno" onPress={onCreate} />
    </View>
  );
}

function ListFooter({
  loading,
  hasMore,
  onMore,
}: {
  loading: boolean;
  hasMore: boolean;
  onMore: () => void;
}) {
  const cores = useCores();
  if (loading) return <ActivityIndicator color={cores.primaryText} className="py-4" />;
  if (!hasMore) return null;
  return (
    <View className="mt-1 items-center">
      <ActionPill icon="chevron-down" label="Carregar mais" onPress={onMore} />
    </View>
  );
}

interface StudentActions {
  remove: (student: Student) => void;
  resendInvite: (student: Student) => Promise<void>;
}

/** Reenviar e remover, com a confirmação e o aviso de resultado da lista antiga. */
function useStudentActions(): StudentActions {
  const { user } = useAuthStore();
  const { removeStudent, resendInvite } = useStudentStore();

  const remove = (student: Student) => {
    const invite = student.account_status === 'invited';
    const name = student.full_name || 'este aluno';
    showConfirm({
      title: invite ? 'Cancelar Convite' : 'Remover Aluno',
      message: invite
        ? `Tem certeza que deseja cancelar o convite para ${name}?`
        : `Tem certeza que deseja remover ${name}? Ele perderá o acesso aos treinos.`,
      type: 'danger',
      confirmText: invite ? 'Cancelar Convite' : 'Remover',
      cancelText: 'Voltar',
      onConfirm: async () => {
        if (!user?.id) return;
        await removeStudent(user.id, student.id, student.service_type);
      },
    });
  };

  const resend = async (student: Student) => {
    const result = await resendInvite(student.id);
    showAlert(
      result.success
        ? {
            title: 'Convite reenviado',
            message: `Um novo e-mail foi enviado para ${student.email || 'o aluno'}.`,
            type: 'success',
          }
        : {
            title: 'Não foi possível reenviar',
            message: result.error || 'Tente novamente.',
            type: 'error',
          }
    );
  };

  return { remove, resendInvite: resend };
}
