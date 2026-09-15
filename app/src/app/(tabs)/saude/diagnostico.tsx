import { useAuthStore } from '@/auth';
import { HealthCheckScreen } from '@/modules/health';

export default function HealthCheckRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <HealthCheckScreen studentId={user.id} />;
}
