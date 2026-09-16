import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { PROGRESS_SEGMENTS, ProgressScreen, type ProgressSegment } from '@/modules/progress';

export default function ProgressRoute() {
  const { user } = useAuthStore();
  const { segment } = useLocalSearchParams<{ segment?: string }>();
  if (!user?.id) return null;
  const initialSegment = segmentFrom(segment);
  // A aba fica montada: sem a chave, um link com outro segmento chegaria à tela aberta
  // e não mudaria nada. Os dados estão no cache, e remontar não busca de novo.
  return (
    <ProgressScreen key={initialSegment} studentId={user.id} initialSegment={initialSegment} />
  );
}

/** `?segment=training` abre direto no Treino; valor desconhecido abre o Geral. */
function segmentFrom(value: string | undefined): ProgressSegment {
  return PROGRESS_SEGMENTS.find((segment) => segment === value) ?? 'overview';
}
