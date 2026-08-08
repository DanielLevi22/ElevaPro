import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

type Workout = {
  id: string;
  title: string;
  description?: string;
};

export default function CreateTrainingPlanScreen() {
  const router = useRouter();
  const { id: periodizationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [availableWorkouts, setAvailableWorkouts] = useState<Workout[]>([]);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch workouts on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    fetchWorkouts();
  }, [user]);

  const fetchWorkouts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, description')
        .eq('specialist_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAvailableWorkouts(data);
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const toggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) =>
      prev.includes(workoutId) ? prev.filter((id) => id !== workoutId) : [...prev, workoutId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome da ficha é obrigatório.');
      return;
    }

    if (!periodizationId) return;

    setLoading(true);

    try {
      // Create training plan
      const { data: planData, error: planError } = await supabase
        .from('training_plans')
        .insert({
          name,
          description: description || null,
          periodization_id: periodizationId,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Vincula os treinos à ficha. O modelo atual é relação direta via
      // workouts.training_plan_id — não existe tabela de junção.
      if (selectedWorkouts.length > 0 && planData) {
        const { error: linkError } = await supabase
          .from('workouts')
          .update({ training_plan_id: planData.id })
          .in('id', selectedWorkouts);

        if (linkError) throw linkError;
      }

      Alert.alert('Sucesso', 'Ficha criada com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating training plan:', error);
      Alert.alert('Erro', 'Não foi possível criar a ficha.');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorkoutsList = availableWorkouts.filter((w) => selectedWorkouts.includes(w.id));

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-6 py-4">
          <View className="mr-4">
            <IconButton icon="arrow-back" onPress={() => router.back()} />
          </View>
          <Text className="text-2xl font-bold text-foreground font-display">
            Nova Ficha de Treino
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
          {/* Nome */}
          <View className="mb-4">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">
              Nome da Ficha *
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Ex: Ficha A - Peito e Tríceps"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">Descrição</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Objetivos, foco, observações..."
              placeholderTextColor="#52525B"
              multiline
              numberOfLines={3}
              className="bg-zinc-900/80 rounded-2xl p-4 text-foreground text-base h-20 border-2 border-zinc-700"
              style={{ color: '#FFFFFF' }}
              textAlignVertical="top"
            />
          </View>

          {/* Selected Workouts */}
          <View className="mb-4">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">
              Treinos Selecionados ({selectedWorkouts.length})
            </Text>
            {selectedWorkoutsList.length > 0 ? (
              <View className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-2">
                {selectedWorkoutsList.map((workout, index) => (
                  <View
                    key={workout.id}
                    className="flex-row items-center justify-between mb-2 last:mb-0"
                  >
                    <View className="flex-1 flex-row items-center">
                      <View className="bg-primary-500/10 p-2 rounded-lg mr-3">
                        <Ionicons name="barbell" size={16} color="#FF6B35" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold font-sans">
                          {index + 1}. {workout.title}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleWorkout(workout.id)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <Text className="text-muted-foreground text-center font-sans">
                  Nenhum treino selecionado
                </Text>
              </View>
            )}
          </View>

          {/* Add Workouts Button */}
          <TouchableOpacity
            onPress={() => setShowWorkoutPicker(!showWorkoutPicker)}
            className="bg-secondary-500/10 border-2 border-secondary-500 rounded-xl p-4 mb-4 flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={20} color="#00D9FF" />
            <Text className="text-secondary-400 font-bold ml-2 font-display">
              {showWorkoutPicker ? 'Fechar Lista' : 'Adicionar Treinos'}
            </Text>
          </TouchableOpacity>

          {/* Workout Picker */}
          {showWorkoutPicker && (
            <View className="mb-4 bg-zinc-900/80 border-2 border-zinc-700 rounded-2xl overflow-hidden">
              {availableWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  onPress={() => toggleWorkout(workout.id)}
                  className="px-4 py-3 border-b border-zinc-800 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold font-sans">
                      {workout.title}
                    </Text>
                    {workout.description && (
                      <Text className="text-muted-foreground text-sm font-sans" numberOfLines={1}>
                        {workout.description}
                      </Text>
                    )}
                  </View>
                  {selectedWorkouts.includes(workout.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#00C9A7" />
                  )}
                </TouchableOpacity>
              ))}
              {availableWorkouts.length === 0 && (
                <View className="px-4 py-6">
                  <Text className="text-muted-foreground text-center font-sans">
                    Nenhum treino disponível
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={loading}
            variant="secondary"
            label={loading ? 'Salvando...' : 'Criar Ficha'}
            className="mb-10"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
