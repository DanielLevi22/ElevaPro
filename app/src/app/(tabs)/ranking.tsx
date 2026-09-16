import { useAuthStore } from '@/auth';
import { RankingScreen } from '@/modules/gamification';

/**
 * A aba Ranking. O CASL decide qual placar abre: quem pode entrar no ranking vê
 * o global; quem só lê o placar (o especialista) vê o dos alunos.
 */
export default function RankingRoute() {
  const { user, abilities } = useAuthStore();
  if (!user?.id || !abilities?.can('read', 'Leaderboard')) return null;
  return (
    <RankingScreen userId={user.id} canParticipate={abilities.can('manage', 'RankingConsent')} />
  );
}
