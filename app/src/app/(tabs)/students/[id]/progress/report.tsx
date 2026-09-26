import { useLocalSearchParams } from 'expo-router';
import { PeriodReportScreen } from '@/modules/progress';
import { useLinkedStudent } from '@/modules/students';

export default function SpecialistPeriodReportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { student } = useLinkedStudent();
  return <PeriodReportScreen studentId={id} studentName={student?.full_name ?? null} />;
}
