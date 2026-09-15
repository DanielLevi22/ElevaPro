import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { PROGRESS_SEGMENTS, ProgressScreen, type ProgressSegment } from '@/modules/progress';

export default function ProgressRoute() {
  const { user } = useAuthStore();
  const { segment } = useLocalSearchParams<{ segment?: string }>();
  if (!user?.id) return null;
  return <ProgressScreen studentId={user.id} initialSegment={segmentFrom(segment)} />;
}

/** `?segment=training` abre direto no Treino; valor desconhecido abre o Geral. */
function segmentFrom(value: string | undefined): ProgressSegment {
  return PROGRESS_SEGMENTS.find((segment) => segment === value) ?? 'overview';
}
