import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { PhaseTimelineCard } from '../components/PhaseTimelineCard';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const PERIODIZATION_IMAGES: Record<string, ImageSourcePropType> = {
  strength: require('../../../../assets/workouts/back.jpg'),
  hypertrophy: require('../../../../assets/workouts/chest.jpg'),
  adaptation: require('../../../../assets/workouts/arms.jpg'),
  default: require('../../../../assets/workouts/shoulders.jpg'),
};

export default function PeriodizationDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const cores = useCores();

  const { user, accountType } = useAuthStore();
  const rawMode = params.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  // `/students/[id]/...` é navegação exclusiva do especialista olhando a ficha
  // de um aluno — não é o aluno vendo o próprio treino. Contar o pathname aqui
  // fazia o especialista, ao entrar por essa ficha, cair na versão só-leitura
  // desta tela, que devia ser exclusiva de quem é de fato aluno/membro em execução.
  const isStudentView =
    accountType === 'student' || (accountType === 'member' && mode === 'execute');
  const {
    periodizations,
    fetchPeriodizations,
    isLoading,
    activatePeriodization,
    currentPeriodizationPhases,
    fetchPeriodizationPhases,
    createTrainingPlan,
  } = useWorkoutStore();
  const wizard = useWorkoutWizardStore();
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
        <ActivityIndicator size="large" color={cores.primary} />
      </ScreenLayout>
    );
  }

  if (!periodization) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color={cores.mutedForeground} />
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
                <Ionicons name="arrow-back" size={24} color={cores.onHero} />
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
                  <Ionicons name="pencil" size={20} color={cores.onHero} />
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
                    className="text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: colors.primary.start }}
                  >
                    {periodization.objective || 'Planejamento'}
                  </Text>
                </View>
                <View className="ml-2">
                  <StatusBadge status={periodization.status} />
                </View>
              </View>

              <Text className="text-4xl font-extrabold text-white mb-2 font-display leading-[2.625rem] drop-shadow-lg">
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
              .map((phase, index) => (
                <PhaseTimelineCard
                  key={phase.id}
                  phase={phase}
                  index={index}
                  isLast={index === currentPeriodizationPhases.length - 1}
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
                />
              ))}
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
                      const novaFase = await createTrainingPlan({
                        periodization_id: periodization.id,
                        name: `Fase ${currentPeriodizationPhases.length + 1}`,
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0],
                        status: 'planned',
                        order_index: currentPeriodizationPhases.length,
                      });
                      // A fase nasce vazia — segue direto pro passo de montagem
                      // do wizard (#335) em vez de deixar "Fase criada!" como
                      // fim de linha, sem exercício nenhum dentro dela.
                      wizard.startFor(
                        periodization.student_id,
                        periodization.student?.full_name ?? 'Aluno'
                      );
                      wizard.setPlanName(novaFase.name);
                      wizard.setCreatedStructure(periodization.id, novaFase.id);
                      router.push({
                        pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
                        params: { studentId: periodization.student_id },
                      });
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
              <Ionicons name="add-circle-outline" size={24} color={cores.mutedForeground} />
              <Text className="text-zinc-500 font-bold mt-2">Adicionar Fase</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
