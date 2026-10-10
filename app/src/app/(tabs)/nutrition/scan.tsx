import { tokenDaSessao, useAuthStore } from '@/auth';
import { EscanearPratoScreen } from '@/modules/nutrition/routes/index';
import ScanFoodScreen from '@/modules/nutrition/screens/ScanFoodScreen';

/**
 * O scan do prato na tela do papel: o aluno no desenho do kit, com o registro
 * no diário; o member segue na tela antiga até o plano dele ganhar desenho.
 */
export default function ScanFoodRoute() {
  const { user, isMasquerading } = useAuthStore();
  // O Praticante usa a mesma tela do Aluno; a antiga fica só sem sessão.
  if (!user?.id) return <ScanFoodScreen />;

  return (
    <EscanearPratoScreen
      alunoId={user.id}
      somenteLeitura={isMasquerading}
      obterToken={tokenDaSessao}
    />
  );
}
