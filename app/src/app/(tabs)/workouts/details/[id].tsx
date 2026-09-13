import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { DetalheDoTreinoScreen } from '@/modules/workout/screens/aluno/DetalheDoTreinoScreen';
import { ehVisaoDoAluno, parametro } from '@/modules/workout/services/visaoDoAluno';
import { ExecuteWorkoutScreen, WorkoutDetailsScreen } from '@/workout';

/**
 * O detalhe do treino, na tela do papel de quem abre.
 *
 * O membro treinando o próprio plano segue indo direto à execução, como já
 * fazia; o aluno vê o detalhe em vidro; o especialista, a tela de edição.
 */
export default function DetalheDoTreinoRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { accountType } = useAuthStore();
  const modo = parametro(mode);

  if (accountType === 'member' && modo === 'execute') return <ExecuteWorkoutScreen />;
  if (ehVisaoDoAluno(accountType, modo)) {
    return <DetalheDoTreinoScreen treinoId={parametro(id) ?? ''} modo={modo} />;
  }
  return <WorkoutDetailsScreen />;
}
