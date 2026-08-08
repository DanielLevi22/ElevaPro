import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { SelectedExercise } from '@/modules/workout';
import { ExerciseConfigModal, useWorkoutStore } from '@/modules/workout';
import { ROUTES } from '@/navigation/types';

interface WorkoutItem {
  id: string;
  exercise: {
    id: string;
    name: string;
    muscle_group: string;
    video_url?: string;
  };
  sets: number;
  reps: number | string;
  weight?: string;
  rest_seconds: number;
  order_index: number;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [workout, setWorkout] = useState<{
    title: string;
    description: string | null;
    student?: { id: string; full_name: string; email: string } | null;
  } | null>(null);
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkoutItem | null>(null);
  const [showWorkoutEditModal, setShowWorkoutEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Fetch workout details
  const fetchWorkoutDetails = useCallback(async () => {
    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          student:profiles!student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();
      if (workoutError) throw workoutError;

      if (!workoutData) {
        setLoading(false);
        return;
      }

      setWorkout(workoutData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          sets,
          reps,
          weight,
          rest_seconds,
          order_index,
          exercise:exercises (
            id,
            name,
            muscle_group,
            video_url
          )
        `)
        .eq('workout_id', id)
        .order('order_index', { ascending: true });
      if (itemsError) throw itemsError;
      // Transform to match interface (exercise may come as array)
      const transformed = (itemsData || []).map(
        (item: {
          id: string;
          sets: number;
          reps: string;
          weight?: string;
          rest_seconds: number;
          order_index: number;
          exercise: unknown;
        }) => ({
          ...item,
          exercise: Array.isArray(item.exercise)
            ? (item.exercise as WorkoutItem['exercise'][])[0]
            : (item.exercise as WorkoutItem['exercise']),
        })
      );
      setWorkoutItems(transformed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ... (fetchWorkoutDetails remains)

  // Initial load
  useEffect(() => {
    if (id) {
      fetchWorkoutDetails();
    }
  }, [id, fetchWorkoutDetails]);

  const { selectedExercises, clearSelectedExercises } = useWorkoutStore();

  useFocusEffect(
    // biome-ignore lint/correctness/useExhaustiveDependencies: workoutItems.map is a stable Array method — including it would cause infinite loops
    useCallback(() => {
      const handleNewExercises = async () => {
        if (selectedExercises.length > 0) {
          try {
            setLoading(true);

            const currentMaxOrder =
              workoutItems.length > 0 ? Math.max(...workoutItems.map((i) => i.order_index)) : -1;

            const newItems = selectedExercises.map((ex, index) => ({
              workout_id: id,
              exercise_id: ex.id,
              sets: ex.sets,
              reps: ex.reps.toString(),
              weight: ex.weight,
              rest_seconds: ex.rest_seconds,
              order_index: currentMaxOrder + 1 + index,
            }));

            const { error } = await supabase.from('workout_exercises').insert(newItems);

            if (error) throw error;

            clearSelectedExercises();
            Alert.alert('Sucesso', 'Novos exercícios adicionados!');
          } catch (e) {
            Alert.alert(
              'Erro',
              `Falha ao adicionar exercícios: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }

        if (id) fetchWorkoutDetails();
      };

      handleNewExercises();
    }, [id, selectedExercises, clearSelectedExercises, fetchWorkoutDetails, workoutItems.length])
  );

  const handleDeleteWorkout = () => {
    Alert.alert(
      'Deletar Treino',
      'Tem certeza que deseja deletar este treino? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await supabase.from('workout_exercises').delete().eq('workout_id', id);
              const { error } = await supabase.from('workouts').delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Sucesso! ✅', 'Treino deletado com sucesso!');
              router.back();
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : String(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteExercise = async (exerciseItemId: string) => {
    try {
      await supabase.from('workout_exercises').delete().eq('id', exerciseItemId);
      fetchWorkoutDetails();
    } catch (e) {
      Alert.alert('Erro ao deletar exercício', e instanceof Error ? e.message : String(e));
    }
  };

  const handleEditExercise = (item: WorkoutItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveExercise = async (updatedExercise: SelectedExercise) => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('workout_exercises')
        .update({
          sets: updatedExercise.sets,
          reps: updatedExercise.reps.toString(),
          weight: updatedExercise.weight,
          rest_seconds: updatedExercise.rest_seconds,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      // Update video URL if changed
      if (updatedExercise.video_url !== editingItem.exercise.video_url) {
        await supabase
          .from('exercises')
          .update({ video_url: updatedExercise.video_url || null })
          .eq('id', editingItem.exercise.id);
      }

      fetchWorkoutDetails();
      setShowEditModal(false);
      setEditingItem(null);
    } catch (_e) {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  const handleEditWorkout = () => {
    if (!workout) return;
    setEditTitle(workout.title);
    setEditDescription(workout.description || '');
    setShowWorkoutEditModal(true);
  };

  const handleSaveWorkout = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Erro', 'O título não pode estar vazio.');
      return;
    }

    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          title: editTitle,
          description: editDescription || null,
        })
        .eq('id', id);

      if (error) throw error;

      setShowWorkoutEditModal(false);
      fetchWorkoutDetails();
      Alert.alert('Sucesso', 'Treino atualizado!');
    } catch (e) {
      Alert.alert('Erro', `Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-muted-foreground mt-4 text-base">Carregando treino...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#A1A1AA" />
        <Text className="text-foreground text-xl font-bold mt-4">Treino não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6">
          <LinearGradient
            colors={['#FF6B35', '#E85A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl py-3.5 px-8"
          >
            <Text className="text-white text-base font-bold">Voltar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero Header */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop',
          }}
          className="h-96 w-full justify-between"
        >
          <LinearGradient
            colors={['transparent', '#000000']}
            className="absolute inset-0"
            locations={[0.3, 1]}
          />

          {/* Navbar */}
          <SafeAreaView className="flex-row items-center justify-between px-6 pt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-black/30 border border-white/10 p-3 rounded-full backdrop-blur-md"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleEditWorkout}
                className="bg-black/30 border border-white/10 p-3 rounded-full backdrop-blur-md"
              >
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteWorkout}
                disabled={deleting}
                className="bg-red-500/20 border border-red-500/30 p-3 rounded-full backdrop-blur-md"
              >
                <Ionicons name="trash-outline" size={20} color="#f87171" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Title & Info */}
          <View className="px-6 pb-12">
            <View className="flex-row gap-2 mb-3">
              <View className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">
                  Hipertrofia
                </Text>
              </View>
              <View className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-white text-[10px] font-bold uppercase tracking-widest">
                  {workoutItems.length} Exercícios
                </Text>
              </View>
            </View>

            <Text className="text-4xl font-black text-white font-display italic tracking-tighter shadow-lg shadow-black">
              {workout.title}
            </Text>

            {workout.description && (
              <Text className="text-zinc-300 text-sm mt-2 font-medium" numberOfLines={2}>
                {workout.description}
              </Text>
            )}
          </View>
        </ImageBackground>

        {/* Content Body */}
        <View className="flex-1 px-6 -mt-8 pt-2">
          {/* Manage Students Button */}
          <TouchableOpacity
            onPress={() => router.push(ROUTES.WORKOUTS.ASSIGNMENTS(id as string) as never)}
            activeOpacity={0.8}
            className="bg-zinc-900/50 p-4 rounded-3xl mb-8 border border-zinc-800 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4">
              <View className="bg-cyan-500/10 p-3 rounded-full border border-cyan-500/20">
                <Ionicons name="people" size={22} color="#06b6d4" />
              </View>
              <View>
                <Text className="text-white text-base font-bold">Gerenciar Alunos</Text>
                <Text className="text-zinc-500 text-xs">Atribuir este treino</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#52525B" />
          </TouchableOpacity>

          {/* Exercises Section */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-extrabold text-foreground">Exercícios</Text>
              <Text className="text-sm text-muted-foreground">
                {workoutItems.length} {workoutItems.length === 1 ? 'exercício' : 'exercícios'}
              </Text>
            </View>

            {workoutItems.length > 0 ? (
              <View>
                {workoutItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleEditExercise(item)}
                    activeOpacity={0.9}
                    className="bg-zinc-900 rounded-3xl mb-4 border border-zinc-800 overflow-hidden shadow-sm shadow-black"
                  >
                    {/* Header Row */}
                    <View className="flex-row justify-between items-start p-4 pb-2">
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2 mb-1">
                          <View className="bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                            <Text className="text-orange-500 text-[9px] font-black uppercase tracking-widest">
                              {item.exercise.muscle_group}
                            </Text>
                          </View>
                          {/* Order Badge */}
                          <View className="bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
                            <Text className="text-zinc-400 text-[9px] font-black uppercase">
                              #{index + 1}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-white text-lg font-bold font-display italic leading-tight">
                          {item.exercise.name}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View className="flex-row gap-1">
                        <TouchableOpacity
                          onPress={() => handleDeleteExercise(item.id)}
                          className="w-8 h-8 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20"
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Media / Divider */}
                    {item.exercise.video_url ? (
                      <View className="mt-2 h-48 w-full bg-black relative">
                        <VideoPlayer videoUrl={item.exercise.video_url} height={192} />
                        <LinearGradient
                          colors={['rgba(24,24,27,0)', 'rgba(24,24,27,1)']}
                          className="absolute bottom-0 left-0 right-0 h-12"
                        />
                      </View>
                    ) : (
                      <View className="h-[1px] bg-zinc-800 mx-4 my-2" />
                    )}

                    {/* Footer Stats */}
                    <View className="p-4 pt-2 flex-row gap-2 flex-wrap">
                      <View className="flex-1 min-w-[80px] bg-black/40 border border-zinc-800 p-2.5 rounded-xl items-center justify-center">
                        <Text className="text-zinc-500 text-[9px] uppercase font-bold mb-0.5">
                          Séries
                        </Text>
                        <Text className="text-white text-sm font-black italic">{item.sets}</Text>
                      </View>

                      <View className="flex-1 min-w-[80px] bg-black/40 border border-zinc-800 p-2.5 rounded-xl items-center justify-center">
                        <Text className="text-zinc-500 text-[9px] uppercase font-bold mb-0.5">
                          Reps
                        </Text>
                        <Text className="text-white text-sm font-black italic">{item.reps}</Text>
                      </View>

                      <View className="flex-1 min-w-[80px] bg-black/40 border border-zinc-800 p-2.5 rounded-xl items-center justify-center">
                        <Text className="text-zinc-500 text-[9px] uppercase font-bold mb-0.5">
                          Descanso
                        </Text>
                        <View className="flex-row items-baseline gap-0.5">
                          <Text className="text-white text-sm font-black italic">
                            {item.rest_seconds}
                          </Text>
                          <Text className="text-zinc-500 text-[10px]">s</Text>
                        </View>
                      </View>

                      {item.weight ? (
                        <View className="flex-1 min-w-[80px] bg-zinc-800/20 border border-orange-500/20 p-2.5 rounded-xl items-center justify-center">
                          <Text className="text-orange-500/70 text-[9px] uppercase font-bold mb-0.5">
                            Carga
                          </Text>
                          <View className="flex-row items-baseline gap-0.5">
                            <Text className="text-orange-500 text-sm font-black italic">
                              {item.weight}
                            </Text>
                            <Text className="text-orange-500/70 text-[10px]">kg</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="bg-zinc-900/50 rounded-3xl p-12 border-2 border-dashed border-zinc-800 items-center justify-center min-h-[300px]">
                <View className="bg-zinc-900 p-6 rounded-full mb-6 shadow-xl shadow-black">
                  <Ionicons name="barbell" size={48} color="#f97316" />
                </View>
                <Text className="text-zinc-500 text-base text-center mb-8 font-medium">
                  Seu treino está vazio.{'\n'}Comece adicionando exercícios!
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.WORKOUTS.SELECT_EXERCISES as never)}
                  activeOpacity={0.8}
                  className="bg-orange-500 rounded-2xl py-4 px-8 shadow-lg shadow-orange-500/20"
                >
                  <Text className="text-white text-base font-black uppercase tracking-widest">
                    Adicionar Exercício
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add More Button (Only show if list not empty) */}
            {workoutItems.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push(ROUTES.WORKOUTS.SELECT_EXERCISES as never)}
                activeOpacity={0.8}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5 items-center flex-row justify-center mt-4 mb-12 shadow-sm shadow-black"
              >
                <Ionicons name="add" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-bold uppercase tracking-widest">
                  Adicionar Exercício
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Workout Edit Modal */}
      {showWorkoutEditModal && (
        <>
          <TouchableOpacity
            className="absolute inset-0 bg-black/80"
            activeOpacity={1}
            onPress={() => setShowWorkoutEditModal(false)}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 border-t-2 border-border max-h-[70%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-extrabold text-foreground">Editar Treino</Text>
              <TouchableOpacity onPress={() => setShowWorkoutEditModal(false)}>
                <Ionicons name="close" size={28} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-muted-foreground text-xs mb-2 font-semibold">Título</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Nome do treino"
                placeholderTextColor="#52525B"
                className="bg-background border-2 border-border rounded-xl p-4 text-foreground text-base"
              />
            </View>

            <View className="mb-6">
              <Text className="text-muted-foreground text-xs mb-2 font-semibold">Descrição</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Descrição do treino (opcional)"
                placeholderTextColor="#52525B"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-background border-2 border-border rounded-xl p-4 text-foreground text-base min-h-[100px]"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveWorkout}
              activeOpacity={0.8}
              className="bg-cyan-400 p-4 rounded-xl items-center"
            >
              <Text className="text-background text-base font-bold">Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Exercise Edit Modal */}
      {editingItem && (
        <ExerciseConfigModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          exercise={{
            id: editingItem.exercise.id,
            name: editingItem.exercise.name,
            muscle_group: editingItem.exercise.muscle_group,
            description: null,
            video_url: editingItem.exercise.video_url || null,
            is_verified: false,
            created_by: null,
            created_at: new Date().toISOString(),
          }}
          initialData={{
            id: editingItem.exercise.id,
            name: editingItem.exercise.name,
            muscle_group: editingItem.exercise.muscle_group,
            sets: editingItem.sets,
            reps:
              typeof editingItem.reps === 'string'
                ? parseInt(editingItem.reps, 10)
                : editingItem.reps,
            weight: editingItem.weight || '',
            rest_seconds: editingItem.rest_seconds,
            video_url: editingItem.exercise.video_url,
          }}
          onSave={handleSaveExercise}
        />
      )}
    </View>
  );
}
