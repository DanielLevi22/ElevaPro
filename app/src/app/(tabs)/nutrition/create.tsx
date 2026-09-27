import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';

/**
 * O endereço antigo de "criar dieta" leva ao passo 1 da criação nova (#337).
 * O Praticante cria para si; sem aluno, o especialista escolhe dentro do wizard.
 */
export default function LegacyCreateDietRoute() {
  const { preselectedStudentId } = useLocalSearchParams<{ preselectedStudentId?: string }>();
  const { user, accountType } = useAuthStore();
  const studentId = accountType === 'specialist' ? preselectedStudentId : user?.id;

  return (
    <Redirect
      href={{ pathname: ROUTES.NUTRITION.WIZARD_START, params: studentId ? { studentId } : {} }}
    />
  );
}
