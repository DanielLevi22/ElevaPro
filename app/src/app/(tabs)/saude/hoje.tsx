import { useAuthStore } from '@/auth';
import { HealthTodayScreen } from '@/modules/health';

export default function HealthTodayRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  return <HealthTodayScreen studentId={user.id} hasSpecialist={accountType !== 'member'} />;
}
