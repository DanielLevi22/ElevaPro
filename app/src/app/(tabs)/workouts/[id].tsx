import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import {
  DetalheDoTreinoScreen,
  ehVisaoDoAluno,
  modoDaRota,
  primeiroValor,
  WorkoutDetailsScreen,
} from '@/workout';

/** O detalhe do treino pela rota curta — a que o cartão da tela inicial abre. */
export default function TreinoRoute() {
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
