import { useAuthStore } from '@/auth';
import { JourneyScreen } from '@/modules/progress';

export default function JourneyRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <JourneyScreen studentId={user.id} />;
}
