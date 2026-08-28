import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal } from '@/components/ui/StatusModal';
import { ExerciseConfigModal } from '../components/ExerciseConfigModal';
import { type SelectedExercise, useWorkoutStore } from '../store/workoutStore';

// biome-ignore lint/correctness/noUnusedVariables: auto-suppressed during final sweep
const { width } = Dimensions.get('window');

// Asset Mapping
const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {
  Peito: require('../../../../assets/workouts/chest.jpg'),
  Costas: require('../../../../assets/workouts/back.jpg'),
  Pernas: require('../../../../assets/workouts/legs.jpg'),
  Braços: require('../../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../../assets/workouts/shoulders.jpg'),
  Abdominais: require('../../../../assets/workouts/abs.jpg'),
  Chest: require('../../../../assets/workouts/chest.jpg'),
  Back: require('../../../../assets/workouts/back.jpg'),
  Legs: require('../../../../assets/workouts/legs.jpg'),
  Arms: require('../../../../assets/workouts/arms.jpg'),
  Shoulders: require('../../../../assets/workouts/shoulders.jpg'),
  Abs: require('../../../../assets/workouts/abs.jpg'),
  Geral: require('../../../../assets/workouts/back.jpg'), // Fallback
};

export default function WorkoutDetailsScreen() {
  const { id, workoutId, mode: modeParam } = useLocalSearchParams();
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const router = useRouter();
  // biome-ignore lint/correctness/noUnusedVariables: auto-suppressed during final sweep
  const { user, accountType } = useAuthStore();
  const canManage =
    (accountType === 'specialist' || accountType === 'member') &&
    !(accountType === 'member' && mode === 'execute');
  const { workouts, isLoading, fetchWorkoutById } = useWorkoutStore();
  type WorkoutModel = ReturnType<typeof useWorkoutStore.getState>['workouts'][0];
  const [workout, setWorkout] = useState<WorkoutModel | null>(null);
  const [notFound, setNotFound] = useState(false);

  type StoreExerciseItem = NonNullable<WorkoutModel['exercises']>[number];

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreExerciseItem | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const targetId = (workoutId || id) as string;

  useEffect(() => {
    if (!targetId) return;

    const found = workouts.find((w) => w.id === targetId);
    if (found) {
      setWorkout(found);
    } else {
      fetchWorkoutById(targetId).then((data) => {
        if (data) setWorkout(data);
        else setNotFound(true);
      });
    }
  }, [workouts, targetId, fetchWorkoutById]);

  // Identify unique muscle groups for the slideshow
  const muscleGroups = useMemo(() => {
    let groups: string[] = [];

    // 1. Add dominant muscle group if exists
    if (workout?.muscle_group) {
      groups.push(workout.muscle_group);
    }

    // 2. Add muscle groups from exercises
    if (workout?.exercises) {
      const exerciseGroups = workout.exercises
        .map((item: StoreExerciseItem) => item.exercise?.muscle_group)
        .filter((g: string | undefined | null) => g && g !== workout.muscle_group);
      groups = [...groups, ...new Set(exerciseGroups)] as string[];
    }

    return groups.length > 0 ? groups : ['Geral'];
  }, [workout]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (muscleGroups.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % muscleGroups.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [muscleGroups]);

  const handleEditExercise = useCallback(
    (item: StoreExerciseItem) => {
      if (!canManage) return;
      console.log('📝 Opening edit modal for exercise:', item.exercise?.name);
      console.log('📝 Exercise data:', item.exercise);
      console.log('📝 Video URL in exercise:', item.exercise?.video_url);
      setEditingItem(item);
      setShowEditModal(true);
    },
    [canManage]
  );

  const handleSaveExercise = useCallback(
    // O modal entrega um `SelectedExercise`. O tipo anterior era
    // `Record<string, unknown>`, então `sets`, `weight` e `rest_seconds`
    // chegavam como `unknown` e iam direto para o update sem verificação.
    async (updatedExercise: SelectedExercise) => {
      if (!editingItem?.exercise) return;

      console.log('🎬 === SAVE EXERCISE START ===');
      console.log('📝 Updated exercise data:', updatedExercise);
      console.log('📝 Editing item:', editingItem);
      console.log('🎥 Video URL in updatedExercise:', updatedExercise.video_url);
      console.log('🎥 Video URL in editingItem:', editingItem.exercise?.video_url);

      try {
        // 1. Update workout_exercises table
        const { error: workoutError } = await supabase
          .from('workout_exercises')
          .update({
            sets: updatedExercise.sets,
            reps: updatedExercise.reps?.toString() || '0',
            weight: updatedExercise.weight,
            rest_seconds: updatedExercise.rest_seconds,
          })
          .eq('id', editingItem.id);

        if (workoutError) throw workoutError;

        // 2. Update video URL if changed
        if (updatedExercise.video_url !== editingItem.exercise.video_url) {
          console.log('🎥 Updating video URL:', {
            exerciseId: editingItem.exercise.id,
            oldUrl: editingItem.exercise.video_url,
            newUrl: updatedExercise.video_url,
          });

          const { data: updateResult, error: videoError } = await supabase
            .from('exercises')
            .update({ video_url: updatedExercise.video_url || null })
            .eq('id', editingItem.exercise.id)
            .select();

          console.log('📊 Update result:', updateResult);

          if (videoError) {
            console.error('❌ Error updating video URL:', videoError);
            throw new Error(`Falha ao atualizar URL do vídeo: ${videoError.message}`);
          }

          console.log('✅ Video URL updated successfully');
        } else {
          console.log('⏭️ Video URL unchanged, skipping update');
        }

        // 3. Refresh workout data
        console.log('🔄 Refreshing workout data...');
        const refreshedWorkout = await fetchWorkoutById(targetId);
        if (refreshedWorkout) {
          setWorkout(refreshedWorkout);
          console.log('✅ Workout data refreshed');
          const refreshedItem = refreshedWorkout.exercises?.find(
            (i: StoreExerciseItem) => i.id === editingItem.id
          );
          console.log('📊 Refreshed exercise video_url:', refreshedItem?.exercise?.video_url);
          console.log('📊 Full refreshed item:', refreshedItem);
          console.log(
            '📋 Exercise order after refresh:',
            refreshedWorkout.exercises?.map((i: StoreExerciseItem) => ({
              name: i.exercise?.name,
              order: (i as unknown as { order: number }).order,
            }))
          );
        }

        setShowEditModal(false);
        setEditingItem(null);
        console.log('🎬 === SAVE EXERCISE END ===');
        // Show success modal
        setShowSuccessModal(true);
      } catch (e: unknown) {
        console.error('❌ Error saving exercise:', e);
        Alert.alert('Erro', (e as Error).message || 'Não foi possível salvar as alterações.');
      }
    },
    [editingItem, fetchWorkoutById, targetId]
  );

  const renderExerciseItem = useCallback(
    ({ item, index }: { item: StoreExerciseItem; index: number }) => {
      const muscleGroup = item.exercise?.muscle_group || 'Geral';
      const bgImage = MUSCLE_IMAGES[muscleGroup] || MUSCLE_IMAGES.Geral;

      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} className="mb-4">
          <TouchableOpacity
            activeOpacity={canManage ? 0.7 : 1}
            onPress={() => handleEditExercise(item)}
          >
            <ImageBackground
              source={bgImage}
              className="rounded-2xl overflow-hidden border border-zinc-800 h-40"
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
                className="flex-1 p-4 justify-between"
              >
                <View className="flex-row justify-between items-start">
                  <View className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                    <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                      {muscleGroup}
                    </Text>
                  </View>
                  <View className="w-8 h-8 rounded-lg bg-black/40 items-center justify-center border border-white/10">
                    <Text className="text-white font-bold">{index + 1}</Text>
                  </View>
                </View>

                <View>
                  <Text className="text-white text-lg font-bold font-display mb-2 drop-shadow-lg">
                    {item.exercise?.name || 'Exercício'}
                  </Text>

                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center bg-white/10 px-2 py-1 rounded-md border border-white/5">
                      <Ionicons
                        name="repeat-outline"
                        size={14}
                        color="#CCFF00"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-zinc-200 text-xs font-bold">
                        {item.sets} x {item.reps}
                      </Text>
                    </View>

                    <View className="flex-row items-center bg-white/10 px-2 py-1 rounded-md border border-white/5">
                      <Ionicons
                        name="timer-outline"
                        size={14}
                        color="#CCFF00"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-zinc-200 text-xs font-bold">{item.rest_seconds}s</Text>
                    </View>

                    {item.weight && (
                      <View className="flex-row items-center bg-white/10 px-2 py-1 rounded-md border border-white/5">
                        <Ionicons
                          name="barbell-outline"
                          size={14}
                          color="#CCFF00"
                          style={{ marginRight: 4 }}
                        />
                        <Text className="text-zinc-200 text-xs font-bold">{item.weight}kg</Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [canManage, handleEditExercise]
  );

  if (notFound) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#71717A" />
        <Text className="text-white text-xl font-bold mt-4 text-center font-display">
          Treino não encontrado
        </Text>
        <Text className="text-zinc-500 text-center mt-2 mb-6">
          O treino que você está procurando não existe ou foi removido.
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

  if (!workout && isLoading) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </ScreenLayout>
    );
  }

  if (!workout) return null;

  return (
    <ScreenLayout>
      <View className="flex-1">
        {/* Animated Header */}
        <Animated.View entering={FadeIn.duration(800)} className="h-80 w-full relative">
          <Animated.Image
            key={currentImageIndex}
            source={MUSCLE_IMAGES[muscleGroups[currentImageIndex]] || MUSCLE_IMAGES.Geral}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />

          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
            className="absolute inset-0 flex-1 px-6 pb-8 justify-between"
          >
            {/* Header Controls */}
            <View className="flex-row items-center justify-between pt-8">
              <IconButton
                accessibilityLabel="Voltar"
                icon="arrow-back"
                onPress={() => router.back()}
              />

              <View className="flex-row gap-2">
                {canManage && (
                  <IconButton
                    accessibilityLabel="Adicionar"
                    icon="add"
                    variant="solid"
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/workouts/select-exercises',
                        params: { workoutId: workout.id, studentId: id },
                      })
                    }
                  />
                )}
              </View>
            </View>

            {/* Workout Info */}
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                {muscleGroups.map((group, _idx) => {
                  return (
                    <View
                      key={group}
                      className="bg-white/10 px-2 py-1 rounded-md border border-white/10"
                    >
                      <Text className="text-zinc-300 text-[10px] font-bold uppercase">{group}</Text>
                    </View>
                  );
                })}
              </View>

              <Text className="text-3xl font-extrabold text-white mb-2 font-display">
                {workout.title}
              </Text>

              <Text className="text-zinc-400 font-sans text-sm line-clamp-2">
                {workout.description || 'Foco em hipertrofia e definição muscular.'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Exercises List */}
        <View className="flex-1 px-6 -mt-4 bg-black rounded-t-[32px] pt-6">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-xl font-bold font-display tracking-tight">
                Lista de Exercícios
              </Text>
              <Text className="text-zinc-500 text-xs font-sans">
                {workout.exercises?.length || 0} movimentos planejados
              </Text>
            </View>

            {/* Removed the explicit Edit button as per user request */}
          </View>

          <FlatList
            data={workout.exercises || []}
            renderItem={renderExerciseItem}
            keyExtractor={(item: StoreExerciseItem, index: number) =>
              item?.id || `exercise-${index}`
            }
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20 bg-zinc-900/50 rounded-3xl border border-zinc-800">
                <Ionicons name="barbell-outline" size={48} color="#3F3F46" />
                <Text className="text-zinc-500 font-sans mt-4 text-center">
                  Nenhum exercício cadastrado ainda.
                </Text>
                {canManage && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/workouts/select-exercises',
                        params: { workoutId: workout.id, studentId: id },
                      })
                    }
                    className="mt-6 bg-zinc-800 px-8 py-3 rounded-2xl border border-zinc-700"
                  >
                    <Text className="text-white font-bold">Adicionar</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </View>
      </View>

      {/* Iniciar Treino */}
      {!canManage && workout.exercises && workout.exercises.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/workouts/execute/${workout.id}`)}
          activeOpacity={0.9}
          className="absolute bottom-8 left-6 right-6 h-14 rounded-2xl overflow-hidden shadow-2xl z-50"
        >
          <LinearGradient
            colors={['#CCFF00', '#A3CC00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full flex-row items-center justify-center gap-3"
          >
            <Ionicons name="play" size={20} color="white" />
            <Text className="text-white font-black text-base uppercase tracking-widest">
              Iniciar Treino
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <ExerciseConfigModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          exercise={{
            id: editingItem.exercise?.id || '',
            name: editingItem.exercise?.name || '',
            muscle_group: editingItem.exercise?.muscle_group || '',
            video_url: editingItem.exercise?.video_url || null,
            description: editingItem.exercise?.description || null,
            is_verified: false,
            created_by: null,
            created_at: new Date().toISOString(),
          }}
          initialData={{
            id: editingItem.exercise?.id || '',
            name: editingItem.exercise?.name || '',
            muscle_group: editingItem.exercise?.muscle_group || '',
            sets: editingItem.sets ?? 0,
            reps:
              typeof editingItem.reps === 'string'
                ? parseInt(editingItem.reps, 10)
                : (editingItem.reps ?? 0),
            weight: editingItem.weight || '',
            rest_seconds: editingItem.rest_seconds ?? 60,
            video_url: editingItem.exercise?.video_url || undefined,
          }}
          onSave={handleSaveExercise}
        />
      )}

      {/* Success Modal */}
      <StatusModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sucesso!"
        message="Exercício atualizado com sucesso!"
        type="success"
        buttonText="Continuar"
      />
    </ScreenLayout>
  );
}
