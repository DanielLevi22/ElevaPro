import { useAuthStore } from '@/auth';
import { CircumferencesScreen } from '@/modules/progress';

export default function CircumferencesRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  return <CircumferencesScreen studentId={user.id} canDeclare={accountType === 'member'} />;
}
