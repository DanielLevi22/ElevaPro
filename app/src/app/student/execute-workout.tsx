import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/Button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { WorkoutFeedbackModal } from '@/components/workout/WorkoutFeedbackModal';
import { useWorkoutStore } from '@/modules/workout';
import { ROUTES } from '@/navigation/types';
import { useGamificationStore } from '@/store/gamificationStore';
import { getLocalDateISOString } from '@/utils/dateUtils';

interface ExerciseProgress {
  id: string;
  setsCompleted: number;
  totalSets: number;
  weight?: string;
}

interface Workout {
  id: string;
  title: string;
}

interface WorkoutItem {
  id: string;
  sets: number;
  reps: number;
  weight?: string;
  rest_seconds?: number;
  rest_time?: number;
  notes?: string;
  exercise?: { name: string; muscle_group?: string; video_url?: string };
}

export default function ExecuteWorkoutScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutItem[]>([]);
  const [progress, setProgress] = useState<Record<string, ExerciseProgress>>({});
  const [restTimer, setRestTimer] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const { saveWorkoutSession } = useWorkoutStore();
  const { incrementWorkoutProgress } = useGamificationStore();
  const router = useRouter();

  const fetchWorkoutAndStartSession = useCallback(async () => {
    try {
      if (!id) return;

      const { data: workoutData } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();

      setWorkout(workoutData);
      setStartTime(new Date());

      const { data: itemsData } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('workout_id', id)
        .order('order_index');

      setExercises(itemsData || []);

      const initialProgress: Record<string, ExerciseProgress> = {};
      itemsData?.forEach((item) => {
        initialProgress[item.id] = {
          id: item.id,
          setsCompleted: 0,
          totalSets: item.sets || 0,
          weight: item.weight || '',
        };
      });
      setProgress(initialProgress);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkoutAndStartSession();
  }, [fetchWorkoutAndStartSession]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const handleSetComplete = (exerciseId: string, restTime: number) => {
    setProgress((prev) => {
      const current = prev[exerciseId];
      if (current.setsCompleted < current.totalSets) {
        return {
          ...prev,
          [exerciseId]: {
            ...current,
            setsCompleted: current.setsCompleted + 1,
          },
        };
      }
      return prev;
    });

    if (restTime && progress[exerciseId].setsCompleted < progress[exerciseId].totalSets - 1) {
      setRestTimer(restTime);
    }
  };

  const handleCompleteWorkout = () => {
    setShowFeedbackModal(true);
  };

  const onFeedbackSubmit = async (intensity: number, notes: string) => {
    setShowFeedbackModal(false);

    try {
      if (!user?.id || !startTime || !workout) return;

      const endTime = new Date();

      // Uma linha por série executada. Esta tela não coleta repetição por série,
      // então `reps_actual` fica nulo em vez de zero: zero repetição é uma
      // afirmação falsa sobre o treino, nulo é a ausência de medida.
      const sessionItems = Object.values(progress).map((prog) => ({
        workoutExerciseId: prog.id,
        sets: Array.from({ length: prog.setsCompleted }, () => ({
          reps_actual: null,
          weight_actual: prog.weight ? parseFloat(prog.weight) : null,
          completed: true,
        })),
      }));

      // Save session via Store (consistent logic)
      await saveWorkoutSession({
        workoutId: workout.id,
        studentId: user.id,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        items: sessionItems,
        intensity,
        notes,
      });

      // Update gamification
      const today = getLocalDateISOString();
      await incrementWorkoutProgress(today);

      Alert.alert('Treino Concluído! 🎉', 'Parabéns! Você está cada vez mais forte!', [
        { text: 'Finalizar', onPress: () => router.push(ROUTES.TABS.ROOT as never) },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o treino. Tente novamente.');
    }
  };

  const allSetsCompleted = Object.values(progress).every((p) => p.setsCompleted === p.totalSets);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 pb-0">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <View className="bg-surface p-2 rounded-full">
              <Ionicons name="arrow-back" size={24} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white flex-1" numberOfLines={1}>
            {workout?.title}
          </Text>
        </View>

        {/* Rest Timer */}
        {restTimer > 0 && (
          <View className="overflow-hidden rounded-2xl mb-4">
            <LinearGradient
              colors={['#00D9FF', '#00B8D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-5"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="timer" size={32} color="white" />
                <Text className="text-white font-bold text-4xl ml-3">{restTimer}s</Text>
              </View>
              <Text className="text-white/80 text-center text-sm mt-2">Descanse e prepare-se</Text>
            </LinearGradient>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {exercises.map((item, index) => {
          const itemProgress = progress[item.id];
          const isComplete = itemProgress?.setsCompleted === itemProgress?.totalSets;

          return (
            <View
              key={item.id}
              className={`mb-4 rounded-2xl border-2 overflow-hidden ${isComplete ? 'border-accent' : 'border-border'}`}
            >
              {isComplete && (
                <LinearGradient
                  colors={['#00FF88', '#00CC6E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="absolute inset-0 opacity-10"
                />
              )}

              <View className="p-4">
                <View className="flex-row items-start mb-3">
                  <View
                    className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${isComplete ? 'bg-accent/20' : 'bg-primary/20'}`}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
                    ) : (
                      <Text className="text-primary font-bold text-lg">{index + 1}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-xl mb-1">{item.exercise?.name}</Text>
                    <Text className="text-muted text-sm">
                      {itemProgress?.setsCompleted || 0} / {itemProgress?.totalSets || 0} séries
                      completadas
                    </Text>
                  </View>
                </View>

                {/* Sets Grid */}
                <View className="ml-13 space-y-3">
                  <View className="flex-row flex-wrap gap-2">
                    {Array.from({ length: itemProgress?.totalSets || 0 }).map((_, setIndex) => {
                      const isCompleted = setIndex < (itemProgress?.setsCompleted || 0);
                      const isNext = setIndex === itemProgress?.setsCompleted;

                      return (
                        <TouchableOpacity
                          key={
                            // biome-ignore lint/suspicious/noArrayIndexKey: setIndex is the set position — sets have no unique IDs
                            `${item.id}-set-${setIndex}`
                          }
                          className={`px-5 py-3 rounded-xl border-2 ${
                            isCompleted
                              ? 'bg-accent/20 border-accent'
                              : isNext
                                ? 'bg-primary/20 border-primary'
                                : 'bg-surface border-border'
                          }`}
                          onPress={() => {
                            if (isNext) {
                              handleSetComplete(item.id, item.rest_time || 0);
                            }
                          }}
                          disabled={!isNext}
                        >
                          <Text
                            className={`font-bold ${isCompleted ? 'text-accent' : isNext ? 'text-primary' : 'text-muted'}`}
                          >
                            Série {setIndex + 1}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Exercise Details */}
                  <View className="flex-row flex-wrap gap-x-4 gap-y-2 bg-surface/50 p-3 rounded-xl">
                    {item.reps && (
                      <View className="flex-row items-center">
                        <Ionicons name="repeat" size={16} color="#A1A1AA" />
                        <Text className="text-muted text-sm ml-1">{item.reps} reps</Text>
                      </View>
                    )}
                    <View className="flex-row items-center bg-background/50 px-2 py-1 rounded-lg border border-border">
                      <Ionicons name="barbell" size={16} color="#A1A1AA" />
                      <TextInput
                        className="text-white text-sm ml-2 w-16 p-0"
                        placeholder="Carga"
                        placeholderTextColor="#52525B"
                        keyboardType="numeric"
                        value={itemProgress?.weight}
                        onChangeText={(text: string) => {
                          setProgress((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], weight: text },
                          }));
                        }}
                      />
                      <Text className="text-muted text-xs ml-1">kg</Text>
                    </View>
                    {item.rest_time && (
                      <View className="flex-row items-center">
                        <Ionicons name="timer-outline" size={16} color="#A1A1AA" />
                        <Text className="text-muted text-sm ml-1">{item.rest_time}s</Text>
                      </View>
                    )}
                    {item.exercise?.video_url && (
                      <View className="w-full mt-2">
                        <VideoPlayer videoUrl={item.exercise.video_url} height={200} />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Complete Button */}
      <View className="p-6 border-t-2 border-border">
        {allSetsCompleted ? (
          <TouchableOpacity onPress={handleCompleteWorkout} className="overflow-hidden rounded-2xl">
            <LinearGradient
              colors={['#00FF88', '#00CC6E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-5 flex-row items-center justify-center"
            >
              <Ionicons name="trophy" size={28} color="#09090B" />
              <Text className="text-background font-bold text-xl ml-3">Finalizar Treino 🎉</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <Button label="Completar Treino" onPress={handleCompleteWorkout} variant="outline" />
        )}
      </View>

      <WorkoutFeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={onFeedbackSubmit}
      />
    </SafeAreaView>
  );
}
