import { createStudentsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

const studentsService = createStudentsService(supabase);
const PAGE_SIZE = 100;

export interface DietStudentChoice {
  id: string;
  name: string;
}

/**
 * Reúne os vínculos ativos, sem limitar a busca à primeira página de alunos.
 * A tela recebe só identificação, nunca contato ou dado clínico.
 * @example const choices = await fetchDietStudentChoices(specialistId);
 */
export async function fetchDietStudentChoices(specialistId: string): Promise<DietStudentChoice[]> {
  const choices = new Map<string, DietStudentChoice>();
  let page = 1;
  let total = 0;
  do {
    const result = await studentsService.fetchStudents(specialistId, { page, limit: PAGE_SIZE });
    for (const student of result.students) {
      choices.set(student.id, { id: student.id, name: student.full_name || 'Aluno sem nome' });
    }
    total = result.total;
    page += 1;
  } while ((page - 1) * PAGE_SIZE < total);
  return [...choices.values()];
}
