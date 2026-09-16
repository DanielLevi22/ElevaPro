import { createHealthService, RANKING } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { LEADERBOARD_KEY } from './useLeaderboard';

const healthService = createHealthService(supabase);

export type RankingParticipation = 'checking' | 'in' | 'out';

export interface RankingConsent {
  participation: RankingParticipation;
  busy: boolean;
  join: () => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * Se o usuário participa do ranking global, e o entrar e sair.
 *
 * Participa só com o aceite **na versão vigente**: quem aceitou um texto antigo
 * vê o convite de novo, porque o que aparece para os outros pode ter mudado.
 * Falha na consulta conta como fora, o lado seguro.
 *
 * A chave é a mesma de Minhas autorizações: sair por lá atualiza esta tela.
 *
 * @example const { participation, join } = useRankingConsent(user.id);
 */
export function useRankingConsent(userId: string): RankingConsent {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['consentStatus', userId, RANKING.tipo],
    queryFn: () =>
      avisandoSeFalhar('ranking.consentimento', () =>
        healthService.getConsentStatus(userId, RANKING)
      ),
  });

  const settle = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['consentStatus'] }),
      queryClient.invalidateQueries({ queryKey: [LEADERBOARD_KEY] }),
    ]);
  const joining = useMutation({
    mutationFn: () => healthService.grantCollectionConsent(userId, RANKING),
    onSuccess: settle,
  });
  const leaving = useMutation({
    mutationFn: () => healthService.revokeCollectionConsent(userId, RANKING),
    onSuccess: settle,
  });

  return {
    participation: toParticipation(status.isPending, status.data?.state),
    busy: joining.isPending || leaving.isPending,
    join: () => joining.mutateAsync(),
    leave: () => leaving.mutateAsync(),
  };
}

function toParticipation(pending: boolean, state: string | undefined): RankingParticipation {
  if (pending) return 'checking';
  return state === 'granted' ? 'in' : 'out';
}
