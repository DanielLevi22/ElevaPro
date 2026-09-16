import { useAuthStore } from '@/auth';
import { CompareMeasurementsScreen, useCanDeclare } from '@/modules/progress';

export default function CompareMeasurementsRoute() {
  const { user } = useAuthStore();
  // Quem não declara é quem tem especialista: o texto fala dele junto.
  const { canDeclare } = useCanDeclare(user?.id ?? '');
  if (!user?.id) return null;
  return <CompareMeasurementsScreen studentId={user.id} hasSpecialist={!canDeclare} />;
}
