import { useAuthStore } from '@/auth';
import { ProgressScreen } from '@/modules/progress';

export default function ProgressRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <ProgressScreen studentId={user.id} />;
}
