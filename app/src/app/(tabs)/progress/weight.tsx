import { useAuthStore } from '@/auth';
import { WeightTrendScreen } from '@/modules/progress';

export default function WeightTrendRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <WeightTrendScreen studentId={user.id} />;
}
