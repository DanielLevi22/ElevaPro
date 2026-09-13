import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import {
  ehVisaoDoAluno,
  FasesDaPeriodizacaoScreen,
  modoDaRota,
  PeriodizationDetailsScreen,
  primeiroValor,
} from '@/workout';

/**
 * A periodização, na tela do papel de quem abre.
 *
 * O aluno vê as fases no desenho de vidro; o especialista e o membro que monta
 * o próprio plano seguem na tela de edição.
 */
export default function PeriodizacaoRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user, accountType } = useAuthStore();
  const modo = modoDaRota(mode);

  if (user?.id && ehVisaoDoAluno(accountType, modo)) {
    return (
      <FasesDaPeriodizacaoScreen
        periodizacaoId={primeiroValor(id) ?? ''}
        alunoId={user.id}
        modo={modo}
      />
    );
  }
  return <PeriodizationDetailsScreen />;
}
