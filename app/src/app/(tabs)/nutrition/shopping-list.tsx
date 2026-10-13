import { tokenDaSessao, useAuthStore } from '@/auth';
import { ListaDeComprasScreen } from '@/modules/nutrition/routes/index';

/** A lista de compras do Aluno e do Praticante, a partir do plano ativo. */
export default function ShoppingListRoute() {
  const { user } = useAuthStore();
  // A aba só abre com sessão; sem ela, não há plano de onde tirar a lista.
  if (!user?.id) return null;
  return <ListaDeComprasScreen alunoId={user.id} obterToken={tokenDaSessao} />;
}
