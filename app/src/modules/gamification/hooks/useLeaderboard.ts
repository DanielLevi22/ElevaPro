import {
  createGamificationService,
  type LeaderboardEntry,
  type LeaderboardScope,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const gamificationService = createGamificationService(supabase);

export const LEADERBOARD_KEY = 'leaderboard';

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  loading: boolean;
  failed: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * O placar da semana de um escopo.
 *
 * `enabled` segura o `global` até o consentimento responder: o banco recusa quem
 * não participa, e pedir antes seria um erro garantido na tela.
 *
 * @example const { entries, loading } = useLeaderboard('global', isParticipant);
 */
export function useLeaderboard(scope: LeaderboardScope, enabled: boolean): LeaderboardState {
  const query = useQuery({
    queryKey: [LEADERBOARD_KEY, scope],
    queryFn: () =>
      avisandoSeFalhar('ranking.placar', () => gamificationService.fetchLeaderboard(scope)),
    enabled,
  });

  return {
    entries: query.data ?? [],
    loading: enabled && query.isPending,
    failed: query.isError,
    refreshing: query.isRefetching,
    refresh: () => {
      // `refetch` passa por cima de `enabled`: puxar a tela sem o aceite pediria
      // ao banco o placar que ele recusa.
      if (enabled) query.refetch();
    },
  };
}
