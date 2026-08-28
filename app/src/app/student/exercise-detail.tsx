import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { VideoPlayer } from '@/components/VideoPlayer';
import { RestTimer, type SetState, workoutSessionStore } from '@/workout';

interface WorkoutExerciseDetail {
  id: string;
  exercise_id: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
  exercise: {
    id: string;
    name: string;
    muscle_group: string | null;
    video_url: string | null;
  };
}

interface SetInputState {
  repsInput: string;
  weightInput: string;
  completed: boolean;
  skipped: boolean;
}

function toInputState(
  s: SetState,
  repsPrescribed: string | null,
  weightPrescribed: string | null
): SetInputState {
  return {
    repsInput: s.repsActual?.toString() ?? repsPrescribed?.split('-')[0] ?? '',
    weightInput: s.weightActual?.toString() ?? weightPrescribed ?? '',
    completed: s.completed,
    skipped: s.skipped,
  };
}

function toSetState(input: SetInputState, restPrescribed: number | null): SetState {
  return {
    repsActual: parseInt(input.repsInput, 10) || null,
    weightActual: parseFloat(input.weightInput) || null,
    restActual: restPrescribed,
    completed: input.completed,
    skipped: input.skipped,
  };
}

export default function ExerciseDetailScreen() {
  const { workoutExerciseId, sessionId: _sessionId } = useLocalSearchParams<{
    workoutExerciseId: string;
    sessionId: string;
  }>();
  const router = useRouter();

  const [exercise, setExercise] = useState<WorkoutExerciseDetail | null>(null);
  const [sets, setSets] = useState<SetInputState[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [isRestingAfterSet, setIsRestingAfterSet] = useState(false);

  const completedCount = sets.filter((s) => s.completed || s.skipped).length;
  const allDone = sets.length > 0 && completedCount === sets.length;

  const fetchExercise = useCallback(async () => {
    if (!workoutExerciseId) return;
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(
          'id, exercise_id, sets, reps, weight, rest_seconds, exercise:exercises(id, name, muscle_group, video_url)'
        )
        .eq('id', workoutExerciseId)
        .single();

      if (error) throw error;

      const ex = {
        ...data,
        exercise: Array.isArray(data.exercise) ? data.exercise[0] : data.exercise,
      } as WorkoutExerciseDetail;
      setExercise(ex);

      const stored = workoutSessionStore.getExerciseState(workoutExerciseId);
      const count = ex.sets ?? 3;
      if (stored) {
        setSets(stored.sets.map((s: SetState) => toInputState(s, ex.reps, ex.weight)));
      } else {
        setSets(
          Array.from({ length: count }, () => ({
            repsInput: ex.reps?.split('-')[0] ?? '',
            weightInput: ex.weight ?? '',
            completed: false,
            skipped: false,
          }))
        );
      }
    } catch (err: unknown) {
      console.error('Error fetching exercise:', err);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar o exercício.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [workoutExerciseId]);

  useEffect(() => {
    fetchExercise();
  }, [fetchExercise]);

  const updateSetField = (index: number, field: 'repsInput' | 'weightInput', value: string) => {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const completeSet = (index: number) => {
    if (isRestingAfterSet) {
      showAlert({
        title: 'Aguarde',
        message: 'Complete o descanso antes de marcar a próxima série.',
        type: 'warning',
      });
      return;
    }

    setSets((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, completed: true } : s));
      persistToStore(next);
      return next;
    });

    setShowTimer(true);
    setIsRestingAfterSet(true);
  };

  const skipSet = (index: number) => {
    setSets((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, skipped: true } : s));
      persistToStore(next);
      return next;
    });
  };

  const persistToStore = (currentSets: SetInputState[]) => {
    if (!exercise || !workoutExerciseId) return;
    const setStates = currentSets.map((s) => toSetState(s, exercise.rest_seconds));
    workoutSessionStore.saveExerciseSets(workoutExerciseId, setStates);
  };

  const handleTimerComplete = () => {
    setShowTimer(false);
    setIsRestingAfterSet(false);
  };

  const handleMarkComplete = () => {
    if (!allDone) {
      showConfirm({
        title: 'Exercício Incompleto',
        message: `${completedCount} de ${sets.length} séries feitas. Finalizar mesmo assim?`,
        type: 'warning',
        confirmText: 'Finalizar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          persistToStore(sets);
          router.back();
        },
      });
      return;
    }
    persistToStore(sets);
    router.back();
  };

  if (loading) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </ScreenLayout>
    );
  }

  if (!exercise) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#52525B" />
        <Text className="text-foreground text-xl font-bold mt-4 mb-6 font-display">
          Exercício não encontrado
        </Text>
        <Button onPress={() => router.back()} variant="outline" label="Voltar" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-surface p-2.5 rounded-xl mr-4 border border-border"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground font-display">
            {exercise.exercise.name}
          </Text>
          {exercise.exercise.muscle_group && (
            <View className="flex-row items-center mt-1">
              <View className="bg-secondary/15 px-2 py-1 rounded-md">
                <Text className="text-secondary text-xs font-bold font-display uppercase">
                  {exercise.exercise.muscle_group}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {exercise.exercise.video_url && (
          <View className="mb-6 rounded-2xl overflow-hidden border border-border">
            <VideoPlayer videoUrl={exercise.exercise.video_url} height={220} />
          </View>
        )}

        {/* Prescribed summary */}
        <Card className="p-4 mb-6 border border-border">
          <Text className="text-xs text-muted-foreground font-sans mb-2 uppercase tracking-wide">
            Prescrição
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-background p-3 rounded-lg border border-border">
              <Text className="text-muted-foreground text-xs mb-1 font-sans">Séries</Text>
              <Text className="text-foreground text-xl font-bold font-display">
                {exercise.sets ?? '—'}
              </Text>
            </View>
            <View className="flex-1 bg-background p-3 rounded-lg border border-border">
              <Text className="text-muted-foreground text-xs mb-1 font-sans">Repetições</Text>
              <Text className="text-foreground text-xl font-bold font-display">
                {exercise.reps ?? '—'}
              </Text>
            </View>
            {exercise.weight && (
              <View className="flex-1 bg-background p-3 rounded-lg border border-border">
                <Text className="text-muted-foreground text-xs mb-1 font-sans">Carga</Text>
                <Text className="text-foreground text-xl font-bold font-display">
                  {exercise.weight}kg
                </Text>
              </View>
            )}
            <View className="flex-1 bg-background p-3 rounded-lg border border-border">
              <Text className="text-muted-foreground text-xs mb-1 font-sans">Descanso</Text>
              <Text className="text-foreground text-xl font-bold font-display">
                {exercise.rest_seconds ?? '—'}s
              </Text>
            </View>
          </View>
        </Card>

        {/* Per-set tracking */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-3 font-display">Séries</Text>
          {sets.map((s, index) => {
            const isDone = s.completed || s.skipped;
            const isNext =
              !isDone && sets.slice(0, index).every((prev) => prev.completed || prev.skipped);

            return (
              <Card
                // biome-ignore lint/suspicious/noArrayIndexKey: set order is fixed during exercise
                key={`set-${index}`}
                className={`mb-3 p-4 border-2 ${isDone ? 'border-primary bg-primary/10' : isNext ? 'border-secondary' : 'border-border'}`}
              >
                <View className="flex-row items-center mb-3">
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-2 ${isDone ? 'border-primary bg-primary' : isNext ? 'border-secondary' : 'border-muted-foreground'}`}
                  >
                    {isDone && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                  <Text className="text-foreground font-bold font-display">Série {index + 1}</Text>
                  {s.skipped && (
                    <View className="ml-2 bg-muted px-2 py-0.5 rounded-md">
                      <Text className="text-muted-foreground text-[10px] font-bold font-display">
                        PULADA
                      </Text>
                    </View>
                  )}
                </View>

                {!isDone && (
                  <View className="flex-row gap-2 mb-3">
                    <View className="flex-1">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">Reps</Text>
                      <TextInput
                        value={s.repsInput}
                        onChangeText={(v) => updateSetField(index, 'repsInput', v)}
                        keyboardType="numeric"
                        editable={!isDone}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground font-display text-center"
                        placeholderTextColor="#5A6178"
                        placeholder="0"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">
                        Carga (kg)
                      </Text>
                      <TextInput
                        value={s.weightInput}
                        onChangeText={(v) => updateSetField(index, 'weightInput', v)}
                        keyboardType="decimal-pad"
                        editable={!isDone}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground font-display text-center"
                        placeholderTextColor="#5A6178"
                        placeholder="0"
                      />
                    </View>
                  </View>
                )}

                {isDone && (
                  <View className="flex-row gap-2">
                    <Text className="text-sm text-muted-foreground font-sans">
                      {s.repsInput} reps {s.weightInput ? `• ${s.weightInput}kg` : ''}
                    </Text>
                  </View>
                )}

                {!isDone && isNext && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => completeSet(index)}
                      className="flex-1 bg-primary py-2 rounded-lg items-center"
                    >
                      <Text className="text-black text-sm font-bold font-display">✓ Concluir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => skipSet(index)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg items-center"
                    >
                      <Text className="text-muted-foreground text-sm font-sans">Pular</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {showTimer && (
          <Card className="p-4 mb-6 border-2 border-border bg-surface">
            <Text className="text-lg font-bold text-foreground mb-2 text-center font-display">
              Tempo de Descanso
            </Text>
            <RestTimer
              restSeconds={exercise.rest_seconds ?? 60}
              onComplete={handleTimerComplete}
              autoStart={true}
            />
          </Card>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 border-t border-border">
        <TouchableOpacity onPress={handleMarkComplete} disabled={false} activeOpacity={0.8}>
          <LinearGradient
            colors={
              allDone
                ? (['#CCFF00', '#99CC00'] as [string, string])
                : (['#3B82F6', '#2563EB'] as [string, string])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-xl py-4 items-center flex-row justify-center shadow-lg shadow-black/20"
          >
            <Ionicons
              name={allDone ? 'checkmark-done' : 'arrow-back'}
              size={22}
              color="#000000"
              style={{ marginRight: 8 }}
            />
            <Text className="text-black text-lg font-bold font-display">
              {allDone ? 'Exercício Concluído' : 'Salvar e Voltar'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}
