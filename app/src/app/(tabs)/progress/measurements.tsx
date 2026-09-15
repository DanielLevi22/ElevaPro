import { useAuthStore } from '@/auth';
import { MeasurementHistoryScreen } from '@/modules/progress';

export default function MeasurementHistoryRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <MeasurementHistoryScreen studentId={user.id} />;
}
