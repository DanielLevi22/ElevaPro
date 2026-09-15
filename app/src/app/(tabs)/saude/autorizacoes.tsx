import { useAuthStore } from '@/auth';
import { AuthorizationsScreen } from '@/modules/health';

export default function AuthorizationsRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  return <AuthorizationsScreen studentId={user.id} hasSpecialist={accountType !== 'member'} />;
}
