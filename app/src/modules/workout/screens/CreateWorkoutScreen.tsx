import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useWorkoutStore } from '../store/workoutStore';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const { createWorkout, isLoading } = useWorkoutStore();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [muscleGroup, setMuscleGroup] = useState('Peito');

  const handleCreate = async () => {
    if (!title.trim()) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, informe um título para o treino',
        type: 'error',
      });
      return;
    }

    if (!user?.id) {
      showAlert({ title: 'Erro', message: 'Usuário não autenticado', type: 'error' });
      return;
    }

    const result = await (
      createWorkout as unknown as (
        data: Record<string, unknown>
      ) => Promise<{ success: boolean; data?: { id?: string }; error?: string }>
    )({
      title,
      description,
      difficulty,
      muscle_group: muscleGroup,
      specialist_id: user.id,
    });

    if (result.success) {
      showAlert({
        title: 'Sucesso',
        message: 'Treino criado com sucesso!',
        type: 'success',
        buttonText: 'OK',
        onDismiss: () => router.replace(`/(tabs)/workouts/${result.data?.id}`),
      });
    } else {
      showAlert({ title: 'Erro', message: result.error || 'Falha ao criar treino', type: 'error' });
    }
  };

  const difficultyOptions = [
    { value: 'beginner', label: 'Iniciante', color: '#00C9A7' },
    { value: 'intermediate', label: 'Intermediário', color: '#FFB800' },
    { value: 'advanced', label: 'Avançado', color: '#FF2E63' },
  ];

  const muscleOptions = [
    { value: 'Peito', icon: 'fitness-outline' },
    { value: 'Costas', icon: 'body-outline' },
    { value: 'Pernas', icon: 'footsteps-outline' },
    { value: 'Braços', icon: 'barbell-outline' },
    { value: 'Ombros', icon: 'shield-outline' },
    { value: 'Abdominais', icon: 'grid-outline' },
  ];

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-zinc-900 p-3 rounded-xl mr-4 border border-zinc-800"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-extrabold text-white font-display">Novo Treino</Text>
            <Text className="text-zinc-400 font-sans">Crie uma nova ficha de treino</Text>
          </View>
        </View>

        {/* Form */}
        <View className="flex-1">
          <View className="mb-6">
            <Text className="text-base font-bold text-white mb-3 font-display">
              Título do Treino
            </Text>
            <View className="bg-zinc-900 rounded-xl border-2 border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-14">
              <Ionicons name="text-outline" size={20} color="#71717A" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-white text-base font-sans"
                placeholder="Ex: Treino A - Peito e Tríceps"
                placeholderTextColor="#52525B"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-base font-bold text-white mb-3 font-display">
              Descrição (Opcional)
            </Text>
            <View className="bg-zinc-900 rounded-xl border-2 border-zinc-800 focus:border-orange-500 p-4 h-32">
              <TextInput
                className="flex-1 text-white text-base font-sans"
                placeholder="Adicione observações ou instruções gerais..."
                placeholderTextColor="#52525B"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-base font-bold text-white mb-3 font-display">
              Grupo Muscular Dominante (Visual)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {muscleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setMuscleGroup(option.value)}
                  className={`px-4 py-3 rounded-xl border-2 flex-row items-center ${
                    muscleGroup === option.value
                      ? 'bg-orange-500 border-orange-500'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <Ionicons
                    name={option.icon as never}
                    size={16}
                    color={muscleGroup === option.value ? '#FFFFFF' : '#71717A'}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`font-bold text-xs font-display ${
                      muscleGroup === option.value ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-base font-bold text-white mb-3 font-display">
              Nível de Dificuldade
            </Text>
            <View className="flex-row gap-3">
              {difficultyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setDifficulty(option.value)}
                  className={`flex-1 p-3 rounded-xl border-2 items-center justify-center ${
                    difficulty === option.value ? 'bg-zinc-800' : 'bg-zinc-900 border-zinc-800'
                  }`}
                  style={{
                    borderColor: difficulty === option.value ? option.color : '#27272A',
                  }}
                >
                  <Text
                    className="font-bold text-sm font-display"
                    style={{
                      color: difficulty === option.value ? option.color : '#71717A',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity onPress={handleCreate} disabled={isLoading} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl py-4 items-center justify-center shadow-lg shadow-orange-500/20"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-bold font-display">
                  Criar e Adicionar Exercícios
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
