import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';

// O tipo e a consulta vinham duplicados aqui: `Exercise` era uma interface
// própria e a busca falava direto com o Supabase, sem o filtro de linhas
// -placeholder que o web aplicava. As duas coisas agora vêm do serviço.
export type { Exercise } from '@elevapro/shared';

const workoutsService = createWorkoutsService(supabase);

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => workoutsService.fetchExercises(),
    staleTime: 1000 * 60 * 10,
  });
}
