import { useLocalSearchParams } from 'expo-router';
import { BodyCompositionScreen } from '@/modules/progress';

// `canDeclare` falso: declarar medida é do aluno sem especialista (0056), nunca de terceiro.
export default function SpecialistBodyCompositionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BodyCompositionScreen studentId={id} canDeclare={false} />;
}
