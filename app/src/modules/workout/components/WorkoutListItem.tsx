import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
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
  const escalar = useEscala();
  const apagado = isStudentView && (isSuggested || isWorkoutDoneToday);

  return (
    <TouchableOpacity onPress={onPress} className="mb-3">
      <Card
        className={cn(
          'flex-row items-center justify-between p-3',
          isStudentView && isSuggested && 'opacity-50',
          isStudentView && isWorkoutDoneToday && 'opacity-30'
        )}
      >
        <View className="flex-1 flex-row items-center">
          <View className="mr-3.5 h-14 w-14 overflow-hidden rounded-md">
            <ImageBackground
              source={MUSCLE_IMAGES[workout.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
              className="h-full w-full items-center justify-center"
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
                className="h-full w-full items-center justify-center"
              >
                <Text className="text-[0.75rem] font-bold text-white">
                  {workout.title.charAt(0)}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className={cn(
                'text-[1rem] font-bold',
                apagado ? 'text-muted-foreground' : 'text-foreground'
              )}
            >
              {workout.title}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <Ionicons name="barbell-outline" size={escalar(10)} color={cores.mutedForeground} />
              <Text className="text-legenda font-bold uppercase tracking-wide text-muted-foreground">
                {workout.muscle_group || 'Geral'} · {workout.exercises?.length || 0} exercícios
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={escalar(18)} color={cores.mutedForeground} />
      </Card>
    </TouchableOpacity>
  );
}
