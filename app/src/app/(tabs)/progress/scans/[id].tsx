import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { ScanReadingScreen } from '@/modules/assessment';

export default function ScanReadingRoute() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user?.id || !id) return null;
  // `key`: a aba fica montada, e abrir outra análise precisa de tela nova.
  return <ScanReadingScreen key={id} studentId={user.id} scanId={id} />;
}
