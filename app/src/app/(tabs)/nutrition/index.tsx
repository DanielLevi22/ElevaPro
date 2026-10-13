import { useAuthStore } from '@/auth';
import { NutritionScreen, PlanoDoDiaScreen } from '@/modules/nutrition/routes/index';

/**
 * A aba Nutrição, na tela do papel de quem abre: o aluno vê o plano do dia no
 * desenho do kit, assim como o Praticante. O especialista segue na gestão.
 */
export default function NutritionRoute() {
  const { user, accountType, isMasquerading } = useAuthStore();

  if (accountType === 'specialist') return <NutritionScreen />;
  if (!user?.id) return null;
  // O Praticante vê o mesmo plano do dia do Aluno; o plano dele nasce no
  // onboarding (#365), e o vazio leva até lá.
  return (
    <PlanoDoDiaScreen
      alunoId={user.id}
      somenteLeitura={isMasquerading}
      selfGuided={accountType === 'member'}
    />
  );
}
