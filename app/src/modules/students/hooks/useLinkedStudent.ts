import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/auth';
import { type Student, useStudentStore } from '../store/studentStore';

/**
 * O aluno da rota `students/[id]`, tirado da lista já carregada — e, se ele não
 * estiver nela (entrada por link, lista paginada), uma busca só.
 *
 * @example const { studentId, student, loading, retry } = useLinkedStudent();
 */
export function useLinkedStudent(): {
  studentId: string;
  student: Student | null;
  loading: boolean;
  retry: () => void;
} {
  const { id } = useLocalSearchParams();
  const studentId = (Array.isArray(id) ? id[0] : id) ?? '';
  const { students, fetchStudents, isLoading } = useStudentStore();
  const userId = useAuthStore((state) => state.user?.id);
  const [triedFetch, setTriedFetch] = useState(false);

  const student = students.find((s) => s.id === studentId) ?? null;

  useEffect(() => {
    if (student || !userId || isLoading || triedFetch) return;
    setTriedFetch(true);
    fetchStudents(userId);
  }, [student, userId, isLoading, triedFetch, fetchStudents]);

  const retry = () => {
    setTriedFetch(false);
  };

  return { studentId, student, loading: isLoading && !student, retry };
}
