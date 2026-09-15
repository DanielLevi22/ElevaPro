import { useRouter } from 'expo-router';
import { useAuthStore } from '@/auth';
import { ConnectWatchScreen } from '@/modules/health';

export default function HealthConnectRoute() {
  const router = useRouter();
  const { accountType } = useAuthStore();
  return (
    <ConnectWatchScreen
      hasSpecialist={accountType === 'student'}
      onDone={() => router.replace('/(tabs)')}
    />
  );
}
