import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { IconButton } from '@/components/ui/IconButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusModal } from '@/components/ui/StatusModal';
import { MuscleFilterCarousel } from '@/components/workout/MuscleFilterCarousel';
import { colors } from '@/constants/colors';
import { AIWorkoutNegotiationModal } from '../components/AIWorkoutNegotiationModal';
import { useWorkoutStore } from '../store/workoutStore';

const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {
  Peito: require('../../../../assets/workouts/chest.jpg'),
  Costas: require('../../../../assets/workouts/back.jpg'),
  Pernas: require('../../../../assets/workouts/legs.jpg'),
  Braços: require('../../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../../assets/workouts/shoulders.jpg'),
  Abdominais: require('../../../../assets/workouts/abs.jpg'),
  Geral: require('../../../../assets/workouts/back.jpg'),
};

export default function PhaseDetailsScreen() {
  const { phaseId, mode: modeParam } = useLocalSearchParams();
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const router = useRouter();
  const { user, accountType } = useAuthStore();
  const pathname = usePathname();
  const isStudentView =
    pathname.includes('/students/') ||
    accountType === 'student' ||
    (accountType === 'member' && mode === 'execute');

  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const {
    currentPeriodizationPhases,
    updateTrainingPlan,
    deleteTrainingPlan,
    createWorkout,
    fetchWorkoutsForPhase,
    workouts,
    libraryWorkouts,
    fetchLastWorkoutSession,
  } = useWorkoutStore();

  const phase = currentPeriodizationPhases.find((p) => p.id === phaseId);

  const [_showStartPicker, setShowStartPicker] = useState(false);
  const [_showEndPicker, setShowEndPicker] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [customSplit, setCustomSplit] = useState('');
  const [pendingSplit, setPendingSplit] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedWorkout, setSuggestedWorkout] = useState<
    ReturnType<typeof useWorkoutStore.getState>['workouts'][0] | null
  >(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryMuscle, setSelectedLibraryMuscle] = useState<string | null>(null);
  const [showStatusModalMenu, setShowStatusModalMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
  });

  const showAlert = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setStatusModal({ visible: true, title, message, type });
    },
    []
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      type: 'danger' | 'warning' | 'info' = 'info',
      confirmText?: string
    ) => {
      setConfirmModal({ visible: true, title, message, onConfirm, type, confirmText });
    },
    []
  );

  const { fetchWorkouts } = useWorkoutStore();

  useEffect(() => {
    if (showLibraryModal && user?.id) {
      fetchWorkouts(user.id);
    }
  }, [showLibraryModal, user?.id, fetchWorkouts]);

  const libraryWorkoutsFiltered = useMemo(() => {
    return libraryWorkouts.filter((w) => {
      const matchesSearch = w.title.toLowerCase().includes(librarySearch.toLowerCase());
      const matchesMuscle = !selectedLibraryMuscle || w.muscle_group === selectedLibraryMuscle;
      return matchesSearch && matchesMuscle;
    });
  }, [libraryWorkouts, librarySearch, selectedLibraryMuscle]);
  const [isWorkoutDoneToday, setIsWorkoutDoneToday] = useState(false);

  const splits = ['A', 'AB', 'ABC', 'ABCD', 'ABCDE', 'ABCDEF'];

  useEffect(() => {
    if (phase?.id) {
      fetchWorkoutsForPhase(phase.id);
    }
  }, [phase?.id, fetchWorkoutsForPhase]);

  useEffect(() => {
    const determineSuggested = async () => {
      if (!user?.id || workouts.length === 0) return;

      const lastSession = await fetchLastWorkoutSession(user.id);

      if (!lastSession) {
        // No history, suggest first one
        setSuggestedWorkout(workouts[0]);
        return;
      }

      // Check if done today (considering "gym day" starts at 4am)
      // This handles cases where user trains after midnight (e.g. 1AM) and considers it "yesterday's" workout
      const getGymDateString = (date: Date) => {
        const adjustedDate = new Date(date);
        adjustedDate.setHours(adjustedDate.getHours() - 4);
        return adjustedDate.toDateString();
      };

      const lastDate = getGymDateString(new Date(lastSession.completed_at ?? ''));
      const today = getGymDateString(new Date());

      if (lastDate === today) {
        setIsWorkoutDoneToday(true);
      }

      const lastIndex = workouts.findIndex((w) => w.id === lastSession.workout_id);

      if (lastIndex === -1) {
        // Last workout not in this list (maybe from another phase), suggest first
        setSuggestedWorkout(workouts[0]);
      } else {
        // Suggest next, rotating
        const nextIndex = (lastIndex + 1) % workouts.length;
        setSuggestedWorkout(workouts[nextIndex]);
      }
    };

    determineSuggested();
  }, [workouts, user?.id, fetchLastWorkoutSession]);

  const _handleUpdateDate = useCallback(
    async (type: 'start' | 'end', date: Date) => {
      if (!phase) return;
      try {
        await updateTrainingPlan(phase.id, {
          [type === 'start' ? 'start_date' : 'end_date']: date.toISOString().split('T')[0],
        });
      } catch (_error: unknown) {
        Alert.alert('Erro', 'Não foi possível atualizar a data.');
      }
    },
    [phase, updateTrainingPlan]
  );

  const handleSelectSplit = useCallback(
    async (split?: string) => {
      if (!phase || !user?.id) return;

      const finalSplit = split || customSplit.toUpperCase().trim();

      if (!finalSplit) {
        showAlert('Atenção', 'Digite uma divisão de treino válida.', 'warning');
        return;
      }

      // Validate that split only contains letters
      if (!/^[A-Z]+$/.test(finalSplit)) {
        showAlert('Erro', 'A divisão deve conter apenas letras (A-Z).', 'error');
        return;
      }

      // Whether it's a new split or changing an existing one, we present the choice
      // via the Warning/Selection Modal
      setPendingSplit(finalSplit);
      setShowWarningModal(true);
      if (showSplitModal) setShowSplitModal(false);
    },
    [phase, user?.id, customSplit, showAlert, showSplitModal]
  );

  const executeSplitChange = useCallback(
    async (finalSplit: string) => {
      if (!phase || !user?.id) return;

      setIsGenerating(true);
      try {
        // Create empty workouts for each letter in the split
        // Delete old workouts first
        const { error: deleteError } = await supabase
          .from('workouts')
          .delete()
          .eq('training_plan_id', phase.id);

        if (deleteError) throw deleteError;

        // Create empty workouts for each letter
        for (const letter of finalSplit.split('')) {
          await createWorkout({
            training_plan_id: phase.id,
            title: `Treino ${letter}`,
            description: '',
            specialist_id: user.id,
          });
        }

        await fetchWorkoutsForPhase(phase.id);
        setShowSplitModal(false);
        setCustomSplit('');
        showAlert(
          'Sucesso! 🏋️',
          `Treinos vazios criados para divisão ${finalSplit}. Adicione exercícios manualmente ou use o Co-Pilot.`,
          'success'
        );
      } catch (_error: unknown) {
        showAlert('Erro', 'Não foi possível criar os treinos.', 'error');
      } finally {
        setIsGenerating(false);
      }
    },
    [phase, user?.id, createWorkout, fetchWorkoutsForPhase, showAlert]
  );

  const handleAIAssist = useCallback(
    async (split?: string) => {
      if (!phase) return;

      const finalSplit = split || customSplit.toUpperCase().trim();

      if (!finalSplit) {
        showAlert('Atenção', 'Selecione ou digite uma divisão primeiro.', 'warning');
        return;
      }

      setShowSplitModal(false);
      setCustomSplit('');
      setShowAIModal(true);
    },
    [phase, customSplit, showAlert]
  );

  const _handleToggleStatus = useCallback(() => {
    if (!phase) return;

    setShowStatusModalMenu(true);
  }, [phase]);

  const handleUpdateStatus = useCallback(
    async (newStatus: 'planned' | 'active' | 'completed') => {
      if (!phase) return;

      const statusLabel =
        newStatus === 'planned' ? 'Planejado' : newStatus === 'active' ? 'Ativo' : 'Concluído';

      try {
        await updateTrainingPlan(phase.id, { status: newStatus });
        setShowStatusModalMenu(false);
        showAlert('Sucesso! ✨', `O status da fase foi alterado para ${statusLabel}.`, 'success');
      } catch (_error: unknown) {
        showAlert('Erro', 'Houve um problema ao atualizar o status.', 'error');
      }
    },
    [phase, updateTrainingPlan, showAlert]
  );

  const handleDeletePhase = useCallback(async () => {
    if (!phase) return;

    showConfirm(
      'Excluir Fase',
      `Tem certeza que deseja excluir a fase "${phase.name}"? Todos os treinos desta fase serão perdidos permanentemente.`,
      async () => {
        try {
          await deleteTrainingPlan(phase.id);
          // Small delay for the confirm modal to disappear
          setTimeout(() => {
            showAlert(
              'Fase Excluída',
              'A fase e seus treinos foram removidos com sucesso.',
              'success'
            );
            router.back();
          }, 500);
        } catch (_error: unknown) {
          showAlert('Erro', 'Não foi possível excluir a fase no momento.', 'error');
        }
      },
      'danger',
      'Excluir'
    );
  }, [phase, showConfirm, deleteTrainingPlan, showAlert, router]);

  const handleCreateWorkout = useCallback(async () => {
    if (!phase || !user?.id) return;
    try {
      await createWorkout({
        training_plan_id: phase.id,
        title: 'Novo Treino',
        description: '',
        specialist_id: user.id,
      });
      showAlert('Treino Criado 🏋️', 'Novo treino adicionado com sucesso à sua fase.', 'success');
    } catch (_error: unknown) {
      showAlert('Erro', 'Ocorreu um erro ao criar o treino.', 'error');
    }
  }, [phase, user?.id, createWorkout, showAlert]);

  if (!phase) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#71717A" />
        <Text className="text-white text-xl font-bold mt-4 text-center font-display">
          Fase não encontrada
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-800 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-bold">Voltar</Text>
        </TouchableOpacity>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-8">
          <IconButton
            accessibilityLabel="Voltar"
            icon="chevron-back"
            onPress={() => router.back()}
          />

          <View className="items-center">
            <Text className="text-white text-2xl font-extrabold font-display tracking-tight">
              {phase.name}
            </Text>
            <View className="mt-1">
              <StatusBadge status={phase.status} />
            </View>
          </View>

          {!isStudentView ? (
            <View className="flex-row gap-2">
              <IconButton
                accessibilityLabel="Alterar status da fase"
                icon={
                  phase.status === 'planned'
                    ? 'document-text-outline'
                    : phase.status === 'active'
                      ? 'play-outline'
                      : 'checkmark-done-outline'
                }
                onPress={() => setShowStatusModalMenu(true)}
                iconColor={
                  phase.status === 'planned'
                    ? colors.status.warning
                    : phase.status === 'active'
                      ? colors.status.success
                      : colors.text.muted
                }
                size={20}
              />
              <IconButton
                accessibilityLabel="Excluir"
                icon="trash-outline"
                variant="danger"
                onPress={handleDeletePhase}
                size={20}
              />
            </View>
          ) : (
            <View className="w-12" />
          )}
        </View>

        {/* Premium Training Split Card */}
        <LinearGradient
          colors={['#1C1C1E', '#0C0C0E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[32px] p-6 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          {/* Elegant Glow Effect */}
          <View
            className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full"
            style={{ filter: 'blur(60px)' }}
          />
          <View
            className="absolute -bottom-20 -left-20 w-48 h-48 bg-zinc-500/5 rounded-full"
            style={{ filter: 'blur(50px)' }}
          />

          <View className="flex-row justify-between mb-6">
            <View className="flex-1">
              <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                Divisão de Treino
              </Text>
              <TouchableOpacity
                activeOpacity={isStudentView ? 1 : 0.7}
                onPress={() => !isStudentView && setShowSplitModal(true)}
                className="flex-row items-center bg-white/5 self-start px-4 py-2.5 rounded-2xl border border-white/5"
              >
                <Text className="text-white font-extrabold text-xl mr-2 uppercase">
                  {phase.name || '--'}
                </Text>
                {!isStudentView && <Ionicons name="chevron-down" size={16} color="#CCFF00" />}
              </TouchableOpacity>
            </View>

            <View className="items-end">
              <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                Frequência
              </Text>
              <View
                className="flex-row items-center bg-orange-500/10 px-4 py-2.5 rounded-2xl border border-orange-500/20"
                style={{ borderColor: `${colors.primary.start}33` }}
              >
                <Ionicons
                  name="fitness-outline"
                  size={16}
                  color={colors.primary.start}
                  style={{ marginRight: 8 }}
                />
                <Text className="font-extrabold text-lg" style={{ color: colors.primary.start }}>
                  —
                </Text>
              </View>
            </View>
          </View>

          <View className="h-[1px] bg-white/5 mb-6" />

          <View className="flex-row justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                Início
              </Text>
              <TouchableOpacity
                activeOpacity={isStudentView ? 1 : 0.7}
                onPress={() => !isStudentView && setShowStartPicker(true)}
                className="bg-white/5 p-3 rounded-2xl border border-white/5 flex-row items-center justify-between"
              >
                <Text className="text-zinc-300 font-bold text-sm">
                  {phase.start_date ? new Date(phase.start_date).toLocaleDateString('pt-BR') : '—'}
                </Text>
                {!isStudentView && <Ionicons name="calendar-outline" size={14} color="#52525B" />}
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                Término
              </Text>
              <TouchableOpacity
                activeOpacity={isStudentView ? 1 : 0.7}
                onPress={() => !isStudentView && setShowEndPicker(true)}
                className="bg-white/5 p-3 rounded-2xl border border-white/10 flex-row items-center justify-between"
              >
                <Text className="text-zinc-300 font-bold text-sm">
                  {phase.end_date ? new Date(phase.end_date).toLocaleDateString('pt-BR') : '—'}
                </Text>
                {!isStudentView && <Ionicons name="calendar-outline" size={14} color="#52525B" />}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {isStudentView && (
          <>
            <Text className="text-white font-bold text-lg mb-4 font-display">Treino do Dia</Text>

            {workouts.length === 0 ? (
              <View className="items-center justify-center py-10">
                <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
                  <Ionicons name="walk" size={64} color="#52525B" />
                </View>
                <Text className="text-zinc-500 font-sans text-center">
                  Nenhum treino cadastrado nesta fase.
                </Text>
              </View>
            ) : (
              <>
                {/* Suggested Workout Card */}
                {suggestedWorkout && (
                  <TouchableOpacity
                    activeOpacity={isWorkoutDoneToday ? 1 : 0.9}
                    onPress={() => {
                      const proceedToWorkout = () => {
                        const isSpecialistOrPersonal =
                          (accountType as string) === 'personal' ||
                          (accountType as string) === 'specialist';
                        if (isSpecialistOrPersonal) {
                          router.push({
                            pathname: '/(tabs)/workouts/details/[id]' as never,
                            params: {
                              id: suggestedWorkout.id,
                              workoutId: suggestedWorkout.id,
                              studentId: user?.id,
                            },
                          });
                        } else {
                          router.push({
                            pathname: `/(tabs)/workouts/details/${suggestedWorkout.id}` as never,
                            params: mode === 'execute' ? { mode: 'execute' } : {},
                          });
                        }
                      };

                      if (isWorkoutDoneToday) {
                        Alert.alert(
                          'Meta Atingida! 🏆',
                          'Você já treinou hoje. Descanse para voltar mais forte amanhã!'
                        );
                        return;
                      }

                      proceedToWorkout();
                    }}
                    className="mb-8"
                  >
                    <PremiumCard
                      title={isWorkoutDoneToday ? 'Treino Finalizado' : suggestedWorkout.title}
                      subtitle={
                        isWorkoutDoneToday
                          ? `Bom descanso! O próximo treino será: ${suggestedWorkout.title}`
                          : `${suggestedWorkout.exercises?.length || 0} exercícios • ~60 min`
                      }
                      image={
                        isWorkoutDoneToday
                          ? undefined
                          : MUSCLE_IMAGES[suggestedWorkout.muscle_group || 'Geral'] ||
                            MUSCLE_IMAGES.Geral
                      }
                      onPress={() => {
                        const proceedToWorkout = () => {
                          const isSpecialistOrPersonal =
                            (accountType as string) === 'personal' ||
                            (accountType as string) === 'specialist';
                          if (isSpecialistOrPersonal) {
                            router.push({
                              pathname: '/(tabs)/workouts/details/[id]' as never,
                              params: {
                                id: suggestedWorkout.id,
                                workoutId: suggestedWorkout.id,
                                studentId: user?.id,
                              },
                            });
                          } else {
                            router.push({
                              pathname: `/(tabs)/workouts/details/${suggestedWorkout.id}` as never,
                              params: mode === 'execute' ? { mode: 'execute' } : {},
                            });
                          }
                        };

                        if (isWorkoutDoneToday) {
                          Alert.alert(
                            'Meta Atingida! 🏆',
                            'Você já treinou hoje. Descanse para voltar mais forte amanhã!'
                          );
                          return;
                        }
                        proceedToWorkout();
                      }}
                      containerStyle={isWorkoutDoneToday ? { opacity: 0.8 } : {}}
                      badge={
                        <View
                          className={`${isWorkoutDoneToday ? 'bg-zinc-800' : 'bg-black/40'} px-3 py-1 rounded-full border border-white/10 self-start`}
                        >
                          <Text
                            className={`${isWorkoutDoneToday ? 'text-zinc-400' : 'text-white'} font-bold text-[10px] uppercase tracking-wider`}
                          >
                            {isWorkoutDoneToday ? 'Concluído' : 'Sugerido para hoje'}
                          </Text>
                        </View>
                      }
                      icon={isWorkoutDoneToday ? 'checkmark-circle' : 'flame'}
                      iconColor={isWorkoutDoneToday ? '#4ADE80' : 'white'}
                    >
                      {!isWorkoutDoneToday && (
                        <View className="mt-4 bg-orange-500 py-3 rounded-2xl items-center shadow-lg shadow-orange-500/40">
                          <Text className="text-white font-bold text-base uppercase tracking-widest">
                            Começar Treino
                          </Text>
                        </View>
                      )}
                    </PremiumCard>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* List Header */}
        <View className="flex-row items-center justify-between mb-4 mt-6">
          <View className="flex-row items-center">
            <Text className="text-zinc-400 font-bold text-sm uppercase tracking-wider">
              Treinos da Fase
            </Text>
            <View className="bg-zinc-800 px-2 py-0.5 rounded-md ml-2">
              <Text className="text-zinc-500 text-[10px] font-bold">
                {
                  (selectedMuscle
                    ? workouts.filter((w) => w.muscle_group === selectedMuscle)
                    : workouts
                  ).length
                }
              </Text>
            </View>
          </View>

          {!isStudentView && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowAIModal(true)}
                className="flex-row items-center bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20"
                style={{ borderColor: `${colors.primary.start}33` }}
              >
                <Ionicons name="sparkles" size={14} color="#CCFF00" style={{ marginRight: 6 }} />
                <Text className="text-orange-500 font-bold text-xs uppercase">CO-PILOT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLibraryModal(true)}
                className="flex-row items-center"
              >
                <Ionicons name="library" size={14} color="#71717A" style={{ marginRight: 6 }} />
                <Text className="text-zinc-500 font-bold text-xs">IMPORTAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateWorkout}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700"
              >
                <Ionicons name="add" size={18} color="#E4E4E7" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Modal */}
        {phase && user?.id && (
          <AIWorkoutNegotiationModal
            visible={showAIModal}
            onClose={() => setShowAIModal(false)}
            trainingPlanId={phase.id}
            split={'ABC'}
            goal={phase.name || 'Hipertrofia'}
            studentId={(phase as unknown as { student_id: string }).student_id} // Assuming phase has student_id or we get it from context
          />
        )}

        {/* Smart Filters Carousel */}
        <MuscleFilterCarousel
          selectedMuscle={selectedMuscle}
          onSelectMuscle={setSelectedMuscle}
          containerStyle={{ marginBottom: 24 }}
        />

        {/* Other Workouts List - Filtered */}
        {(selectedMuscle
          ? workouts.filter((w) => w.muscle_group === selectedMuscle)
          : workouts
        ).map((workout) => (
          <TouchableOpacity
            key={workout.id}
            className={`bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-3 flex-row justify-between items-center ${isStudentView && workout.id === suggestedWorkout?.id ? 'opacity-50' : ''} ${isStudentView && isWorkoutDoneToday ? 'opacity-30' : ''}`}
            onPress={() => {
              const proceedToWorkout = () => {
                const isSpecialistOrPersonal =
                  (accountType as string) === 'personal' ||
                  (accountType as string) === 'specialist';
                if (isSpecialistOrPersonal) {
                  router.push({
                    pathname: '/(tabs)/workouts/details/[id]' as never,
                    params: { id: workout.id, workoutId: workout.id, studentId: user?.id },
                  });
                } else if (isStudentView && accountType !== 'member') {
                  router.push(
                    `/(tabs)/students/${user?.id}/workouts/details/${workout.id}` as never
                  );
                } else {
                  router.push({
                    pathname: `/(tabs)/workouts/details/${workout.id}` as never,
                    params: mode === 'execute' ? { mode: 'execute' } : {},
                  });
                }
              };

              if (isStudentView && isWorkoutDoneToday) {
                Alert.alert(
                  'Treino Realizado',
                  'Você já registrou um treino hoje. Deseja realizar outro treino?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sim, Treinar', onPress: proceedToWorkout },
                  ]
                );
                return;
              }

              proceedToWorkout();
            }}
          >
            <View className="flex-row items-center flex-1">
              <View
                className={`w-14 h-14 rounded-2xl overflow-hidden mr-4 border border-zinc-800 ${isStudentView && isWorkoutDoneToday ? 'opacity-50' : ''}`}
              >
                <ImageBackground
                  source={MUSCLE_IMAGES[workout.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
                  className="w-full h-full items-center justify-center"
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
                    className="w-full h-full items-center justify-center"
                  >
                    <Text className="text-white font-bold text-xs">{workout.title.charAt(0)}</Text>
                  </LinearGradient>
                </ImageBackground>
              </View>
              <View>
                <Text
                  className={`text-base font-bold ${isStudentView && workout.id === suggestedWorkout?.id ? 'text-zinc-400' : 'text-white'}`}
                >
                  {workout.title}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <Ionicons
                    name="barbell-outline"
                    size={10}
                    color="#71717A"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    {workout.muscle_group || 'Geral'} • {workout.exercises?.length || 0} exercícios
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#52525B" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Split Selection Modal */}
      <Modal
        visible={showSplitModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isGenerating) {
            setShowSplitModal(false);
            setCustomSplit('');
          }
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/80 justify-center items-center p-6"
          activeOpacity={1}
          onPress={() => {
            if (!isGenerating) {
              setShowSplitModal(false);
              setCustomSplit('');
            }
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-zinc-900 w-full rounded-2xl p-6 border border-zinc-800 relative">
              <TouchableOpacity
                className="absolute top-4 right-4 z-10 p-2"
                onPress={() => {
                  if (!isGenerating) {
                    setShowSplitModal(false);
                    setCustomSplit('');
                  }
                }}
              >
                <Ionicons name="close" size={24} color="#71717A" />
              </TouchableOpacity>

              <Text className="text-white text-xl font-bold mb-2 text-center font-display mt-2">
                Divisão de Treino
              </Text>

              {isGenerating ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#CCFF00" />
                  <Text className="text-zinc-400 text-sm mt-4 text-center">
                    Gerando treinos para a divisão...
                  </Text>
                  <Text className="text-zinc-600 text-xs mt-2 text-center">
                    Isso pode levar alguns segundos.
                  </Text>
                </View>
              ) : (
                <>
                  <Text className="text-zinc-400 text-sm mb-6 text-center">
                    Cada letra representa um treino. Ex: ABC = Treino A, B e C
                  </Text>

                  {/* Custom Input */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-xs mb-2 font-semibold">
                      DIVISÃO CUSTOMIZADA
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        value={customSplit}
                        onChangeText={(text: string) => setCustomSplit(text.toUpperCase())}
                        placeholder="Ex: ABCD"
                        placeholderTextColor="#52525B"
                        maxLength={10}
                        autoCapitalize="characters"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold text-lg"
                      />
                      <TouchableOpacity
                        className="bg-orange-500 px-6 py-3 rounded-xl items-center justify-center"
                        onPress={() => handleSelectSplit()}
                      >
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quick Select */}
                  <Text className="text-zinc-400 text-xs mb-3 font-semibold">SELEÇÃO RÁPIDA</Text>
                  <View className="flex-row flex-wrap justify-center gap-3 mb-4">
                    {splits.map((split) => (
                      <TouchableOpacity
                        key={split}
                        className={`px-6 py-4 rounded-xl border ${
                          pendingSplit === split
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                        onPress={() => handleSelectSplit(split)}
                      >
                        <Text
                          className={`font-bold text-lg ${
                            pendingSplit === split ? 'text-white' : 'text-zinc-400'
                          }`}
                        >
                          {split}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* AI Assist Button Removed - Handled in Confirmation Modal */}
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Warning/Selection Modal */}
      <Modal
        visible={showWarningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWarningModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/80 justify-center items-center p-4"
          activeOpacity={1}
          onPress={() => setShowWarningModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[90%] max-w-[400px]"
          >
            <View className="bg-zinc-900 w-full rounded-[24px] p-6 border border-zinc-800 items-center shadow-2xl">
              {/* Header Icon - Slightly smaller container for better proportion */}
              <View className="w-16 h-16 rounded-full bg-orange-500/10 items-center justify-center border border-orange-500/20 mb-5">
                <Ionicons name="options" size={32} color="#CCFF00" />
              </View>

              <Text className="text-white text-xl font-extrabold mb-2 text-center font-display">
                Configurar Treinos
              </Text>

              <Text className="text-zinc-400 text-center font-sans mb-8 leading-relaxed text-sm px-2">
                {workouts.length > 0
                  ? `Mudar a divisão para ${pendingSplit} irá excluir os treinos atuais.\nComo deseja prosseguir?`
                  : `Divisão ${pendingSplit} selecionada.\nComo deseja criar seus treinos?`}
              </Text>

              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowWarningModal(false);
                    // Helper to proceed with AI
                    const proceedWithAI = async () => {
                      if (workouts.length > 0) {
                        setIsGenerating(true);
                        try {
                          const { error } = await supabase
                            .from('workouts')
                            .delete()
                            .eq('training_plan_id', phase.id);

                          if (error) throw error;
                          await fetchWorkoutsForPhase(phase.id);
                        } catch (_error) {
                          setIsGenerating(false);
                          showAlert('Erro', 'Falha ao limpar treinos antigos.', 'error');
                          return;
                        } finally {
                          setIsGenerating(false);
                        }
                      }
                      handleAIAssist(pendingSplit);
                    };
                    proceedWithAI();
                  }}
                  activeOpacity={0.9}
                  className="w-full"
                >
                  <LinearGradient
                    colors={['#CCFF00', '#A3CC00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="py-4 rounded-xl items-center justify-center shadow-lg"
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="sparkles"
                        size={20}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-bold text-base font-display uppercase tracking-wider">
                        Usar Co-Pilot
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 items-center justify-center"
                  onPress={() => {
                    setShowWarningModal(false);
                    setTimeout(() => {
                      executeSplitChange(pendingSplit);
                    }, 200);
                  }}
                >
                  <Text className="text-white font-bold text-base font-display uppercase tracking-wider">
                    Treinos Vazios
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-full py-3 items-center justify-center mt-2"
                  onPress={() => {
                    setShowWarningModal(false);
                    setPendingSplit('');
                  }}
                >
                  <Text className="text-zinc-500 font-bold text-sm">Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* Library Import Modal */}
      <Modal
        visible={showLibraryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLibraryModal(false)}
      >
        <View className="flex-1 bg-black/95 pt-20">
          <View className="px-6 flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-3xl font-extrabold text-white font-display">Biblioteca</Text>
              <Text className="text-zinc-400 text-sm">Toque num modelo para importar</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLibraryModal(false)}
              className="w-10 h-10 bg-zinc-900 rounded-full items-center justify-center border border-zinc-800"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search & Filter */}
          <View className="px-6 mb-6">
            <View className="bg-zinc-900 flex-row items-center px-4 py-3 rounded-2xl border border-zinc-800 mb-4">
              <Ionicons
                name="search"
                size={20}
                color={colors.text.muted}
                style={{ marginRight: 12 }}
              />
              <TextInput
                placeholder="Buscar na biblioteca..."
                placeholderTextColor={colors.text.muted}
                className="flex-1 text-white font-medium"
                value={librarySearch}
                onChangeText={setLibrarySearch}
              />
            </View>

            <MuscleFilterCarousel
              selectedMuscle={selectedLibraryMuscle}
              onSelectMuscle={setSelectedLibraryMuscle}
            />
          </View>

          {/* Library List */}
          <FlatList
            data={libraryWorkoutsFiltered}
            keyExtractor={(item) => `lib-${item.id}`}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await useWorkoutStore.getState().duplicateWorkout(item.id, phaseId as string);
                    setShowLibraryModal(false);
                    showAlert(
                      'Sucesso! 🚀',
                      'Treino importado com sucesso para esta fase.',
                      'success'
                    );
                  } catch (_e) {
                    showAlert('Erro', 'Não foi possível importar o treino selecionado.', 'error');
                  }
                }}
                className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-4 flex-row items-center"
              >
                <View className="w-12 h-12 rounded-xl overflow-hidden mr-4">
                  <ImageBackground
                    source={MUSCLE_IMAGES[item.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
                    className="w-full h-full"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">{item.title}</Text>
                  <Text className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                    {item.muscle_group || 'Geral'} • {item.difficulty || 'Iniciante'}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color={colors.primary.start} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center py-20">
                <Ionicons name="search" size={64} color="#27272A" />
                <Text className="text-zinc-600 mt-4">Nenhum modelo encontrado</Text>
              </View>
            }
          />
        </View>
      </Modal>
      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModalMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModalMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowStatusModalMenu(false)}
          className="flex-1 bg-black/80 justify-center px-6"
        >
          <View className="bg-zinc-950 rounded-[32px] border border-white/10 p-6 shadow-2xl overflow-hidden">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />

            <Text className="text-white text-xl font-extrabold font-display mb-1 text-center">
              Status da Fase
            </Text>
            <Text className="text-zinc-500 text-sm mb-6 text-center">
              Escolha a etapa atual desta periodização
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => handleUpdateStatus('planned')}
                className={`flex-row items-center p-4 rounded-2xl border ${phase.status === 'planned' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/5'}`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${phase.status === 'planned' ? 'bg-orange-500/20' : 'bg-zinc-900'}`}
                >
                  <Ionicons
                    name="document-text"
                    size={20}
                    color={phase.status === 'planned' ? '#CCFF00' : '#71717A'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold ${phase.status === 'planned' ? 'text-white' : 'text-zinc-300'}`}
                  >
                    Rascunho
                  </Text>
                  <Text className="text-zinc-500 text-xs text-wrap">
                    Fase em planejamento, não visível ao aluno
                  </Text>
                </View>
                {phase.status === 'planned' && (
                  <Ionicons name="checkmark-circle" size={20} color="#CCFF00" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleUpdateStatus('active')}
                className={`flex-row items-center p-4 rounded-2xl border ${phase.status === 'active' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${phase.status === 'active' ? 'bg-green-500/20' : 'bg-zinc-900'}`}
                >
                  <Ionicons
                    name="play"
                    size={20}
                    color={phase.status === 'active' ? '#00C9A7' : '#71717A'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold ${phase.status === 'active' ? 'text-white' : 'text-zinc-300'}`}
                  >
                    Ativo
                  </Text>
                  <Text className="text-zinc-500 text-xs text-wrap">
                    Fase em execução pelo aluno
                  </Text>
                </View>
                {phase.status === 'active' && (
                  <Ionicons name="checkmark-circle" size={20} color="#00C9A7" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleUpdateStatus('completed')}
                className={`flex-row items-center p-4 rounded-2xl border ${phase.status === 'completed' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5'}`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${phase.status === 'completed' ? 'bg-blue-500/20' : 'bg-zinc-900'}`}
                >
                  <Ionicons
                    name="checkmark-done"
                    size={20}
                    color={phase.status === 'completed' ? '#3B82F6' : '#71717A'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold ${phase.status === 'completed' ? 'text-white' : 'text-zinc-300'}`}
                  >
                    Concluído
                  </Text>
                  <Text className="text-zinc-500 text-xs text-wrap">
                    Fase finalizada e arquivada para consulta
                  </Text>
                </View>
                {phase.status === 'completed' && (
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowStatusModalMenu(false)}
              className="mt-6 bg-zinc-900 py-4 rounded-2xl border border-white/5"
            >
              <Text className="text-white font-bold text-center">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Global Status Alert Modal */}
      <StatusModal
        visible={statusModal.visible}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />

      {/* Global Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </ScreenLayout>
  );
}
