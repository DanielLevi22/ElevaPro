import { useLocalSearchParams } from 'expo-router';
import { CircumferencesScreen } from '@/modules/progress';

export default function SpecialistCircumferencesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CircumferencesScreen studentId={id} canDeclare={false} />;
}
