import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { DetalheDoTreinoScreen } from '@/modules/workout/screens/aluno/DetalheDoTreinoScreen';
import { ehVisaoDoAluno, parametro } from '@/modules/workout/services/visaoDoAluno';
import { WorkoutDetailsScreen } from '@/workout';

/** O detalhe do treino pela rota curta — a que o cartão da tela inicial abre. */
export default function TreinoRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { accountType } = useAuthStore();
  const modo = parametro(mode);

  if (ehVisaoDoAluno(accountType, modo)) {
    return <DetalheDoTreinoScreen treinoId={parametro(id) ?? ''} modo={modo} />;
  }
  return <WorkoutDetailsScreen />;
}
