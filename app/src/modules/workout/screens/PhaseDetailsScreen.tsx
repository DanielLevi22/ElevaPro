import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MuscleFilterCarousel } from '@/components/workout/MuscleFilterCarousel';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { PhaseLibraryModal } from '../components/PhaseLibraryModal';
import { PhaseSplitConfirmModal } from '../components/PhaseSplitConfirmModal';
import { PhaseSplitModal } from '../components/PhaseSplitModal';
import { PhaseStatusModal } from '../components/PhaseStatusModal';
import { PhaseSummaryCard } from '../components/PhaseSummaryCard';
import { SuggestedWorkoutCard } from '../components/SuggestedWorkoutCard';
import { WorkoutListItem } from '../components/WorkoutListItem';
import { usePhaseSplitFlow } from '../hooks/usePhaseSplitFlow';
import { useSuggestedWorkout } from '../hooks/useSuggestedWorkout';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const SPLITS = ['A', 'AB', 'ABC', 'ABCD', 'ABCDE', 'ABCDEF'];

export default function PhaseDetailsScreen() {
  const { phaseId, mode: modeParam } = useLocalSearchParams();
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const { user, accountType } = useAuthStore();
  // `/students/[id]/...` é navegação exclusiva do especialista olhando a ficha
  // de um aluno — não é o aluno vendo o próprio treino. Contar o pathname aqui
  // fazia o especialista, ao entrar por essa ficha, cair na versão só-leitura
  // desta tela, que devia ser exclusiva de quem é de fato aluno/membro em execução.
  const isStudentView =
    accountType === 'student' || (accountType === 'member' && mode === 'execute');

  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const {
    currentPeriodizationPhases,
    periodizations,
    deleteTrainingPlan,
    createWorkout,
    deleteWorkoutsForPhase,
    updateTrainingPlan,
    fetchWorkoutsForPhase,
    workouts,
    libraryWorkouts,
    fetchLastWorkoutSession,
    fetchWorkouts,
  } = useWorkoutStore();
  const wizard = useWorkoutWizardStore();

  const phase = currentPeriodizationPhases.find((p) => p.id === phaseId);

  const [_showStartPicker, setShowStartPicker] = useState(false);
  const [_showEndPicker, setShowEndPicker] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryMuscle, setSelectedLibraryMuscle] = useState<string | null>(null);

  /**
   * O passo de montagem do wizard (#335) — manual e IA moram lá agora, então
   * "Adicionar treino" e "Usar Co-Pilot" desta tela convergem pro mesmo lugar
   * em vez de dois caminhos que faziam a mesma coisa de formas diferentes.
   *
   * `student_id` não vem por parâmetro de rota aqui — só pela periodização já
   * carregada no store, de quem visitou a tela de periodização antes de chegar
   * nesta fase (sempre o caso: não existe link direto pra uma fase).
   */
  const goToWizardBuild = useCallback(() => {
    if (!phase) return;
    const periodizacao = periodizations.find((p) => p.id === phase.periodization_id);
    if (!periodizacao) {
      showAlert({
        title: 'Erro',
        message:
          'Não encontrei o aluno desta fase. Abra pela lista de periodizações e tente de novo.',
        type: 'error',
      });
      return;
    }

    wizard.startFor(periodizacao.student_id, periodizacao.student?.full_name ?? 'Aluno');
    wizard.setPlanName(phase.name);
    wizard.setCreatedStructure(periodizacao.id, phase.id);
    router.push({
      pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
      params: { studentId: periodizacao.student_id },
    });
  }, [phase, periodizations, wizard, router]);

  const splitFlow = usePhaseSplitFlow({
    phase,
    userId: user?.id,
    workoutsCount: workouts.length,
    createWorkout,
    deleteWorkoutsForPhase,
    fetchWorkoutsForPhase,
    updateTrainingPlan,
    onAiReady: goToWizardBuild,
  });

  const { suggestedWorkout, isWorkoutDoneToday, goToWorkout, goToSuggestedWorkout } =
    useSuggestedWorkout({
      workouts,
      userId: user?.id,
      accountType,
      isStudentView,
      mode,
      router,
      fetchLastWorkoutSession,
    });

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

  useEffect(() => {
    if (phase?.id) {
      fetchWorkoutsForPhase(phase.id);
    }
  }, [phase?.id, fetchWorkoutsForPhase]);

  const _handleUpdateDate = useCallback(
    async (type: 'start' | 'end', date: Date) => {
      if (!phase) return;
      try {
        await updateTrainingPlan(phase.id, {
          [type === 'start' ? 'start_date' : 'end_date']: date.toISOString().split('T')[0],
        });
      } catch (_error: unknown) {
        showAlert({ title: 'Erro', message: 'Não foi possível atualizar a data.', type: 'error' });
      }
    },
    [phase, updateTrainingPlan]
  );

  const handleDeletePhase = useCallback(async () => {
    if (!phase) return;

    showConfirm({
      title: 'Excluir Fase',
      message: `Tem certeza que deseja excluir a fase "${phase.name}"? Todos os treinos desta fase serão perdidos permanentemente.`,
      type: 'danger',
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await deleteTrainingPlan(phase.id);
          // Small delay for the confirm modal to disappear
          setTimeout(() => {
            showAlert({
              title: 'Fase Excluída',
              message: 'A fase e seus treinos foram removidos com sucesso.',
              type: 'success',
            });
            router.back();
          }, 500);
        } catch (_error: unknown) {
          showAlert({
            title: 'Erro',
            message: 'Não foi possível excluir a fase no momento.',
            type: 'error',
          });
        }
      },
    });
  }, [phase, deleteTrainingPlan, router]);

  const handleImportFromLibrary = useCallback(
    async (workoutId: string) => {
      if (!phaseId) return;
      try {
        await useWorkoutStore.getState().duplicateWorkout(workoutId, phaseId as string);
        setShowLibraryModal(false);
        showAlert({
          title: 'Sucesso! 🚀',
          message: 'Treino importado com sucesso para esta fase.',
          type: 'success',
        });
      } catch (_e) {
        showAlert({
          title: 'Erro',
          message: 'Não foi possível importar o treino selecionado.',
          type: 'error',
        });
      }
    },
    [phaseId]
  );

  if (!phase) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={escalar(64)} color={cores.mutedForeground} />
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

  const filteredWorkouts = selectedMuscle
    ? workouts.filter((w) => w.muscle_group === selectedMuscle)
    : workouts;

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
                onPress={() => splitFlow.setShowStatusModalMenu(true)}
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

        <PhaseSummaryCard
          phase={phase}
          isStudentView={isStudentView}
          onPressSplit={() => splitFlow.setShowSplitModal(true)}
          onPressStart={() => setShowStartPicker(true)}
          onPressEnd={() => setShowEndPicker(true)}
        />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {isStudentView && (
          <>
            <Text className="text-white font-bold text-lg mb-4 font-display">Treino do Dia</Text>

            {workouts.length === 0 ? (
              <View className="items-center justify-center py-10">
                <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
                  <Ionicons name="walk" size={escalar(64)} color={cores.mutedForeground} />
                </View>
                <Text className="text-zinc-500 font-sans text-center">
                  Nenhum treino cadastrado nesta fase.
                </Text>
              </View>
            ) : (
              suggestedWorkout && (
                <SuggestedWorkoutCard
                  workout={suggestedWorkout}
                  isDoneToday={isWorkoutDoneToday}
                  onPress={goToSuggestedWorkout}
                />
              )
            )}
          </>
        )}

        <View className="flex-row items-center justify-between mb-4 mt-6">
          <View className="flex-row items-center">
            <Text className="text-zinc-400 font-bold text-sm uppercase tracking-wider">
              Treinos da Fase
            </Text>
            <View className="bg-zinc-800 px-2 py-0.5 rounded-md ml-2">
              <Text className="text-zinc-500 text-[0.625rem] font-bold">
                {filteredWorkouts.length}
              </Text>
            </View>
          </View>

          {!isStudentView && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={goToWizardBuild}
                className="flex-row items-center bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20"
                style={{ borderColor: `${colors.primary.start}33` }}
              >
                <Ionicons
                  name="sparkles"
                  size={escalar(14)}
                  color={cores.primary}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-orange-500 font-bold text-xs uppercase">CO-PILOT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLibraryModal(true)}
                className="flex-row items-center"
              >
                <Ionicons
                  name="library"
                  size={escalar(14)}
                  color={cores.mutedForeground}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-zinc-500 font-bold text-xs">IMPORTAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToWizardBuild}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700"
              >
                <Ionicons name="add" size={escalar(18)} color={cores.foreground} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <MuscleFilterCarousel
          selectedMuscle={selectedMuscle}
          onSelectMuscle={setSelectedMuscle}
          containerStyle={{ marginBottom: 24 }}
        />

        {filteredWorkouts.map((workout) => (
          <WorkoutListItem
            key={workout.id}
            workout={workout}
            isSuggested={workout.id === suggestedWorkout?.id}
            isWorkoutDoneToday={isWorkoutDoneToday}
            isStudentView={isStudentView}
            onPress={() => goToWorkout(workout.id)}
          />
        ))}
      </ScrollView>

      <PhaseSplitModal
        visible={splitFlow.showSplitModal}
        isGenerating={splitFlow.isGenerating}
        customSplit={splitFlow.customSplit}
        onChangeCustomSplit={splitFlow.setCustomSplit}
        pendingSplit={splitFlow.pendingSplit}
        splits={SPLITS}
        onClose={() => {
          splitFlow.setShowSplitModal(false);
          splitFlow.setCustomSplit('');
        }}
        onSelectSplit={splitFlow.handleSelectSplit}
      />

      <PhaseSplitConfirmModal
        visible={splitFlow.showWarningModal}
        pendingSplit={splitFlow.pendingSplit}
        hasExistingWorkouts={workouts.length > 0}
        onClose={splitFlow.handleCancelSplitConfirm}
        onUseAI={splitFlow.handleUseAiFromConfirm}
        onEmptyWorkouts={splitFlow.handleEmptyWorkoutsFromConfirm}
      />

      <PhaseLibraryModal
        visible={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        workouts={libraryWorkoutsFiltered}
        search={librarySearch}
        onChangeSearch={setLibrarySearch}
        selectedMuscle={selectedLibraryMuscle}
        onSelectMuscle={setSelectedLibraryMuscle}
        onImport={handleImportFromLibrary}
      />

      <PhaseStatusModal
        visible={splitFlow.showStatusModalMenu}
        status={phase.status}
        onClose={() => splitFlow.setShowStatusModalMenu(false)}
        onSelectStatus={splitFlow.handleUpdateStatus}
      />
    </ScreenLayout>
  );
}
