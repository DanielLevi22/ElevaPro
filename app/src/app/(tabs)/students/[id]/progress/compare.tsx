import { useLocalSearchParams } from 'expo-router';
import { CompareMeasurementsScreen } from '@/modules/progress';

export default function SpecialistCompareMeasurementsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CompareMeasurementsScreen studentId={id} hasSpecialist />;
}
