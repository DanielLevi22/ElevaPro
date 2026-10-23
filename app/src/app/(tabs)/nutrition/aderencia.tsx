import { useAuthStore } from '@/auth';
import { AderenciaDaSemanaScreen } from '@/modules/nutrition/routes/index';

/** A aderência da semana do aluno ao plano alimentar. */
export default function AderenciaRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <AderenciaDaSemanaScreen alunoId={user.id} />;
}
