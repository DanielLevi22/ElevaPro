import { useAuthStore } from '@/auth';
import { ExerciseLoadsScreen } from '@/modules/progress';

export default function ExerciseLoadsRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  return <ExerciseLoadsScreen studentId={user.id} />;
}
