import { View } from 'react-native';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import type { Workout } from '../store/workoutStore';

interface WorkoutListItemProps {
  workout: Workout;
  isSuggested: boolean;
  isWorkoutDoneToday: boolean;
  isStudentView: boolean;
  onPress: () => void;
}

const OPACIDADE_SUGERIDO = 0.5;
const OPACIDADE_FEITO = 0.3;

/** Uma linha da lista de treinos da fase, no mesmo vidro das entradas da home. */
export function WorkoutListItem({
  workout,
  isSuggested,
  isWorkoutDoneToday,
  isStudentView,
  onPress,
}: WorkoutListItemProps) {
  const opacidade =
    isStudentView && isWorkoutDoneToday
      ? OPACIDADE_FEITO
      : isStudentView && isSuggested
        ? OPACIDADE_SUGERIDO
        : 1;

  return (
    <View style={{ opacity: opacidade }}>
      <LinhaDeVidro
        icon="barbell"
        tom="marca"
        titulo={workout.title}
        sub={`${workout.muscle_group || 'Geral'} · ${workout.exercises?.length || 0} exercícios`}
        onPress={onPress}
      />
    </View>
  );
}
