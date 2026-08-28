import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageSourcePropType,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { MuscleFilterCarousel } from '@/components/workout/MuscleFilterCarousel';
import { colors } from '@/constants/colors';
import { useWorkoutStore } from '../store/workoutStore';

const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {
  Peito: require('../../../../assets/workouts/chest.jpg'),
  Costas: require('../../../../assets/workouts/back.jpg'),
  Pernas: require('../../../../assets/workouts/legs.jpg'),
  Braços: require('../../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../../assets/workouts/shoulders.jpg'),
  Abdominais: require('../../../../assets/workouts/abs.jpg'),
  Geral: require('../../../../assets/workouts/back.jpg'),
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return colors.status.success;
    case 'intermediate':
      return colors.status.warning;
    case 'advanced':
      return colors.status.error;
    default:
      return colors.secondary.main;
  }
};

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'Iniciante';
    case 'intermediate':
      return 'Intermediário';
    case 'advanced':
      return 'Avançado';
    default:
      return difficulty;
  }
};

type WorkoutItem = ReturnType<typeof useWorkoutStore.getState>['workouts'][0];

export default function WorkoutsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { workouts, isLoading, fetchWorkouts } = useWorkoutStore();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const filteredWorkouts = useMemo(() => {
    if (!selectedMuscle) return workouts;
    return workouts.filter((w) => w.muscle_group === selectedMuscle);
  }, [workouts, selectedMuscle]);

  const _muscleFilters = [
    { name: 'Peito', icon: 'fitness' },
    { name: 'Costas', icon: 'body' },
    { name: 'Pernas', icon: 'footsteps' },
    { name: 'Braços', icon: 'barbell' },
    { name: 'Ombros', icon: 'shield' },
    { name: 'Abdominais', icon: 'grid' },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchWorkouts(user.id);
    }
  }, [user?.id, fetchWorkouts]);

  const renderItem = useCallback(
    ({ item }: { item: WorkoutItem }) => {
      const muscleGroup = item.muscle_group || 'Geral';
      const bgImage = MUSCLE_IMAGES[muscleGroup] || MUSCLE_IMAGES.Geral;

      const duration = 60;
      const exercisesCount = item.exercises_count || 0;

      return (
        <PremiumCard
          title={item.title}
          subtitle={`${muscleGroup} • ${getDifficultyLabel(item.difficulty || '')}`}
          image={bgImage}
          onPress={() => router.push(`/(tabs)/workouts/${item.id}`)}
          containerStyle={{ marginBottom: 24 }}
          badge={
            <View
              className="px-3 py-1 rounded-full border border-white/10 self-start"
              style={{ backgroundColor: `${getDifficultyColor(item.difficulty || '')}40` }}
            >
              <Text
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: getDifficultyColor(item.difficulty || '') }}
              >
                {getDifficultyLabel(item.difficulty || '')}
              </Text>
            </View>
          }
        >
          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-row items-center bg-black/40 px-3 py-2 rounded-xl border border-white/5">
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.secondary.main}
                style={{ marginRight: 8 }}
              />
              <Text className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                {duration} MIN
              </Text>
              <View className="w-[1px] h-3 bg-white/20 mx-3" />
              <Ionicons
                name="apps-outline"
                size={14}
                color={colors.primary.start}
                style={{ marginRight: 8 }}
              />
              <Text className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                {exercisesCount} EXERCÍCIOS
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                className="font-bold text-xs mr-1 uppercase"
                style={{ color: colors.primary.start }}
              >
                Detalhes
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary.start} />
            </View>
          </View>
        </PremiumCard>
      );
    },
    [router]
  );

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-6">
        <View>
          <Text className="text-4xl font-extrabold text-white mb-1 font-display">Treinos</Text>
          <Text className="text-base text-zinc-400 font-sans">Gerencie seus treinos</Text>
        </View>

        <Link href={'/(tabs)/workouts/create' as never} asChild>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 w-14 rounded-full items-center justify-center shadow-lg shadow-orange-500/20"
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>

      <MuscleFilterCarousel
        selectedMuscle={selectedMuscle}
        onSelectMuscle={setSelectedMuscle}
        containerStyle={{ marginBottom: 24 }}
      />

      {/* Content */}
      <FlatList
        data={filteredWorkouts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => user?.id && fetchWorkouts(user.id)}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center py-20">
              <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
                <Ionicons name="barbell-outline" size={64} color="#52525B" />
              </View>
              <Text className="text-white text-xl font-bold mb-2 text-center font-display">
                Nenhum treino criado
              </Text>
              <Text className="text-zinc-400 text-center px-8 text-sm mb-8 font-sans">
                Crie fichas de treino para seus alunos
              </Text>

              <Link href={'/(tabs)/workouts/create' as never} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#FF6B35', '#FF2E63']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-3 px-6 shadow-lg shadow-orange-500/20"
                  >
                    <Text className="text-white text-base font-bold font-display">
                      Criar Treino
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <View className="py-20">
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
