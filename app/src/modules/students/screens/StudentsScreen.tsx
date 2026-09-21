import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useCores } from '@/shared/design';
import { StudentEditModal } from '../components/StudentEditModal';
import { useStudentStore } from '../store/studentStore';

type Filtro = 'todos' | 'risco' | 'pendentes';

export default function StudentsScreen() {
  const {
    students,
    isLoading,
    fetchStudents,
    removeStudent,
    briefing,
    fetchBriefing,
    adherenceByStudent,
    fetchAdherenceFor,
  } = useStudentStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const cores = useCores();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const idsEmRisco = useMemo(
    () =>
      new Set(
        (briefing?.signals ?? [])
          .filter((sinal) => sinal.kind === 'inactive')
          .map((s) => s.studentId)
      ),
    [briefing]
  );

  const studentsFiltrados = useMemo(() => {
    if (filtro === 'risco') return students.filter((s) => idsEmRisco.has(s.id));
    if (filtro === 'pendentes') return students.filter((s) => s.account_status === 'invited');
    return students;
  }, [students, filtro, idsEmRisco]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o especialista muda
  useEffect(() => {
    if (user?.id) fetchBriefing(user.id);
  }, [user?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando a página de alunos muda
  useEffect(() => {
    const idsSemAderencia = students.map((s) => s.id).filter((id) => !(id in adherenceByStudent));
    if (idsSemAderencia.length > 0) fetchAdherenceFor(idsSemAderencia);
  }, [students]);

  const [selectedStudent, setSelectedStudent] = useState<
    import('../store/studentStore').Student | null
  >(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setBy] = useState<'full_name' | 'created_at'>('full_name');
  const [sortOrder, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const { totalCount } = useStudentStore();

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    if (user?.id) {
      fetchStudents(user.id, {
        search: debouncedSearch,
        sortBy,
        sortOrder,
        page: 1,
        append: false,
      });
      setPage(1);
    }
  }, [user, debouncedSearch, sortBy, sortOrder]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  const loadMore = useCallback(() => {
    if (!isLoading && students.length < totalCount && user?.id) {
      const nextPage = page + 1;
      fetchStudents(user.id, {
        search: debouncedSearch,
        sortBy,
        sortOrder,
        page: nextPage,
        append: true,
      });
      setPage(nextPage);
    }
  }, [isLoading, students.length, totalCount, user?.id, debouncedSearch, sortBy, sortOrder, page]);

  const handleRemove = (item: import('../store/studentStore').Student) => {
    const isInvite = item.account_status === 'invited';
    const title = isInvite ? 'Cancelar Convite' : 'Remover Aluno';
    const message = isInvite
      ? `Tem certeza que deseja cancelar o convite para ${item.full_name || 'este aluno'}?`
      : `Tem certeza que deseja remover ${item.full_name || 'este aluno'}? Ele perderá o acesso aos treinos.`;

    showConfirm({
      title: title,
      message: message,
      type: 'danger',
      confirmText: isInvite ? 'Cancelar Convite' : 'Remover',
      cancelText: 'Voltar',
      onConfirm: async () => {
        if (user?.id && item?.id) {
          await removeStudent(user.id, item.id, item.service_type);
        } else {
          showAlert({ title: 'Erro', message: 'ID do aluno não encontrado.', type: 'error' });
        }
      },
    });
  };

  const handleEdit = (student: import('../store/studentStore').Student) => {
    setSelectedStudent(student);
    setIsEditModalVisible(true);
  };

  const _handlePressStudent = (student: import('../store/studentStore').Student) => {
    handleEdit(student);
  };

  const handleEnterStudent = (student: import('../store/studentStore').Student) => {
    router.push(`/(tabs)/students/${student.id}`);
  };

  const handleSaveEdit = async (_data: Record<string, unknown>) => {
    setIsEditModalVisible(false);
    setSelectedStudent(null);
    if (user?.id) {
      fetchStudents(user.id, {
        search: debouncedSearch,
        sortBy,
        sortOrder,
        page: 1,
        append: false,
      });
    }
  };

  const isExpired = (createdAt?: string) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 7;
  };

  const renderItem = ({ item }: { item: import('../store/studentStore').Student }) => {
    const expired = item.account_status === 'invited' && isExpired(item.link_created_at);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !expired && handleEnterStudent(item)}
        disabled={expired}
        className="mb-3"
      >
        <View
          className={`p-4 rounded-2xl border flex-row items-center justify-between ${
            expired ? 'bg-zinc-900/50 border-zinc-900 opacity-60' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <View className="flex-row items-center flex-1">
            {/* Avatar */}
            <View className="h-14 w-14 rounded-full items-center justify-center mr-4 bg-zinc-800">
              <Ionicons
                name={expired ? 'calendar-outline' : 'person'}
                size={28}
                color={expired ? cores.mutedForeground : cores.foreground}
              />
            </View>

            {/* Info */}
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-white text-lg font-bold font-display" numberOfLines={1}>
                  {item.full_name || 'Aluno sem nome'}
                </Text>
                {expired && (
                  <View className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                    <Text className="text-red-500 text-[0.625rem] font-bold uppercase">
                      Expirado
                    </Text>
                  </View>
                )}
                {item.account_status === 'invited' && !expired && (
                  <View className="bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                    <Text className="text-orange-500 text-[0.625rem] font-bold uppercase">
                      Pendente
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-zinc-400 text-sm font-sans" numberOfLines={1}>
                {item.email || 'Sem contato'}
              </Text>
            </View>

            {!expired && item.id in adherenceByStudent ? (
              <View className="items-end mr-1">
                <Text className="text-white text-sm font-black font-display">
                  {adherenceByStudent[item.id] === null ? '—' : `${adherenceByStudent[item.id]}%`}
                </Text>
                <Text className="text-zinc-500 text-[0.5625rem] font-bold uppercase">
                  Aderência
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            {/* Edit Button */}
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              className={`p-2 rounded-xl ${expired ? 'bg-zinc-900' : 'bg-zinc-800'}`}
            >
              <Ionicons
                name="pencil"
                size={20}
                color={expired ? cores.mutedForeground : cores.primaryText}
              />
            </TouchableOpacity>

            {/* Remove Button */}
            <TouchableOpacity onPress={() => handleRemove(item)} className="p-2">
              <Ionicons
                name="trash-outline"
                size={20}
                color={expired ? cores.mutedForeground : cores.destructive}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text
              testID="students-header-title"
              className="text-4xl font-extrabold text-white mb-1 font-display"
            >
              Meus Alunos
            </Text>
            <Text className="text-base text-zinc-400 font-sans">
              {totalCount} {totalCount === 1 ? 'aluno' : 'alunos'}
            </Text>
          </View>

          <Link href={'/(tabs)/students/create' as never} asChild>
            <TouchableOpacity
              activeOpacity={0.8}
              className="h-14 w-14 rounded-full items-center justify-center bg-primary shadow-lg shadow-orange-500/20"
            >
              <Ionicons name="add" size={28} color={cores.primaryForeground} />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Search and Sort */}
        <View className="flex-row gap-3 mb-2">
          <View className="flex-1 flex-row items-center px-4 h-12 rounded-xl bg-zinc-900 border border-zinc-800">
            <Ionicons name="search" size={18} color={cores.mutedForeground} />
            <TextInput
              placeholder="Buscar aluno..."
              placeholderTextColor={cores.placeholder}
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-3 text-white font-sans text-sm"
              style={{ padding: 0 }}
            />
          </View>

          <TouchableOpacity
            onPress={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 items-center justify-center"
          >
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={cores.primaryText}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setBy('full_name')}
            className={`px-4 py-1.5 rounded-full border ${sortBy === 'full_name' ? 'bg-orange-500/10 border-orange-500' : 'bg-transparent border-zinc-800'}`}
          >
            <Text
              className={`text-xs font-bold ${sortBy === 'full_name' ? 'text-orange-500' : 'text-zinc-500'}`}
            >
              NOME (A-Z)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBy('created_at')}
            className={`px-4 py-1.5 rounded-full border ${sortBy === 'created_at' ? 'bg-orange-500/10 border-orange-500' : 'bg-transparent border-zinc-800'}`}
          >
            <Text
              className={`text-xs font-bold ${sortBy === 'created_at' ? 'text-orange-500' : 'text-zinc-500'}`}
            >
              RECENTES
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtro por risco/pendência */}
        <View className="flex-row gap-2 mt-2">
          {(
            [
              ['todos', `Todos · ${students.length}`],
              ['risco', `Em risco · ${idsEmRisco.size}`],
              [
                'pendentes',
                `Pendentes · ${students.filter((s) => s.account_status === 'invited').length}`,
              ],
            ] as const
          ).map(([valor, rotulo]) => (
            <TouchableOpacity
              key={valor}
              onPress={() => setFiltro(valor)}
              className={`px-4 py-1.5 rounded-full border ${filtro === valor ? 'bg-orange-500/10 border-orange-500' : 'bg-transparent border-zinc-800'}`}
            >
              <Text
                className={`text-xs font-bold ${filtro === valor ? 'text-orange-500' : 'text-zinc-500'}`}
              >
                {rotulo.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {studentsFiltrados.length === 0 && !isLoading ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
            <Ionicons name="people-outline" size={80} color={cores.mutedForeground} />
          </View>
          {filtro === 'todos' ? (
            <>
              <Text className="text-white text-2xl font-bold mb-2 text-center font-display">
                Nenhum aluno ainda
              </Text>
              <Text className="text-zinc-400 text-center px-8 text-base mb-8 font-sans">
                Comece cadastrando seu primeiro aluno
              </Text>
              <Link href={'/(tabs)/students/create' as never} asChild>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-2xl py-4 px-8 bg-primary shadow-lg shadow-orange-500/20"
                >
                  <Text className="text-primary-foreground text-base font-bold font-display">
                    Novo Aluno
                  </Text>
                </TouchableOpacity>
              </Link>
            </>
          ) : (
            <Text className="text-white text-lg font-bold text-center font-display">
              {filtro === 'risco' ? 'Nenhum aluno em risco agora' : 'Nenhum convite pendente'}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={studentsFiltrados}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || `student-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isLoading && students.length > 0 ? (
              <View className="py-4">
                <ActivityIndicator color={cores.primaryText} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading && students.length === 0}
              onRefresh={() =>
                user?.id &&
                fetchStudents(user.id, {
                  search: debouncedSearch,
                  sortBy,
                  sortOrder,
                  page: 1,
                  append: false,
                })
              }
              tintColor={cores.primaryText}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <StudentEditModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveEdit}
        student={
          selectedStudent
            ? { ...selectedStudent, full_name: selectedStudent.full_name ?? undefined }
            : null
        }
      />
    </ScreenLayout>
  );
}
