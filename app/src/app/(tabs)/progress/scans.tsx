import { useAuthStore } from '@/auth';
import { ScanHistoryScreen } from '@/modules/assessment';

export default function ScanHistoryRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <ScanHistoryScreen studentId={user.id} />;
}
