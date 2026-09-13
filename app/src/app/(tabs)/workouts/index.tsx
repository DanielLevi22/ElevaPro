import { useAuthStore } from '@/auth';
import { ehVisaoDoAluno, PeriodizacoesDoAlunoScreen, PeriodizationsScreen } from '@/workout';

/**
 * A aba Treinos, na tela do papel de quem abre: o aluno vê os próprios ciclos
 * no desenho do kit; o especialista e o membro, que montam plano, seguem na
 * lista de edição.
 */
export default function TreinosRoute() {
  const { user, accountType } = useAuthStore();

  if (user?.id && ehVisaoDoAluno(accountType, undefined)) {
    return <PeriodizacoesDoAlunoScreen alunoId={user.id} />;
  }
  return <PeriodizationsScreen />;
}
