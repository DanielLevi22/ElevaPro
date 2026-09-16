import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { ScanMeasuresScreen } from '@/modules/assessment';

export default function ScanMeasuresRoute() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user?.id || !id) return null;
  return <ScanMeasuresScreen key={id} studentId={user.id} scanId={id} />;
}
