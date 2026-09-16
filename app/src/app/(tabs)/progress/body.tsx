import { useAuthStore } from '@/auth';
import { BodyCompositionScreen, useCanDeclare } from '@/modules/progress';

export default function BodyCompositionRoute() {
  const { user } = useAuthStore();
  const { canDeclare } = useCanDeclare(user?.id ?? '');
  if (!user?.id) return null;
  return <BodyCompositionScreen studentId={user.id} canDeclare={canDeclare} />;
}
