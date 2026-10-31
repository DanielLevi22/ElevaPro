import { tokenDaSessao, useAuthStore } from '@/auth';
import { EscanearPratoScreen } from '@/modules/nutrition/routes/index';

/** O scan do prato do Aluno e do Praticante, com o registro no diário. */
export default function ScanFoodRoute() {
  const { user } = useAuthStore();
  // A aba só abre com sessão; sem ela, não há diário onde registrar.
  if (!user?.id) return null;

  return <EscanearPratoScreen alunoId={user.id} obterToken={tokenDaSessao} />;
}
