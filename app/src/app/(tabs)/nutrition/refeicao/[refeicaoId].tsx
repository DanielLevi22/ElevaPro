import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { DetalheDaRefeicaoScreen } from '@/modules/nutrition/routes/index';
import { getLocalDateISOString } from '@/utils/dateUtils';

/** O detalhe de uma refeição do plano do aluno, na data aberta no plano do dia. */
export default function RefeicaoRoute() {
  const { refeicaoId, data } = useLocalSearchParams<{ refeicaoId: string; data?: string }>();
  const { user, isMasquerading } = useAuthStore();
  if (!user?.id || !refeicaoId) return null;

  return (
    <DetalheDaRefeicaoScreen
      alunoId={user.id}
      refeicaoId={refeicaoId}
      data={data ?? getLocalDateISOString()}
      somenteLeitura={isMasquerading}
    />
  );
}
