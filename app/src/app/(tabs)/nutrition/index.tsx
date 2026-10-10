import { useAuthStore } from '@/auth';
import { NutritionScreen, PlanoDoDiaScreen } from '@/modules/nutrition/routes/index';

/**
 * A aba Nutrição, na tela do papel de quem abre: o aluno vê o plano do dia no
 * desenho do kit; o member, que monta o próprio plano, e o especialista seguem
 * nas telas de edição.
 */
export default function NutritionRoute() {
  const { user, accountType, isMasquerading } = useAuthStore();

  if (accountType === 'specialist') return <NutritionScreen />;
  if (!user?.id) return null;
  // O Praticante vê o mesmo plano do dia do Aluno; criar e editar planos fica em
  // "Meus planos" (`MemberNutritionScreen`), a que ele chega pelo cabeçalho.
  return (
    <PlanoDoDiaScreen
      alunoId={user.id}
      somenteLeitura={isMasquerading}
      praticante={accountType === 'member'}
    />
  );
}
