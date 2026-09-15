import { useAuthStore } from '@/auth';
import { BodyCompositionScreen } from '@/modules/progress';

export default function BodyCompositionRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  // `member` é o Praticante até a migração do ADR-0028; a RLS confere no banco.
  return <BodyCompositionScreen studentId={user.id} canDeclare={accountType === 'member'} />;
}
