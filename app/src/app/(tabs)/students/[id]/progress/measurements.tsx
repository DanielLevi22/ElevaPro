import { useLocalSearchParams } from 'expo-router';
import { MeasurementHistoryScreen } from '@/modules/progress';

export default function SpecialistMeasurementHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MeasurementHistoryScreen studentId={id} />;
}
