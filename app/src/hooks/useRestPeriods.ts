import { createRestService, type RestPeriod } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const rests = createRestService(supabase);
const KEY = 'rest-periods';
const NONE: RestPeriod[] = [];

/**
 * As pausas do Modo Descanso (#376, A8). Mora fora dos módulos porque a tela
 * inicial, a sessão de treino (semana de retorno) e a sequência leem as mesmas.
 *
 * @example const pausas = useRestPeriods(user.id);
 */
export function useRestPeriods(studentId: string | null | undefined): RestPeriod[] {
  const { data } = useQuery({
    queryKey: [KEY, studentId],
    enabled: Boolean(studentId),
    queryFn: () => avisandoSeFalhar('rest.read', () => rests.recent(studentId as string)),
  });
  return data ?? NONE;
}

/**
 * Pausar e voltar. Os dois mudam a sequência, o check-in e o cartão do início:
 * recarrega tudo.
 *
 * @example const { start, end } = useRestActions(); await start.mutateAsync('2026-10-21');
 */
export function useRestActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries();
  const start = useMutation({ mutationFn: rests.start, onSuccess: refresh });
  const end = useMutation({ mutationFn: rests.end, onSuccess: refresh });
  return { start, end };
}
