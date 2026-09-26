import { useLocalSearchParams } from 'expo-router';
import { PROGRESS_SEGMENTS, ProgressScreen } from '@/modules/progress';

export default function SpecialistProgressRoute() {
  const { id, segment } = useLocalSearchParams<{ id: string; segment?: string }>();
  const initialSegment = PROGRESS_SEGMENTS.find((value) => value === segment) ?? 'overview';
  return <ProgressScreen key={initialSegment} studentId={id} initialSegment={initialSegment} />;
}
