import { primeiroNome } from '@elevapro/shared';
import { tokenDaSessao, useAuthStore } from '@/auth';
import { AssistenteDeNutricaoScreen } from '@/modules/nutrition/routes/index';

/** O assistente de nutrição do Aluno e do Praticante, no desenho do kit. */
export default function NutriBotRoute() {
  const { user } = useAuthStore();
  // A aba só abre com sessão; sem ela, não há de quem ser o assistente.
  if (!user?.id) return null;

  return (
    <AssistenteDeNutricaoScreen
      alunoId={user.id}
      primeiroNome={primeiroNome(user.user_metadata?.full_name) ?? 'Aluno'}
      obterToken={tokenDaSessao}
    />
  );
}
