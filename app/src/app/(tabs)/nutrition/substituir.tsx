import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { SubstituirAlimentoScreen } from '@/modules/nutrition/routes/index';
import { getLocalDateISOString } from '@/utils/dateUtils';

/** A troca de um alimento de uma refeição do aluno, na data aberta no plano. */
export default function SubstituirRoute() {
  const { refeicaoId, itemId, data } = useLocalSearchParams<{
    refeicaoId: string;
    itemId: string;
    data?: string;
  }>();
  const { isMasquerading } = useAuthStore();
  if (!refeicaoId || !itemId) return null;

  return (
    <SubstituirAlimentoScreen
      refeicaoId={refeicaoId}
      itemId={itemId}
      data={data ?? getLocalDateISOString()}
      somenteLeitura={isMasquerading}
    />
  );
}
