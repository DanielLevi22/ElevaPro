import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { TreinosDaFaseScreen } from '@/modules/workout/screens/aluno/TreinosDaFaseScreen';
import PhaseDetailsScreen from '@/modules/workout/screens/PhaseDetailsScreen';
import { ehVisaoDoAluno, parametro } from '@/modules/workout/services/visaoDoAluno';

/**
 * A fase, na tela do papel de quem abre.
 *
 * O aluno vê o próximo treino e os treinos da semana; o especialista e o membro
 * que monta o próprio plano seguem na tela de edição, com divisão e Co-Pilot.
 */
export default function FaseRoute() {
  const { id, phaseId, mode } = useLocalSearchParams<{
    id: string;
    phaseId: string;
    mode?: string;
  }>();
  const { user, accountType } = useAuthStore();
  const modo = parametro(mode);

  if (user?.id && ehVisaoDoAluno(accountType, modo)) {
    return (
      <TreinosDaFaseScreen
        periodizacaoId={parametro(id) ?? ''}
        faseId={parametro(phaseId) ?? ''}
        alunoId={user.id}
        modo={modo}
      />
    );
  }
  return <PhaseDetailsScreen />;
}
