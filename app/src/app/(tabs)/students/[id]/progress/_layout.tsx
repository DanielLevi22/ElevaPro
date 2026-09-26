import { Stack, useRouter } from 'expo-router';
import { SpecialistProgressProvider } from '@/modules/progress';
import { useLinkedStudent } from '@/modules/students';

/**
 * O Progresso do aluno aberto pelo especialista (#334): as telas da aba do aluno,
 * dentro da pilha de Alunos, com as rotas e o voltar deste lado.
 */
export default function SpecialistProgressLayout() {
  const router = useRouter();
  const { studentId, student } = useLinkedStudent();
  if (!studentId) return null;
  return (
    <SpecialistProgressProvider
      studentId={studentId}
      studentName={student?.full_name ?? null}
      onBack={router.back}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </SpecialistProgressProvider>
  );
}
