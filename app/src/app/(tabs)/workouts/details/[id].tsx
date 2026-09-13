import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import {
  DetalheDoTreinoScreen,
  ehVisaoDoAluno,
  modoDaRota,
  primeiroValor,
  WorkoutDetailsScreen,
} from '@/workout';

/**
 * O detalhe do treino, na tela do papel de quem abre.
 *
 * O membro treinando o próprio plano passa pelo detalhe como o aluno, e não
 * mais direto à execução: as duas rotas de detalhe tratavam o membro de jeitos
 * diferentes, e ele via ou não o detalhe conforme a porta por onde entrava.
 */
export default function DetalheDoTreinoRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user, accountType } = useAuthStore();
  const modo = modoDaRota(mode);

  if (user?.id && ehVisaoDoAluno(accountType, modo)) {
    return (
      <DetalheDoTreinoScreen treinoId={primeiroValor(id) ?? ''} alunoId={user.id} modo={modo} />
    );
  }
  return <WorkoutDetailsScreen />;
}
