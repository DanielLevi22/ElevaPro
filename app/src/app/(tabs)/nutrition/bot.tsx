import { primeiroNome } from '@elevapro/shared';
import { tokenDaSessao, useAuthStore } from '@/auth';
import { AssistenteDeNutricaoScreen } from '@/modules/nutrition/routes/index';
import NutriBotScreen from '@/modules/nutrition/screens/NutriBotScreen';

/**
 * O assistente de nutrição na tela do papel: o aluno no desenho do kit; o
 * member segue na tela antiga até o plano dele ganhar desenho.
 */
export default function NutriBotRoute() {
  const { user, isMasquerading } = useAuthStore();
  // O Praticante usa a mesma tela do Aluno; a antiga fica só sem sessão.
  if (!user?.id) return <NutriBotScreen />;

  return (
    <AssistenteDeNutricaoScreen
      alunoId={user.id}
      primeiroNome={primeiroNome(user.user_metadata?.full_name) ?? 'Aluno'}
      somenteLeitura={isMasquerading}
      obterToken={tokenDaSessao}
    />
  );
}
