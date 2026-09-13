import { useAuthStore } from '@/auth';
import {
  MemberNutritionScreen,
  NutritionScreen,
  PlanoDoDiaScreen,
} from '@/modules/nutrition/routes/index';

/**
 * A aba Nutrição, na tela do papel de quem abre: o aluno vê o plano do dia no
 * desenho do kit; o member, que monta o próprio plano, e o especialista seguem
 * nas telas de edição.
 */
export default function NutritionRoute() {
  const { user, accountType, isMasquerading } = useAuthStore();

  if (accountType === 'specialist') return <NutritionScreen />;
  if (accountType === 'member') return <MemberNutritionScreen />;
  if (!user?.id) return null;
  return <PlanoDoDiaScreen alunoId={user.id} somenteLeitura={isMasquerading} />;
}
