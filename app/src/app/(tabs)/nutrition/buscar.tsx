import { primeiroNome } from '@elevapro/shared';
import { tokenDaSessao, useAuthStore } from '@/auth';
import { BuscarAlimentoScreen } from '@/modules/nutrition/routes/index';

/** A busca no catálogo do aluno, com o "+" que registra no que ele comeu hoje. */
export default function BuscarRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;

  return (
    <BuscarAlimentoScreen
      alunoId={user.id}
      primeiroNome={primeiroNome(user.user_metadata?.full_name) ?? 'Aluno'}
      obterToken={tokenDaSessao}
    />
  );
}
