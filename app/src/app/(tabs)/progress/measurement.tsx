import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { MeasurementFormScreen, useCanDeclare } from '@/modules/progress';

export default function MeasurementFormRoute() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Corrigir o que declarou é direito de quem declarou, mesmo depois de contratar um
  // especialista (Art. 18, III); declarar de novo, não.
  const { canDeclare } = useCanDeclare(user?.id ?? '');
  if (!user?.id) return null;
  return <MeasurementFormScreen studentId={user.id} editingId={id} canDeclare={canDeclare} />;
}
