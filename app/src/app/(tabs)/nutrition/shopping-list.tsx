import { useAuthStore } from '@/auth';
import { ListaDeComprasScreen } from '@/modules/nutrition/routes/index';
import ShoppingListScreen from '@/modules/nutrition/screens/ShoppingListScreen';

/**
 * A lista de compras na tela do papel: o aluno no desenho do kit; o member,
 * que monta o próprio plano, segue na tela com o assistente de lista.
 */
export default function ShoppingListRoute() {
  const { user, accountType } = useAuthStore();
  if (accountType === 'member' || !user?.id) return <ShoppingListScreen />;
  return <ListaDeComprasScreen alunoId={user.id} />;
}
