import { useAuthStore } from '@/auth';
import { BuscarAlimentoScreen } from '@/modules/nutrition/routes/index';

/** A busca no catálogo do aluno, com o "+" que registra no que ele comeu hoje. */
export default function BuscarRoute() {
  const { user, isMasquerading } = useAuthStore();
  if (!user?.id) return null;

  const nomeCompleto = String(user.user_metadata?.full_name ?? '');
  return (
    <BuscarAlimentoScreen
      alunoId={user.id}
      primeiroNome={nomeCompleto.split(' ')[0] || 'Aluno'}
      somenteLeitura={isMasquerading}
    />
  );
}
