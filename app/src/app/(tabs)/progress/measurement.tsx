import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { MeasurementFormScreen } from '@/modules/progress';

export default function MeasurementFormRoute() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!user?.id) return null;
  return <MeasurementFormScreen studentId={user.id} editingId={id} />;
}
