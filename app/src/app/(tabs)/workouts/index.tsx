import { useAuthStore } from '@/auth';
import { ChangePlanButton } from '@/modules/block';
import { ehVisaoDoAluno, PeriodizacoesDoAlunoScreen, PeriodizationsScreen } from '@/workout';

/**
 * A aba Treinos, na tela do papel de quem abre: o aluno vê as próprias periodizações
 * no desenho do kit; o especialista e o membro, que montam plano, seguem na
 * lista de edição.
 */
export default function TreinosRoute() {
  const { user, accountType } = useAuthStore();

  if (user?.id && ehVisaoDoAluno(accountType, undefined)) {
    return <PeriodizacoesDoAlunoScreen alunoId={user.id} />;
  }
  // O Praticante tem bloco próprio: o "…" muda o plano antes do fim (#376, C1).
  return <PeriodizationsScreen acaoDoBloco={<ChangePlanButton />} />;
}
