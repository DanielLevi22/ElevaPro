import { useLocalSearchParams } from 'expo-router';
import { PeriodizationFormScreen } from '@/workout';

/**
 * A Nova periodização de um aluno, aberta do convite ou dos treinos dele, sem
 * sair da pilha de Alunos (#437).
 */
export default function StudentPeriodizationFormRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PeriodizationFormScreen studentId={id} />;
}
