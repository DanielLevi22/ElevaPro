import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { useCreateExercise } from '@/hooks/useExerciseMutations';
import { useExercises } from '@/hooks/useExercises';
import { ExerciseConfigModal } from '../components/ExerciseConfigModal';
import type { Exercise, SelectedExercise } from '../store/workoutStore';
import { useWorkoutStore } from '../store/workoutStore';

export default function SelectExercisesScreen() {
  const { data: rawExercisesData = [], isLoading } = useExercises();
  const exercisesData = rawExercisesData as Exercise[];
  const createExerciseMutation = useCreateExercise();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Hide Tab Bar when screen is focused
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: { display: 'none' },
      });

      return () => {
        parent?.setOptions({
          tabBarStyle: undefined,
        });
      };
    }, [navigation])
  );

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

  // Extract unique muscle groups
  const muscleGroups = useMemo(() => {
    const groups = new Set(
      exercisesData.map((ex) => ex.muscle_group).filter((g): g is string => !!g)
    );
    return Array.from(groups).sort();
  }, [exercisesData]);

  // Filter exercises
  const exercises = useMemo(() => {
    return exercisesData.filter((ex) => {
      // Basic validation
      if (
        !ex.name ||
        ex.name.trim() === '' ||
        ex.name.toLowerCase().includes('adicionar exercício') ||
        ex.name.toLowerCase().includes('adicionar exercicios')
      ) {
        return false;
      }

      // Search filter
      if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscleGroup && ex.muscle_group !== selectedMuscleGroup) {
        return false;
      }

      return true;
    });
  }, [exercisesData, searchQuery, selectedMuscleGroup]);

  const [selected, setSelected] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // New Exercise creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
  const [newExerciseVideo, setNewExerciseVideo] = useState('');

  const router = useRouter();

  const openConfigForNew = useCallback((exercise: Exercise) => {
    setCurrentExercise(exercise);
    setEditingIndex(null);
    setShowConfigModal(true);
  }, []);

  const editSelectedExercise = useCallback(
    (exercise: Exercise) => {
      const index = selectedExercises.findIndex((ex) => ex.id === exercise.id);
      if (index !== -1) {
        setCurrentExercise(exercise);
        setEditingIndex(index);
        setShowConfigModal(true);
      }
    },
    [selectedExercises]
  );

  const toggleSelection = useCallback(
    (exercise: Exercise) => {
      if (selected.includes(exercise.id)) {
        editSelectedExercise(exercise);
      } else {
        openConfigForNew(exercise);
      }
    },
    [selected, editSelectedExercise, openConfigForNew]
  );

  const handleDeselect = useCallback((exerciseId: string) => {
    setSelected((prev) => prev.filter((id) => id !== exerciseId));
    setSelectedExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  }, []);

  const handleSaveExercise = useCallback(
    (updatedExercise: SelectedExercise) => {
      if (editingIndex !== null) {
        const updated = [...selectedExercises];
        updated[editingIndex] = updatedExercise;
        setSelectedExercises(updated);
      } else {
        setSelected([...selected, updatedExercise.id]);
        setSelectedExercises([...selectedExercises, updatedExercise]);
      }
      setShowConfigModal(false);
      setCurrentExercise(null);
      setEditingIndex(null);
    },
    [editingIndex, selected, selectedExercises]
  );

  // biome-ignore lint/correctness/noUnusedVariables: auto-suppressed during final sweep
  const { workoutId, studentId } = useLocalSearchParams();
  const { addWorkoutItems, clearSelectedExercises } = useWorkoutStore();

  // Clear selected exercises on unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    return () => {
      clearSelectedExercises();
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (selectedExercises.length === 0) {
      showAlert({
        title: 'Atenção',
        message: 'Selecione pelo menos um exercício.',
        type: 'warning',
      });
      return;
    }

    setIsAdding(true);

    if (workoutId) {
      try {
        const items = selectedExercises.map((ex, index) => ({
          id: `temp-${ex.id}-${index}`,
          workout_id: workoutId as string,
          exercise_id: ex.id,
          sets: ex.sets || 3,
          reps: ex.reps?.toString() || '10',
          weight: ex.weight || '0',
          rest_seconds: ex.rest_seconds || 60,
          order_index: index,
          notes: null,
          created_at: new Date().toISOString(),
        }));

        await addWorkoutItems(workoutId as string, items as Parameters<typeof addWorkoutItems>[1]);
        clearSelectedExercises();

        // Show success state
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsAdding(false);
          router.back();
        }, 800);
      } catch (error) {
        console.error('Error adding exercises:', error);
        showAlert({
          title: 'Erro',
          message: 'Não foi possível adicionar os exercícios.',
          type: 'error',
        });
        setIsAdding(false);
      }
    } else {
      // Fallback for creation flow (no ID yet)
      const { setSelectedExercises } = useWorkoutStore.getState();
      setSelectedExercises(selectedExercises);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/workouts');
      }
    }
  }, [selectedExercises, router, workoutId, addWorkoutItems, clearSelectedExercises]);

  const handleCreateExercise = useCallback(async () => {
    if (!newExerciseName.trim() || !newExerciseMuscle.trim()) {
      showAlert({ title: 'Erro', message: 'Preencha o nome e o grupo muscular.', type: 'error' });
      return;
    }

    try {
      await createExerciseMutation.mutateAsync({
        name: newExerciseName,
        muscle_group: newExerciseMuscle,
        video_url: newExerciseVideo.trim() || undefined,
      });
      setNewExerciseName('');
      setNewExerciseMuscle('');
      setNewExerciseVideo('');
      setShowCreateModal(false);
      // Success feedback is handled by the mutation hook's onSuccess callback
    } catch (_error) {
      // Error is handled in hook
    }
  }, [newExerciseName, newExerciseMuscle, newExerciseVideo, createExerciseMutation]);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewExerciseName('');
    setNewExerciseMuscle('');
    setNewExerciseVideo('');
  }, []);

  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
    setEditingIndex(null);
    setCurrentExercise(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => {
      const isSelected = selected.includes(item.id);
      const selectedExerciseData = selectedExercises.find((ex) => ex.id === item.id);

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => toggleSelection(item)}
          className="mb-3"
        >
          <LinearGradient
            colors={
              isSelected
                ? ['rgba(249, 115, 22, 0.15)', 'rgba(249, 115, 22, 0.05)']
                : ['rgba(39, 39, 42, 0.6)', 'rgba(24, 24, 27, 0.4)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16 }}
            className={`overflow-hidden border ${isSelected ? 'border-orange-500/50' : 'border-white/5'}`}
          >
            <View className="flex-row items-center p-4 gap-4">
              {/* Icon/Image Placeholder */}
              <View
                className={`w-12 h-12 rounded-xl items-center justify-center border ${isSelected ? 'bg-orange-500 border-orange-400' : 'bg-zinc-800/80 border-white/5'}`}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={24} color="white" />
                ) : (
                  <Ionicons name="barbell" size={24} color="#52525b" />
                )}
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1.5">
                  <View className="bg-cyan-500/10 px-2.5 py-0.5 rounded-md self-start border border-cyan-500/20 shadow-sm shadow-cyan-500/10">
                    <Text className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                      {item.muscle_group || 'GERAL'}
                    </Text>
                  </View>
                </View>
                <Text
                  className={`text-base font-bold tracking-tight ${isSelected ? 'text-orange-100' : 'text-zinc-100'}`}
                >
                  {item.name}
                </Text>

                {/* Stats Preview if Selected */}
                {isSelected && selectedExerciseData && (
                  <View className="flex-row gap-3 mt-2.5 bg-black/20 self-start p-1.5 pr-3 rounded-lg border border-white/5">
                    <View className="flex-row items-center gap-1.5 ml-1">
                      <Ionicons name="layers" size={12} color="#fdba74" />
                      <Text className="text-orange-200 text-xs font-semibold">
                        {selectedExerciseData.sets} séries
                      </Text>
                    </View>
                    <View className="w-[1px] h-3 bg-white/10" />
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="repeat" size={12} color="#fdba74" />
                      <Text className="text-orange-200 text-xs font-semibold">
                        {selectedExerciseData.reps} reps
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {isSelected && (
                <TouchableOpacity onPress={() => handleDeselect(item.id)} className="p-2 -mr-2">
                  <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    className="rounded-full p-1"
                  >
                    <Ionicons name="close" size={18} color="#a1a1aa" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [selected, toggleSelection, selectedExercises, handleDeselect]
  );

  return (
    <View className="flex-1 bg-black">
      {/* Background with Gradient */}
      <LinearGradient
        colors={['#18181b', '#000000']}
        className="absolute inset-0"
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="px-6 pb-6 border-b border-white/5 z-10">
        <View className="flex-row items-center justify-between mb-6 mt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-zinc-800/50 border border-white/10 shadow-lg shadow-black"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          <Text className="text-xl font-black text-white uppercase tracking-wider italic">
            Exercícios
          </Text>

          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="w-10 h-10 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/30 shimmer"
          >
            <Ionicons name="add" size={22} color="#f97316" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-zinc-900/80 border border-white/10 rounded-2xl px-4 py-3.5 mb-5 shadow-sm shadow-black">
          <Ionicons name="search" size={20} color="#71717a" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nome..."
            placeholderTextColor="#52525B"
            className="flex-1 ml-3 text-white text-base font-medium"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#52525B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Muscle Group Filter */}
        <View>
          <FlatList
            horizontal
            data={['Todos', ...muscleGroups]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 24 }}
            renderItem={({ item }) => {
              const isActive =
                item === 'Todos' ? selectedMuscleGroup === null : selectedMuscleGroup === item;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedMuscleGroup(item === 'Todos' ? null : item)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isActive
                        ? ['#f97316', '#ea580c']
                        : ['rgba(39, 39, 42, 0.5)', 'rgba(39, 39, 42, 0.5)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className={`px-5 py-2.5 rounded-full border ${isActive ? 'border-orange-400' : 'border-white/10'}`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-white' : 'text-zinc-400'}`}
                    >
                      {item}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-zinc-500 mt-4 font-medium tracking-wide">
            Carregando catálogo...
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 24,
            paddingBottom: insets.bottom + 120, // Extra padding for floating button
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <View className="w-20 h-20 bg-zinc-900/50 rounded-full items-center justify-center mb-6 border border-zinc-800 border-dashed">
                <Ionicons name="barbell-outline" size={32} color="#3f3f46" />
              </View>
              <Text className="text-zinc-400 text-lg font-bold mb-2">
                Nenhum exercício encontrado
              </Text>
              <Text className="text-zinc-600 text-sm text-center px-10">
                Tente buscar por outro termo ou selecione outro grupo muscular.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Confirmation */}
      {selected.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 px-6 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.9} disabled={isAdding}>
            <LinearGradient
              colors={
                showSuccess
                  ? ['#10b981', '#059669']
                  : isAdding
                    ? ['#52525b', '#52525b']
                    : ['#f97316', '#ea580c']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl py-4 flex-row items-center justify-center shadow-2xl shadow-orange-500/40 border border-orange-400/20"
            >
              {isAdding ? (
                <ActivityIndicator color="#FFF" />
              ) : showSuccess ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text className="text-white text-lg font-black uppercase tracking-widest ml-2">
                    Adicionado!
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-lg font-black uppercase tracking-widest mr-3">
                    Adicionar {selected.length}
                  </Text>
                  <View className="bg-white/20 p-1 rounded-full">
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* New Exercise Creation Modal */}
      {showCreateModal && (
        <>
          <TouchableOpacity
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            activeOpacity={1}
            onPress={handleCloseCreateModal}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[32px] border-t border-white/10 overflow-hidden shadow-2xl shadow-black">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-6 pb-2 bg-zinc-900 z-10 pt-8">
              <View>
                <Text className="text-xl font-black text-white uppercase italic tracking-wider">
                  Novo Exercício
                </Text>
                <Text className="text-zinc-500 text-xs font-medium mt-1">
                  Adicione ao catalogo global
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseCreateModal}
                className="p-2 bg-zinc-800/50 rounded-full border border-white/5"
              >
                <Ionicons name="close" size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <View className="p-6" style={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}>
              <View className="mb-4">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">
                  Nome
                </Text>
                <TextInput
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
                  placeholder="Ex: Supino Reto"
                  placeholderTextColor="#52525B"
                  className="bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-base font-medium focus:border-orange-500/50"
                />
              </View>

              <View className="mb-4">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">
                  Grupo Muscular
                </Text>
                <TextInput
                  value={newExerciseMuscle}
                  onChangeText={setNewExerciseMuscle}
                  placeholder="Ex: Peito"
                  placeholderTextColor="#52525B"
                  className="bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-base font-medium focus:border-orange-500/50"
                />
              </View>

              <View className="mb-8">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">
                  URL do Vídeo
                </Text>
                <TextInput
                  value={newExerciseVideo}
                  onChangeText={setNewExerciseVideo}
                  placeholder="https://..."
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                  className="bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-base font-medium focus:border-orange-500/50"
                />
              </View>

              <TouchableOpacity
                onPress={handleCreateExercise}
                disabled={createExerciseMutation.isPending}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  className="rounded-2xl py-4 items-center shadow-lg shadow-orange-500/20"
                >
                  {createExerciseMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-base font-black uppercase tracking-widest">
                      Salvar Exercício
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Exercise Config Modal */}
      <ExerciseConfigModal
        visible={showConfigModal}
        onClose={handleCloseConfigModal}
        exercise={
          currentExercise || {
            id: '',
            name: '',
            muscle_group: '',
            video_url: null,
            description: null,
            is_verified: false,
            created_by: null,
            created_at: new Date().toISOString(),
          }
        }
        initialData={editingIndex !== null ? selectedExercises[editingIndex] : undefined}
        onSave={handleSaveExercise}
      />
    </View>
  );
}
