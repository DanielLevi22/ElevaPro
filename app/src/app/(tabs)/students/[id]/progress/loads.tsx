import { useLocalSearchParams } from 'expo-router';
import { ExerciseLoadsScreen } from '@/modules/progress';

export default function SpecialistExerciseLoadsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseLoadsScreen studentId={id} />;
}
