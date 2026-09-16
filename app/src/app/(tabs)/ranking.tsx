import { useAuthStore } from '@/auth';
import { RankingScreen } from '@/modules/gamification';

/**
 * A aba Ranking: o placar global para quem pratica e o dos alunos para o
 * especialista. Sem usuário não há placar a pedir.
 */
export default function RankingRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  return <RankingScreen userId={user.id} isSpecialist={accountType === 'specialist'} />;
}
