import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageSourcePropType,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { StudentPickerModal } from '@/components/StudentPickerModal';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { SearchModal } from '@/components/ui/SearchModal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { useStudentStore } from '@/students';
import { useWorkoutStore } from '../store/workoutStore';

const PERIODIZATION_IMAGES: Record<string, ImageSourcePropType> = {
  strength: require('../../../../assets/workouts/back.jpg'),
  hypertrophy: require('../../../../assets/workouts/chest.jpg'),
  adaptation: require('../../../../assets/workouts/arms.jpg'),
  default: require('../../../../assets/workouts/shoulders.jpg'),
};

export default function PeriodizationsScreen() {
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const { user, accountType } = useAuthStore();
  const isSpecialist = accountType === 'specialist';
  const { periodizations, isLoading, fetchPeriodizations } = useWorkoutStore();
  const { students, fetchStudents } = useStudentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  useEffect(() => {
    if (user?.id && accountType) {
      fetchPeriodizations(user.id);
    }
    if (user?.id && isSpecialist) {
      fetchStudents(user.id);
    }
  }, [user?.id, accountType, isSpecialist, fetchPeriodizations, fetchStudents]);

  // O `StudentPickerModal` é anterior ao módulo de alunos ganhar `avatar_url`
  // nulável — aqui é o único ponto de contato entre os dois formatos.
  const studentsParaPicker = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        full_name: s.full_name,
        avatar_url: s.avatar_url ?? undefined,
      })),
    [students]
  );

  const filteredPeriodizations = useMemo(() => {
    if (!searchQuery.trim()) {
      return accountType === 'specialist'
        ? periodizations
        : periodizations.filter((p) => p.status === 'active' || p.status === 'planned');
    }

    const query = searchQuery.toLowerCase();
    return periodizations.filter((periodization) => {
      if (
        accountType !== 'specialist' &&
        periodization.status !== 'active' &&
        periodization.status !== 'planned'
      )
        return false;

      const name = periodization.name?.toLowerCase() || '';
      const studentName = periodization.student?.full_name?.toLowerCase() || '';
      return name.includes(query) || studentName.includes(query);
    });
  }, [periodizations, searchQuery, accountType]);

  type PeriodizationItem = ReturnType<typeof useWorkoutStore.getState>['periodizations'][number] & {
    phases?: unknown[];
  };

  const onRefresh = useCallback(() => {
    if (user?.id) {
      fetchPeriodizations(user.id);
    }
  }, [user?.id, fetchPeriodizations]);

  const renderItem = useCallback(
    ({ item }: { item: PeriodizationItem }) => {
      // Get phases count from the periodization object
      const phaseCount = item.phases?.length || 0;

      return (
        <PremiumCard
          title={item.name || 'Sem nome'}
          subtitle={
            isSpecialist
              ? `${item.student?.full_name || 'Aluno'} • ${phaseCount} ${phaseCount === 1 ? 'Fase' : 'Fases'}`
              : `${item.objective || 'Geral'} • ${phaseCount} ${phaseCount === 1 ? 'Fase' : 'Fases'}`
          }
          image={PERIODIZATION_IMAGES[item.objective as string] || PERIODIZATION_IMAGES.default}
          onPress={() => router.push(`/(tabs)/workouts/periodizations/${item.id}`)}
          badge={<StatusBadge status={item.status} />}
          containerStyle={{ marginBottom: 24 }}
        >
          <View className="mt-4">
            <View className="flex-row items-center bg-black/40 px-3 py-2 rounded-xl border border-white/5 self-start mb-3">
              <Ionicons
                name="calendar-outline"
                size={escalar(14)}
                color={cores.primary}
                style={{ marginRight: 8 }}
              />
              <Text className="text-white/90 text-[0.625rem] font-bold uppercase tracking-widest">
                {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'} -{' '}
                {item.end_date ? new Date(item.end_date).toLocaleDateString() : '—'}
              </Text>
            </View>

            {accountType === 'member' ? (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/workouts/periodizations/${item.id}`)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-600 items-center"
                >
                  <Text className="text-zinc-300 text-[0.625rem] font-black uppercase tracking-widest">
                    Gerenciar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: `/(tabs)/workouts/periodizations/${item.id}` as never,
                      params: { mode: 'execute' },
                    })
                  }
                  className="flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1 bg-primary"
                >
                  <Ionicons name="play" size={escalar(12)} color={cores.primaryForeground} />
                  <Text className="text-[0.625rem] font-black uppercase tracking-widest text-primary-foreground">
                    Iniciar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-end">
                <Text className="mr-1 text-xs font-bold uppercase text-primary-text">
                  {isSpecialist ? 'Gerenciar' : 'Abrir'}
                </Text>
                <Ionicons name="chevron-forward" size={escalar(14)} color={cores.primaryText} />
              </View>
            )}
          </View>
        </PremiumCard>
      );
    },
    [router, isSpecialist, accountType, cores, escalar]
  );

  // O `member` cria para si mesmo, sem escolher aluno; o `specialist` escolhe
  // antes de entrar no wizard, que não tem seletor embutido.
  const abrirCriacao = useCallback(() => {
    if (isSpecialist) {
      setShowStudentPicker(true);
      return;
    }
    if (user?.id) {
      router.push({ pathname: ROUTES.WORKOUTS.WIZARD_STRUCTURE, params: { studentId: user.id } });
    }
  }, [isSpecialist, user?.id, router]);

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="mb-0.5 text-4xl font-extrabold tracking-tight text-foreground">
              {isSpecialist ? 'Alunos' : 'Meus Treinos'}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {isSpecialist
                ? 'Gestão de Planejamento'
                : accountType === 'member'
                  ? 'Planejamento & Execução'
                  : 'Seus treinos'}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setIsSearchModalVisible(true)}
              className="h-12 w-12 items-center justify-center rounded-full bg-muted"
            >
              <Ionicons name="search" size={escalar(24)} color={cores.foreground} />
            </TouchableOpacity>

            {(accountType === 'specialist' || accountType === 'member') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={abrirCriacao}
                className="h-12 w-12 items-center justify-center rounded-full bg-primary"
              >
                <Ionicons name="add" size={escalar(24)} color={cores.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <SearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <StudentPickerModal
        visible={showStudentPicker}
        onClose={() => setShowStudentPicker(false)}
        students={studentsParaPicker}
        onSelect={(student) => {
          setShowStudentPicker(false);
          router.push({
            pathname: ROUTES.WORKOUTS.WIZARD_STRUCTURE,
            params: { studentId: student.id, studentName: student.full_name ?? undefined },
          });
        }}
      />

      {/* Content */}
      <FlatList
        data={filteredPeriodizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={cores.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="mb-6 rounded-full bg-muted p-8">
                <Ionicons
                  name="calendar-outline"
                  size={escalar(64)}
                  color={cores.mutedForeground}
                />
              </View>
              <Text className="mb-2 text-center text-xl font-bold text-foreground">
                Nenhuma periodização
              </Text>
              <Text className="mb-8 px-8 text-center text-sm text-muted-foreground">
                {accountType === 'specialist'
                  ? 'Crie um planejamento para seus alunos'
                  : accountType === 'member'
                    ? 'Crie sua primeira periodização de treino'
                    : 'Seu personal ainda não criou uma periodização'}
              </Text>

              {(accountType === 'specialist' || accountType === 'member') && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={abrirCriacao}
                  className="rounded-md bg-primary px-6 py-3"
                >
                  <Text className="text-base font-bold text-primary-foreground">
                    Criar periodização
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="py-20">
              <ActivityIndicator size="large" color={cores.primary} />
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
