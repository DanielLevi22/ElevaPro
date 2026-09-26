import { type ActivityDay, createActivityService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const activityService = createActivityService(supabase);

/**
 * O feed de atividades do aluno, agrupado por dia — o mesmo que o web mostra.
 *
 * Roda sob a sessão do especialista, e não pela rota `/api/students/[id]/activities`:
 * aquela usa `service_role`, que ignora RLS, e só confere o vínculo. Por aqui a
 * RLS de `meal_logs` e `physical_assessments` fecha a fatia de saúde quando o
 * aluno revoga o consentimento (Art. 11; ver docs/LGPD_COMPLIANCE.md).
 *
 * `all` porque o acompanhamento mistura o que o aluno fez com o que o
 * especialista registrou — a avaliação física é dele.
 *
 * @example const { days, loading } = useStudentActivities(aluno.id);
 */
export function useStudentActivities(studentId: string): {
  days: ActivityDay[];
  loading: boolean;
  failed: boolean;
  reload: () => Promise<unknown>;
} {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['studentActivities', studentId],
    queryFn: () =>
      avisandoSeFalhar('students.activities.load', () =>
        activityService.fetchStudentActivities(studentId, 'all')
      ),
    enabled: studentId.length > 0,
  });
  return { days: data ?? [], loading: isPending, failed: isError, reload: refetch };
}
