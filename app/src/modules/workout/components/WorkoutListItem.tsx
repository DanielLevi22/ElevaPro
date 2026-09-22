import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { useCores } from '@/shared/design';
import { MUSCLE_IMAGES } from '../constants/muscleImages';
import type { Workout } from '../store/workoutStore';

interface WorkoutListItemProps {
  workout: Workout;
  isSuggested: boolean;
  isWorkoutDoneToday: boolean;
  isStudentView: boolean;
  onPress: () => void;
}

/** Uma linha da lista de treinos da fase, com a imagem do grupo muscular. */
export function WorkoutListItem({
  workout,
  isSuggested,
  isWorkoutDoneToday,
  isStudentView,
  onPress,
}: WorkoutListItemProps) {
  const cores = useCores();
  const apagado = isStudentView && (isSuggested || isWorkoutDoneToday);

  return (
    <TouchableOpacity
      className={`bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-3 flex-row justify-between items-center ${
        isStudentView && isSuggested ? 'opacity-50' : ''
      } ${isStudentView && isWorkoutDoneToday ? 'opacity-30' : ''}`}
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1">
        <View
          className={`w-14 h-14 rounded-2xl overflow-hidden mr-4 border border-zinc-800 ${
            isStudentView && isWorkoutDoneToday ? 'opacity-50' : ''
          }`}
        >
          <ImageBackground
            source={MUSCLE_IMAGES[workout.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
            className="w-full h-full items-center justify-center"
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
              className="w-full h-full items-center justify-center"
            >
              <Text className="text-white font-bold text-xs">{workout.title.charAt(0)}</Text>
            </LinearGradient>
          </ImageBackground>
        </View>
        <View>
          <Text className={`text-base font-bold ${apagado ? 'text-zinc-400' : 'text-white'}`}>
            {workout.title}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons
              name="barbell-outline"
              size={10}
              color={cores.mutedForeground}
              style={{ marginRight: 4 }}
            />
            <Text className="text-zinc-500 text-[0.625rem] font-bold uppercase tracking-wider">
              {workout.muscle_group || 'Geral'} • {workout.exercises?.length || 0} exercícios
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={cores.mutedForeground} />
    </TouchableOpacity>
  );
}
