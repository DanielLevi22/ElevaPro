import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { MuscleFilterCarousel } from '@/components/workout/MuscleFilterCarousel';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { EstadoDaTela } from '../components/aluno/EstadoDaTela';
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

const ICONE_DO_STATUS = {
  planned: 'document-text-outline',
  active: 'play-outline',
  completed: 'checkmark-done-outline',
} as const;

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
  const goToWizardBuild = useCallback(
    (split?: string) => {
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
      if (split) wizard.setSplit(split);
      wizard.setCreatedStructure(periodizacao.id, phase.id);
      router.push({
        pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
        params: { studentId: periodizacao.student_id },
      });
    },
    [phase, periodizations, wizard, router]
  );

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

  const handleDeletePhase = useCallback(async () => {
    if (!phase) return;

    showConfirm({
      title: 'Excluir fase',
      message: `Tem certeza que deseja excluir a fase "${phase.name}"? Todos os treinos desta fase serão perdidos permanentemente.`,
      type: 'danger',
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await deleteTrainingPlan(phase.id);
          router.back();
        } catch {
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
          message: 'Treino importado com sucesso.',
          type: 'success',
        });
      } catch {
        showAlert({
          title: 'Erro',
          message: 'Não foi possível importar o treino selecionado.',
          type: 'error',
        });
      }
    },
    [phaseId]
  );

  if (!phase) return <EstadoDaTela naoEncontrado mensagem="Fase não encontrada." />;

  const filteredWorkouts = selectedMuscle
    ? workouts.filter((w) => w.muscle_group === selectedMuscle)
    : workouts;

  return (
    <GlassScreen>
      <View className="flex-row items-center justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />

        <View className="items-center">
          <Text className="text-[1.1875rem] font-bold tracking-tight text-hero">{phase.name}</Text>
          <View className="mt-1">
            <StatusBadge status={phase.status} />
          </View>
        </View>

        {!isStudentView ? (
          <View className="flex-row gap-2">
            <BotaoDeIconePlano
              icone={
                ICONE_DO_STATUS[phase.status as keyof typeof ICONE_DO_STATUS] ?? 'ellipse-outline'
              }
              rotulo="Alterar status da fase"
              onPress={() => splitFlow.setShowStatusModalMenu(true)}
            />
            <BotaoDeIconePlano
              icone="trash-outline"
              rotulo="Excluir fase"
              onPress={handleDeletePhase}
              perigo
            />
          </View>
        ) : (
          <View className="w-[2.375rem]" />
        )}
      </View>

      <View className="mt-4">
        <PhaseSummaryCard
          phase={phase}
          isStudentView={isStudentView}
          onPressSplit={() => splitFlow.setShowSplitModal(true)}
          onPressStart={() => {}}
          onPressEnd={() => {}}
        />
      </View>

      {isStudentView && (
        <>
          <TituloDeSecao>Treino do dia</TituloDeSecao>
          {workouts.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Ionicons name="walk" size={escalar(64)} color={cores.mutedForeground} />
              <Text className="mt-4 text-center text-[0.8125rem] text-muted-foreground">
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

      <TituloDeSecao estilo="rotulo" acao={`${filteredWorkouts.length}`}>
        Treinos da fase
      </TituloDeSecao>

      {!isStudentView && (
        <View className="mb-3 flex-row items-center gap-2">
          <Row icon="sparkles" title="Co-Pilot" onPress={() => goToWizardBuild()} chevron />
        </View>
      )}
      {!isStudentView && (
        <View className="mb-3 flex-row gap-2">
          <Row
            icon="library-outline"
            title="Importar da biblioteca"
            onPress={() => setShowLibraryModal(true)}
            chevron
          />
        </View>
      )}

      <View className="mb-4">
        <MuscleFilterCarousel selectedMuscle={selectedMuscle} onSelectMuscle={setSelectedMuscle} />
      </View>

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

      {!isStudentView ? (
        <Row icon="add-circle-outline" title="Adicionar treino" onPress={() => goToWizardBuild()} />
      ) : null}

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
    </GlassScreen>
  );
}

function BotaoDeIconePlano({
  icone,
  rotulo,
  onPress,
  perigo = false,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  onPress: () => void;
  perigo?: boolean;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className="h-[2.375rem] w-[2.375rem] items-center justify-center rounded-full bg-muted"
    >
      <Ionicons
        name={icone}
        size={escalar(18)}
        color={perigo ? cores.destructive : cores.foreground}
      />
    </TouchableOpacity>
  );
}
