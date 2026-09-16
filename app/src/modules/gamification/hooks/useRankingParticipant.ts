import { createHealthService, RANKING_PURPOSE } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showAlert } from '@/components/ui/appAlert';
import { avisandoSeFalhar, registrarFalha } from '@/lib/registro';
import { CONSENT_STATUS_KEY, consentStatusKey } from '@/shared/consentQueryKeys';
import type { ParticipantViewer, RankingParticipation } from '../types';
import { LEADERBOARD_KEY } from './useLeaderboard';

const healthService = createHealthService(supabase);

/**
 * O usuário como participante do ranking: se está no placar global, e o entrar
 * e sair.
 *
 * Participa só com o aceite **na versão vigente**, a mesma regra do banco
 * (`private.has_ranking_consent`): quem aceitou um texto antigo sai do placar
 * e vê o convite de novo. Falha na consulta conta como fora, o lado seguro.
 *
 * A chave é a de Minhas autorizações: sair por lá atualiza esta tela.
 *
 * @example const viewer = useRankingParticipant(user.id);
 */
export function useRankingParticipant(userId: string): ParticipantViewer {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: consentStatusKey(userId, RANKING_PURPOSE),
    queryFn: () =>
      avisandoSeFalhar('ranking.consentimento', () =>
        healthService.getConsentStatus(userId, RANKING_PURPOSE)
      ),
  });

  const settle = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [CONSENT_STATUS_KEY] }),
      queryClient.invalidateQueries({ queryKey: [LEADERBOARD_KEY] }),
    ]);
  const joining = useMutation({
    mutationFn: () => healthService.grantCollectionConsent(userId, RANKING_PURPOSE),
    onSuccess: settle,
  });
  const leaving = useMutation({
    mutationFn: () => healthService.revokeCollectionConsent(userId, RANKING_PURPOSE),
    onSuccess: settle,
  });

  return {
    kind: 'participant',
    participation: toParticipation(status.isPending, status.data?.state),
    busy: joining.isPending || leaving.isPending,
    join: () => withFailureNotice(joining.mutateAsync, 'ranking.entrar'),
    leave: () => withFailureNotice(leaving.mutateAsync, 'ranking.sair'),
  };
}

/** Entrar e sair não lançam: a falha vira aviso na tela e linha no log. */
async function withFailureNotice(action: () => Promise<unknown>, event: string): Promise<void> {
  try {
    await action();
  } catch {
    registrarFalha(event);
    showAlert({
      type: 'error',
      title: 'Não deu certo',
      message: 'Não consegui atualizar sua participação no ranking. Tente de novo.',
    });
  }
}

function toParticipation(pending: boolean, state: string | undefined): RankingParticipation {
  if (pending) return 'checking';
  return state === 'granted' ? 'in' : 'out';
}
