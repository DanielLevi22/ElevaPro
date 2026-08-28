import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { colors } from '@/constants/colors';
import { useWorkoutStore } from '../store/workoutStore';

const PERIODIZATION_IMAGES: Record<string, ImageSourcePropType> = {
  strength: require('../../../../assets/workouts/back.jpg'),
  hypertrophy: require('../../../../assets/workouts/chest.jpg'),
  adaptation: require('../../../../assets/workouts/arms.jpg'),
  default: require('../../../../assets/workouts/shoulders.jpg'),
};

export default function PeriodizationDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const { user, accountType } = useAuthStore();
  const pathname = usePathname();
  const rawMode = params.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  const isStudentView =
    pathname.includes('/students/') ||
    accountType === 'student' ||
    (accountType === 'member' && mode === 'execute');
  const {
    periodizations,
    fetchPeriodizations,
    isLoading,
    activatePeriodization,
    currentPeriodizationPhases,
    fetchPeriodizationPhases,
    createTrainingPlan,
  } = useWorkoutStore();
  const [periodization, setPeriodization] = useState<
    ReturnType<typeof useWorkoutStore.getState>['periodizations'][0] | null
  >(null);

  // Handle both route patterns:
  // 1. /students/[id]/workouts/[periodizationId] -> id is student, periodizationId is periodization
  // 2. /workouts/periodizations/[id] -> id is periodization
  const rawPeriodizationId = params.periodizationId || params.id;
  const periodizationId = Array.isArray(rawPeriodizationId)
    ? rawPeriodizationId[0]
    : rawPeriodizationId;

  useEffect(() => {
    if (user?.id) {
      // Always fetch if we don't have the specific periodization, even if we have others
      // This ensures we get the latest data if we navigated from creation
      const found = periodizations.find((p) => p.id === periodizationId);
      if (!found) {
        fetchPeriodizations(user.id);
      } else {
        setPeriodization(found);
      }
    }
  }, [user?.id, periodizationId, periodizations, fetchPeriodizations]);

  useEffect(() => {
    if (periodizations.length > 0 && periodizationId) {
      const found = periodizations.find((p) => p.id === periodizationId);
      if (found) {
        setPeriodization(found);
        fetchPeriodizationPhases(periodizationId as string);
      }
    }
  }, [periodizations, periodizationId, fetchPeriodizationPhases]);

  if (isLoading) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#00D9FF" />
      </ScreenLayout>
    );
  }

  if (!periodization) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#71717A" />
        <Text className="text-white text-xl font-bold mt-4 text-center font-display">
          Periodização não encontrada
        </Text>
        <Text className="text-zinc-400 text-center mt-2 mb-6">
          Não foi possível carregar os detalhes desta periodização.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-800 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Voltar</Text>
        </TouchableOpacity>
      </ScreenLayout>
    );
  }

  // Mock Phases Data (Replace with real data later)
  const _getPhaseColor = (type: string) => {
    switch (type) {
      case 'adaptation':
        return '#00C9A7'; // Emerald
      case 'hypertrophy':
        return '#FFB800'; // Gold
      case 'strength':
        return '#FF2E63'; // Red
      default:
        return '#00D9FF'; // Cyan
    }
  };

  const _getPhaseLabel = (type: string) => {
    switch (type) {
      case 'adaptation':
        return 'Adaptação';
      case 'hypertrophy':
        return 'Hipertrofia';
      case 'strength':
        return 'Força';
      default:
        return type;
    }
  };

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Premium Header */}
        <ImageBackground
          source={
            PERIODIZATION_IMAGES[periodization.objective || 'default'] ||
            PERIODIZATION_IMAGES.default
          }
          className="h-96 w-full relative"
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,1)']}
            className="absolute inset-0 flex-1 px-6 pb-10 justify-between"
          >
            {/* Header Icons */}
            <View className="flex-row items-center justify-between pt-8">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-black/40 p-2.5 rounded-xl border border-white/10"
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {!isStudentView && (
                <TouchableOpacity
                  onPress={() =>
                    showAlert({
                      title: 'Em breve',
                      message: 'Edição em desenvolvimento',
                      type: 'info',
                    })
                  }
                  className="bg-black/40 p-2.5 rounded-xl border border-white/10"
                >
                  <Ionicons name="pencil" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            <View>
              <View className="flex-row items-center mb-3">
                <View
                  className="px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${colors.primary.start}20`,
                    borderColor: `${colors.primary.start}30`,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: colors.primary.start }}
                  >
                    {periodization.objective || 'Planejamento'}
                  </Text>
                </View>
                <View className="ml-2">
                  <StatusBadge status={periodization.status} />
                </View>
              </View>

              <Text className="text-4xl font-extrabold text-white mb-2 font-display leading-[42px] drop-shadow-lg">
                {periodization.name}
              </Text>

              <Text className="text-zinc-300 font-sans text-base mb-6 max-w-[85%]">
                {(periodization as unknown as { description?: string }).description ||
                  'Transforme seu corpo com este planejamento exclusivo.'}
              </Text>

              <View className="flex-row gap-4">
                <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-xl border border-white/5">
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.primary.start}
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-xs">
                    {periodization.start_date
                      ? new Date(periodization.start_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '—'}
                  </Text>
                </View>
                <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-xl border border-white/5">
                  <Ionicons
                    name="flag-outline"
                    size={14}
                    color={colors.primary.start}
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-xs">
                    {periodization.end_date
                      ? new Date(periodization.end_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View className="px-6 -mt-6">
          {!isStudentView && periodization.status === 'planned' && (
            <TouchableOpacity
              onPress={() => {
                showConfirm({
                  title: 'Ativar Periodização',
                  message:
                    'Deseja ativar esta periodização? Outras periodizações ativas deste aluno serão concluídas.',
                  type: 'warning',
                  confirmText: 'Ativar',
                  onConfirm: async () => {
                    try {
                      await activatePeriodization(periodization.id);
                      showAlert({
                        title: 'Sucesso! 🚀',
                        message: 'Periodização ativada com sucesso.',
                        type: 'success',
                      });
                    } catch (_error) {
                      showAlert({
                        title: 'Erro',
                        message: 'Não foi possível ativar a periodização.',
                        type: 'error',
                      });
                    }
                  },
                });
              }}
              className="bg-orange-500 px-6 py-4 rounded-2xl w-full items-center shadow-lg shadow-orange-500/30"
              style={{ backgroundColor: colors.primary.start }}
            >
              <Text className="text-white font-bold font-display uppercase tracking-widest text-sm">
                ATIVAR PERIODIZAÇÃO
              </Text>
            </TouchableOpacity>
          )}

          {!isStudentView && periodization.status === 'active' && (
            <TouchableOpacity
              onPress={() => {
                showConfirm({
                  title: 'Encerrar Periodização',
                  message: 'Deseja encerrar esta periodização? Esta ação não pode ser desfeita.',
                  type: 'danger',
                  confirmText: 'Encerrar',
                  onConfirm: async () => {
                    try {
                      await useWorkoutStore
                        .getState()
                        .updatePeriodization(periodization.id, { status: 'completed' });
                      showAlert({
                        title: 'Sucesso! ✓',
                        message: 'Periodização encerrada com sucesso.',
                        type: 'success',
                      });
                      if (user?.id) {
                        fetchPeriodizations(user.id);
                      }
                    } catch (_error) {
                      showAlert({
                        title: 'Erro',
                        message: 'Não foi possível encerrar a periodização.',
                        type: 'error',
                      });
                    }
                  },
                });
              }}
              className="bg-red-500 px-6 py-4 rounded-2xl w-full items-center shadow-lg shadow-red-500/30"
              style={{ backgroundColor: colors.status.error }}
            >
              <Text className="text-white font-bold font-display uppercase tracking-widest text-sm">
                ENCERRAR PERIODIZAÇÃO
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Phases List */}
        <View className="p-6">
          <Text className="text-white text-lg font-bold mb-4 font-display tracking-wide">
            FASES DO TREINAMENTO
          </Text>

          <View className="gap-4">
            {currentPeriodizationPhases
              .filter(
                (phase) => !isStudentView || phase.status === 'active' || phase.status === 'planned'
              )
              .map((phase, index) => {
                const phaseIsActive = phase.status === 'active';
                const isLast = index === currentPeriodizationPhases.length - 1;

                return (
                  <View key={phase.id} className="flex-row">
                    {/* Timeline Tracker */}
                    <View className="items-center mr-4">
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                          phaseIsActive
                            ? 'bg-orange-500 border-orange-400'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                        style={
                          phaseIsActive
                            ? {
                                backgroundColor: colors.primary.start,
                                borderColor: colors.primary.light,
                              }
                            : {}
                        }
                      >
                        {phase.status === 'completed' ? (
                          <Ionicons name="checkmark" size={16} color="white" />
                        ) : (
                          <Text
                            className={`text-xs font-bold ${phaseIsActive ? 'text-white' : 'text-zinc-500'}`}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      {!isLast && <View className="w-[2px] flex-1 bg-zinc-800 my-2" />}
                    </View>

                    {/* Phase Card */}
                    <TouchableOpacity
                      className={`flex-1 mb-8 rounded-2xl overflow-hidden border ${
                        phaseIsActive ? 'bg-zinc-900' : 'bg-zinc-900/50'
                      }`}
                      style={{
                        borderColor: phaseIsActive ? colors.primary.start : colors.border.dark,
                        shadowColor: colors.primary.start,
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: phaseIsActive ? 0.1 : 0,
                        shadowRadius: 20,
                        elevation: phaseIsActive ? 5 : 0,
                      }}
                      onPress={() => {
                        const targetStudentId = params.id || periodization?.student_id;
                        if (params.id && params.periodizationId) {
                          router.push(
                            `/(tabs)/students/${targetStudentId}/workouts/${periodizationId}/phases/${phase.id}` as never
                          );
                        } else {
                          router.push({
                            pathname:
                              `/(tabs)/workouts/periodizations/${periodizationId}/phases/${phase.id}` as never,
                            params: mode === 'execute' ? { mode: 'execute' } : {},
                          });
                        }
                      }}
                    >
                      <View className="p-4">
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-1">
                            <Text
                              className={`text-lg font-bold font-display ${phaseIsActive ? 'text-white' : 'text-zinc-400'}`}
                            >
                              {phase.name}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <Ionicons
                                name="barbell-outline"
                                size={12}
                                color={phaseIsActive ? colors.primary.start : colors.text.muted}
                              />
                              <Text
                                className="text-zinc-500 text-[10px] font-bold ml-1 uppercase"
                                style={{ color: colors.text.muted }}
                              >
                                {phase.name}
                              </Text>
                            </View>
                          </View>

                          <View
                            className={`px-2 py-1 rounded-lg ${
                              phase.status === 'active'
                                ? 'bg-orange-500/10'
                                : phase.status === 'completed'
                                  ? 'bg-emerald-500/10'
                                  : 'bg-zinc-800'
                            }`}
                          >
                            <Text
                              className={`text-[9px] font-bold uppercase tracking-wider ${
                                phase.status === 'active'
                                  ? 'text-orange-500'
                                  : phase.status === 'completed'
                                    ? 'text-emerald-500'
                                    : 'text-zinc-500'
                              }`}
                              style={
                                phase.status === 'active'
                                  ? { color: colors.primary.start }
                                  : phase.status === 'completed'
                                    ? { color: '#10b981' }
                                    : {}
                              }
                            >
                              {phase.status === 'active'
                                ? 'ATIVO'
                                : phase.status === 'completed'
                                  ? 'CONCLUÍDO'
                                  : 'RASCUNHO'}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center border-t border-zinc-800/50 pt-3 mt-1">
                          <View className="flex-row items-center bg-zinc-800/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                            <Text
                              className="text-zinc-400 text-[10px] font-bold ml-2"
                              style={{ color: colors.text.secondary }}
                            >
                              {phase.start_date
                                ? new Date(phase.start_date).toLocaleDateString('pt-BR', {
                                    month: 'short',
                                  })
                                : '—'}{' '}
                              -{' '}
                              {phase.end_date
                                ? new Date(phase.end_date).toLocaleDateString('pt-BR', {
                                    month: 'short',
                                  })
                                : '—'}
                            </Text>
                          </View>

                          <View className="flex-1" />

                          <View className="flex-row items-center">
                            <Text
                              className="text-orange-500 text-[10px] font-bold mr-1"
                              style={{ color: colors.primary.start }}
                            >
                              ACESSAR
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={12}
                              color={colors.primary.start}
                            />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
          </View>

          {!isStudentView && (
            <TouchableOpacity
              className="mt-6 border-2 border-dashed border-zinc-700 rounded-2xl p-4 items-center justify-center"
              onPress={() => {
                showConfirm({
                  title: 'Nova Fase',
                  message: 'Criar uma nova fase de treino?',
                  type: 'info',
                  confirmText: 'Criar',
                  cancelText: 'Cancelar',
                  onConfirm: async () => {
                    if (!periodization) return;
                    try {
                      await createTrainingPlan({
                        periodization_id: periodization.id,
                        name: `Fase ${currentPeriodizationPhases.length + 1}`,
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0],
                        status: 'planned',
                        order_index: currentPeriodizationPhases.length,
                      });
                      showAlert({ title: 'Sucesso', message: 'Fase criada!', type: 'success' });
                    } catch (_error) {
                      showAlert({
                        title: 'Erro',
                        message: 'Não foi possível criar a fase.',
                        type: 'error',
                      });
                    }
                  },
                });
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#71717A" />
              <Text className="text-zinc-500 font-bold mt-2">Adicionar Fase</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
