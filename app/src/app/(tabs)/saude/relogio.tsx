import { useAuthStore } from '@/auth';
import { MyWatchScreen } from '@/modules/health';

export default function MyWatchRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <MyWatchScreen studentId={user.id} />;
}
