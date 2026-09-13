import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useAuthStore } from '@/auth';
import { useGamificationStore } from '@/modules/gamification';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { primeiroValor, SessaoDeTreinoScreen } from '@/workout';

/**
 * A sessão de treino. A rota compõe o que é de outros módulos — a conta, a
 * permissão de editar o catálogo e a ofensiva do dia —, e a tela recebe só o
 * que precisa.
 */
export default function SessaoDeTreinoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isMasquerading, abilities } = useAuthStore();
  const incrementWorkoutProgress = useGamificationStore((s) => s.incrementWorkoutProgress);
  const aoRegistrar = useCallback(
    () => incrementWorkoutProgress(getLocalDateISOString()),
    [incrementWorkoutProgress]
  );

  if (!user?.id) return null;
  return (
    <SessaoDeTreinoScreen
      treinoId={primeiroValor(id) ?? ''}
      alunoId={user.id}
      mascarado={isMasquerading}
      podeEditarVideo={abilities?.can('update', 'Exercise') ?? false}
      onTreinoRegistrado={aoRegistrar}
    />
  );
}
