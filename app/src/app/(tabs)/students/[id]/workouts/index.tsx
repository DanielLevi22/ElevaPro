import { useLocalSearchParams } from 'expo-router';
import { PeriodizationsScreen } from '@/workout';

/**
 * Os treinos de um aluno, abertos pelo "Treinos" do Acompanhamento: a lista de
 * periodizações da aba Treinos, recortada no aluno (#334).
 */
export default function StudentWorkoutsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PeriodizationsScreen studentId={id} />;
}
