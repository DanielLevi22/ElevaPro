import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ShareWorkoutModal } from '@/components/workout/ShareWorkoutModal';
import { WorkoutFeedbackModal } from '@/components/workout/WorkoutFeedbackModal';
import { useVoiceCoach } from '@/hooks/useVoiceCoach';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { EditExerciseModal } from '../components/EditExerciseModal';
import { ProgressionSummaryModal } from '../components/ProgressionSummaryModal';
import { RestTimerBar } from '../components/RestTimerBar';
import { WorkoutExerciseCard } from '../components/WorkoutExerciseCard';
import { WorkoutHeader } from '../components/WorkoutHeader';
import { DEFAULT_BODY_WEIGHT, DEFAULT_REST_TIME, MIN_CALORIES_PER_HOUR } from '../constants';
import { useProgressionAnalysis } from '../hooks/useProgressionAnalysis';
import { useRestTimer } from '../hooks/useRestTimer';
import { useWorkoutStore } from '../store/workoutStore';
import type {
  EditedWorkoutItems,
  ShareStats,
  Workout,
  WorkoutItem,
  WorkoutSession,
} from '../types';

export default function ExecuteWorkoutScreen() {
  const { id, workoutId } = useLocalSearchParams();
  const router = useRouter();
  const { user, isMasquerading } = useAuthStore();
  const { workouts, fetchWorkouts, isLoading, fetchWorkoutSessionDetails } = useWorkoutStore();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const { incrementWorkoutProgress } = useGamificationStore();
  const { saveWorkoutSession } = useWorkoutStore();

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStats, setShareStats] = useState<ShareStats>({
    title: '',
    duration: '',
    calories: '',
    date: '',
    exerciseName: '',
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Exercise editing state
  const [editedWorkoutItems, setEditedWorkoutItems] = useState<EditedWorkoutItems>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkoutItem | null>(null);

  // Progression analysis state
  const [previousSession, setPreviousSession] = useState<WorkoutSession | null>(null);
  const [_previousSessionError, _setPreviousSessionError] = useState<string | null>(null);
  const [showProgressionSummary, setShowProgressionSummary] = useState(false);

  // Use custom hooks
  const progressionAnalysis = useProgressionAnalysis(
    workout,
    previousSession,
    editedWorkoutItems,
    completedSets
  );

  const {
    isResting,
    timer,
    // biome-ignore lint/correctness/noUnusedVariables: auto-suppressed during final sweep
    isActive,
    currentRestItemId,
    startRest,
    skipRest,
    pauseTimer,
    resumeTimer,
  } = useRestTimer((itemId) => {
    const item = workout?.exercises?.find((i) => i.id === itemId);
    if (item) {
      const nextSet = (completedSets[item.id] || 0) + 1;
      const effectiveItem = editedWorkoutItems[item.id] || item;
      announceSetStart(nextSet, effectiveItem.reps ?? '', effectiveItem.weight ?? undefined);
    }
  });

  const {
    isMuted,
    toggleMute,
    announceExercise,
    announceSetStart,
    announceRest,
    announceFinish,
    announceResume,
    repeatLastInstruction,
  } = useVoiceCoach();

  const handleExit = useCallback(() => {
    if (isMasquerading) {
      router.replace('/(tabs)/workouts');
    } else {
      router.back();
    }
  }, [isMasquerading, router]);

  const handleLogSet = useCallback(
    (item: WorkoutItem) => {
      if (isResting) {
        showAlert({
          title: 'Descanso',
          message: 'Aguarde o tempo de descanso terminar ou pule o descanso.',
          type: 'warning',
        });
        return;
      }

      // Use edited values if available
      const effectiveItem = editedWorkoutItems[item.id] || item;
      const currentCompleted = completedSets[item.id] || 0;

      if (currentCompleted < (effectiveItem.sets ?? 0)) {
        setCompletedSets((prev) => ({
          ...prev,
          [item.id]: currentCompleted + 1,
        }));

        if (currentCompleted + 1 < (effectiveItem.sets ?? 0)) {
          // Start rest timer
          startRest(effectiveItem.rest_seconds || DEFAULT_REST_TIME, item.id);
          announceRest(effectiveItem.rest_seconds || DEFAULT_REST_TIME);
        } else {
          // Exercise completed, announce next exercise if available
          if (workout?.exercises) {
            const myIndex = workout.exercises.indexOf(item);
            if (myIndex >= 0 && myIndex < workout.exercises.length - 1) {
              const nextItem = workout.exercises[myIndex + 1];
              const effectiveNextItem = editedWorkoutItems[nextItem.id] || nextItem;
              if (effectiveNextItem.exercise) {
                announceExercise(
                  effectiveNextItem.exercise.name,
                  effectiveNextItem.sets ?? 0,
                  effectiveNextItem.reps ?? '',
                  effectiveNextItem.weight ?? undefined
                );
              }
            }
          }
        }
      }
    },
    [
      isResting,
      editedWorkoutItems,
      completedSets,
      workout,
      startRest,
      announceRest,
      announceExercise,
    ]
  );

  const handleFinishWorkout = useCallback(() => {
    const totalSets = workout?.exercises?.reduce((acc, item) => acc + (item.sets ?? 0), 0) || 0;
    const completedTotal = Object.values(completedSets).reduce((acc, val) => acc + val, 0);

    if (completedTotal < totalSets) {
      showConfirm({
        title: 'Treino Incompleto',
        message: `Você completou ${completedTotal} de ${totalSets} séries. Deseja finalizar mesmo assim?`,
        type: 'warning',
        confirmText: 'Finalizar',
        cancelText: 'Cancelar',
        onConfirm: () => setShowFeedbackModal(true),
      });
    } else {
      setShowFeedbackModal(true);
    }
  }, [workout, completedSets]);

  const handleVoiceCommand = useCallback(
    async (action: string) => {
      if (action === 'next_set') {
        const nextItem = workout?.exercises?.find((item) => {
          const completed = completedSets[item.id] || 0;
          return completed < (item.sets ?? 0);
        });

        if (nextItem) {
          handleLogSet(nextItem);
        } else {
          announceFinish();
        }
      } else if (action === 'finish_workout') {
        handleFinishWorkout();
      } else if (action === 'pause_timer') {
        pauseTimer();
      } else if (action === 'resume_timer') {
        resumeTimer();
        if (announceResume) announceResume();
      } else if (action === 'repeat_instruction') {
        repeatLastInstruction();
      }
    },
    [
      workout,
      completedSets,
      handleLogSet,
      handleFinishWorkout,
      pauseTimer,
      resumeTimer,
      announceFinish,
      announceResume,
      repeatLastInstruction,
    ]
  );

  const { isRecording, startListening, stopListening } = useVoiceInput({
    onCommand: handleVoiceCommand,
    continuous: true,
  });

  useEffect(() => {
    if (isWorkoutStarted) {
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isWorkoutStarted, startListening, stopListening]);

  useEffect(() => {
    if (user?.id && !workouts.length) {
      fetchWorkouts(user.id);
    }
  }, [user?.id, workouts.length, fetchWorkouts]);

  const fetchPreviousSession = useCallback(
    async (workoutId: string, studentId: string) => {
      try {
        _setPreviousSessionError(null);
        const session = await fetchWorkoutSessionDetails(workoutId, studentId);
        console.log('[Progression] Previous session:', session);
        setPreviousSession(session);
      } catch (error) {
        console.error('[Progression] Error fetching previous session:', error);
        const errorMessage = 'Não foi possível carregar dados da sessão anterior';
        _setPreviousSessionError(errorMessage);
        // Show non-blocking toast/alert
        console.warn(errorMessage);
      }
    },
    [fetchWorkoutSessionDetails]
  );

  useEffect(() => {
    const targetId = (workoutId || id) as string;
    if (workouts.length > 0 && targetId) {
      const found = workouts.find((w) => w.id === targetId);
      if (found) {
        setWorkout(found);

        const initialSets: Record<string, number> = {};
        found.exercises?.forEach((item) => {
          initialSets[item.id] = 0;
        });
        setCompletedSets(initialSets);

        // Fetch previous session for progression analysis
        if (user?.id) {
          fetchPreviousSession(found.id, user.id);
        }
      }
    }
  }, [workouts, id, workoutId, user?.id, fetchPreviousSession]);

  const handleEditExercise = useCallback(
    (item: WorkoutItem) => {
      // Use edited version if exists, otherwise use original
      const effectiveItem = editedWorkoutItems[item.id] || item;
      console.log('[ExecuteWorkoutScreen] Opening edit modal for item:', item);
      console.log('[ExecuteWorkoutScreen] Effective item (with edits):', effectiveItem);
      setEditingItem(effectiveItem);
      setShowEditModal(true);
    },
    [editedWorkoutItems]
  );

  const handleSaveEdit = useCallback((editedItem: WorkoutItem) => {
    console.log('[ExecuteWorkoutScreen] Saving edited item:', editedItem);
    setEditedWorkoutItems((prev) => {
      const updated = {
        ...prev,
        [editedItem.id]: editedItem,
      };
      console.log('[ExecuteWorkoutScreen] Updated edited items:', updated);
      return updated;
    });

    // Show success feedback
    showAlert({
      title: 'Salvo',
      message: 'Exercício atualizado com sucesso!',
      type: 'success',
    });
  }, []);

  const getProgressionSummaryData = useMemo(() => {
    if (!workout || !previousSession || Object.keys(progressionAnalysis).length === 0) return [];

    const summaryData = workout.exercises
      ?.map((item) => {
        const analysis = progressionAnalysis[item.id];
        if (!analysis || !item.exercise) return null;

        const itemData = {
          exerciseName: item.exercise?.name || 'Unknown Exercise',
          improvements: [] as string[],
          decreases: [] as string[],
          maintained: [] as string[],
        };

        if (analysis.weight) {
          const { type, diff } = analysis.weight;
          const text = `Carga: ${diff}`;
          if (type === 'improved') itemData.improvements.push(text);
          else if (type === 'decreased') itemData.decreases.push(text);
          else itemData.maintained.push(text);
        }

        if (analysis.sets) {
          const { type, diff } = analysis.sets;
          const text = `Séries: ${diff}`;
          if (type === 'improved') itemData.improvements.push(text);
          else if (type === 'decreased') itemData.decreases.push(text);
          else itemData.maintained.push(text);
        }

        // Only return if there's something to report
        return itemData.improvements.length > 0 ||
          itemData.decreases.length > 0 ||
          itemData.maintained.length > 0
          ? itemData
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return summaryData as Array<{
      exerciseName: string;
      improvements: string[];
      decreases: string[];
      maintained: string[];
    }>;
  }, [workout, previousSession, progressionAnalysis]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  const onFeedbackSubmit = useCallback(
    async (intensity: number, notes: string) => {
      setShowFeedbackModal(false);

      try {
        if (!user?.id || !startTime) return;
        const endTime = new Date();

        // Uma linha por série. O prescrito vem do treino, o executado vem do que
        // o aluno ajustou na tela — separá-los é o que torna a evolução
        // mensurável, e era o que o JSON de `sets_data` misturava.
        const sessionItems = Object.entries(completedSets).map(([itemId, setsCount]) => {
          const editedItem = editedWorkoutItems[itemId];
          const originalItem = workout?.exercises?.find((ex) => ex.id === itemId);
          const repsActual = parseInt(String(editedItem?.reps ?? originalItem?.reps ?? ''), 10);
          const weightActual = parseFloat(String(editedItem?.weight ?? originalItem?.weight ?? ''));

          return {
            workoutExerciseId: itemId,
            sets: Array.from({ length: setsCount }, () => ({
              reps_prescribed: originalItem?.reps != null ? String(originalItem.reps) : null,
              reps_actual: Number.isNaN(repsActual) ? null : repsActual,
              weight_prescribed: originalItem?.weight != null ? Number(originalItem.weight) : null,
              weight_actual: Number.isNaN(weightActual) ? null : weightActual,
              completed: true,
            })),
          };
        });

        await saveWorkoutSession({
          // biome-ignore lint/style/noNonNullAssertion: auto-suppressed during final sweep
          workoutId: workout!.id,
          studentId: user.id,
          startedAt: startTime.toISOString(),
          completedAt: endTime.toISOString(),
          items: sessionItems,
          intensity,
          notes,
        });

        const today = getLocalDateISOString();
        await incrementWorkoutProgress(today);

        // Show progression summary if there's a previous session
        if (previousSession) {
          announceFinish();
          setShowProgressionSummary(true);
        } else {
          announceFinish();
          showConfirm({
            title: 'Parabéns! 🎉',
            message: 'Treino concluído e salvo com sucesso!',
            type: 'success',
            confirmText: 'Compartilhar 📸',
            cancelText: 'Sair',
            onConfirm: () => {
              const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
              const durationFormatted = formatTime(Math.floor(durationSeconds));
              const estimatedCalories = Math.round(
                MIN_CALORIES_PER_HOUR * DEFAULT_BODY_WEIGHT * (durationSeconds / 3600)
              );

              setShareStats({
                title: 'Treino Concluído',
                duration: durationFormatted,
                calories: `${estimatedCalories} kcal`,
                date: new Date().toLocaleDateString('pt-BR'),
                // biome-ignore lint/style/noNonNullAssertion: auto-suppressed during final sweep
                exerciseName: workout!.title,
              });
              setShowShareModal(true);
            },
            onCancel: () => handleExit(),
          });
        }
      } catch (_error) {
        showAlert({
          title: 'Erro',
          message: 'Não foi possível salvar o treino. Tente novamente.',
          type: 'error',
        });
      }
    },
    [
      user,
      startTime,
      completedSets,
      editedWorkoutItems,
      workout,
      previousSession,
      saveWorkoutSession,
      incrementWorkoutProgress,
      formatTime,
      announceFinish,
      handleExit,
      setShowFeedbackModal,
      setShowProgressionSummary,
      setShowShareModal,
      setShareStats,
    ]
  );

  const currentRestExercise = useMemo(() => {
    if (!currentRestItemId || !workout) return '';
    return workout.exercises?.find((i) => i.id === currentRestItemId)?.exercise?.name || '';
  }, [currentRestItemId, workout]);

  const renderItem = useCallback(
    ({ item, index }: { item: WorkoutItem; index: number }) => {
      const effectiveItem = editedWorkoutItems[item.id] || item;
      const isEdited = !!editedWorkoutItems[item.id];
      const completed = completedSets[item.id] || 0;
      const isCompleted = completed >= (effectiveItem.sets ?? 0);

      return (
        <WorkoutExerciseCard
          item={item}
          effectiveItem={effectiveItem}
          isEdited={isEdited}
          completed={completed}
          isCompleted={isCompleted}
          isResting={isResting}
          progressionAnalysis={progressionAnalysis[item.id]}
          onEdit={handleEditExercise}
          onLogSet={handleLogSet}
          itemIndex={index}
        />
      );
    },
    [
      editedWorkoutItems,
      completedSets,
      isResting,
      progressionAnalysis,
      handleEditExercise,
      handleLogSet,
    ]
  );

  if (isLoading || !workout) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="absolute top-12 right-6 z-50 flex-row gap-3">
        {isWorkoutStarted && (
          <View
            className={`p-3 rounded-full border backdrop-blur-md ${isRecording ? 'bg-emerald-500/20 border-emerald-500' : 'bg-zinc-800/80 border-zinc-700'}`}
          >
            <Ionicons
              name={isRecording ? 'mic' : 'mic-off'}
              size={20}
              color={isRecording ? '#34D399' : '#71717A'}
            />
          </View>
        )}
        <TouchableOpacity
          onPress={toggleMute}
          className="bg-zinc-800/80 p-3 rounded-full border border-zinc-700 backdrop-blur-md"
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={20}
            color={isMuted ? '#71717A' : '#FF6B35'}
          />
        </TouchableOpacity>
      </View>

      {!isWorkoutStarted ? (
        <View className="flex-1 justify-center items-center p-8 bg-black">
          <View className="w-32 h-32 rounded-[40px] bg-orange-500/10 items-center justify-center mb-10 border border-orange-500/20 rotate-12">
            <Ionicons name="barbell" size={64} color="#FF6B35" />
          </View>

          <Text className="text-4xl font-black text-white text-center mb-2 font-display uppercase tracking-tight">
            {workout.title}
          </Text>
          <Text className="text-zinc-500 text-lg font-sans mb-12 text-center font-medium">
            {workout.exercises?.length} exercícios •{' '}
            {workout.exercises?.reduce((acc: number, item) => acc + (item.sets ?? 0), 0)} séries
          </Text>

          <TouchableOpacity
            onPress={() => {
              setIsWorkoutStarted(true);
              setStartTime(new Date());
              const firstItem = workout.exercises?.[0];
              if (firstItem?.exercise)
                announceExercise(
                  firstItem.exercise.name,
                  firstItem.sets ?? 0,
                  firstItem.reps ?? '',
                  firstItem.weight ?? undefined
                );
            }}
            className="w-full"
          >
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl py-6 items-center justify-center shadow-2xl shadow-orange-500/40"
            >
              <Text className="text-white text-xl font-black font-display tracking-widest">
                INICIAR TREINO
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View className="mt-8">
            <IconButton
              accessibilityLabel="Voltar"
              icon="arrow-back"
              onPress={() => handleExit()}
              variant="ghost"
            />
          </View>
        </View>
      ) : (
        <View className="flex-1 bg-black">
          <WorkoutHeader
            title={workout.title}
            itemCount={workout.exercises?.length || 0}
            onExit={handleExit}
          />

          <FlatList
            data={workout.exercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
          />

          <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6 pb-12 border-t border-zinc-900">
            <RestTimerBar
              isResting={isResting}
              timer={timer}
              currentRestExercise={currentRestExercise}
              onSkipRest={skipRest}
              onFinishWorkout={handleFinishWorkout}
            />
          </View>
        </View>
      )}

      <ShareWorkoutModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          handleExit();
        }}
        stats={shareStats}
      />
      <WorkoutFeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={onFeedbackSubmit}
      />
      <EditExerciseModal
        visible={showEditModal}
        item={editingItem}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEdit}
      />
      <ProgressionSummaryModal
        visible={showProgressionSummary}
        onClose={() => {
          setShowProgressionSummary(false);
          handleExit();
        }}
        progressionData={getProgressionSummaryData}
      />
    </ScreenLayout>
  );
}
