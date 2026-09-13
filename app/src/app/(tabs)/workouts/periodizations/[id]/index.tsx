import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { FasesDoCicloScreen } from '@/modules/workout/screens/aluno/FasesDoCicloScreen';
import PeriodizationDetailsScreen from '@/modules/workout/screens/PeriodizationDetailsScreen';
import { ehVisaoDoAluno, parametro } from '@/modules/workout/services/visaoDoAluno';

/**
 * O ciclo, na tela do papel de quem abre.
 *
 * O aluno vê as fases no desenho de vidro; o especialista e o membro que monta
 * o próprio plano seguem na tela de edição.
 */
export default function PeriodizacaoRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user, accountType } = useAuthStore();
  const modo = parametro(mode);

  if (user?.id && ehVisaoDoAluno(accountType, modo)) {
    return (
      <FasesDoCicloScreen periodizacaoId={parametro(id) ?? ''} alunoId={user.id} modo={modo} />
    );
  }
  return <PeriodizationDetailsScreen />;
}
