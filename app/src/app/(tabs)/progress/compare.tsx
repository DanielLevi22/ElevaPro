import { useAuthStore } from '@/auth';
import { CompareMeasurementsScreen } from '@/modules/progress';

export default function CompareMeasurementsRoute() {
  const { user, accountType } = useAuthStore();
  if (!user?.id) return null;
  return <CompareMeasurementsScreen studentId={user.id} hasSpecialist={accountType !== 'member'} />;
}
