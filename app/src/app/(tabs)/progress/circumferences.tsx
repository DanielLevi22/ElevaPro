import { useAuthStore } from '@/auth';
import { CircumferencesScreen, useCanDeclare } from '@/modules/progress';

export default function CircumferencesRoute() {
  const { user } = useAuthStore();
  const { canDeclare } = useCanDeclare(user?.id ?? '');
  if (!user?.id) return null;
  return <CircumferencesScreen studentId={user.id} canDeclare={canDeclare} />;
}
