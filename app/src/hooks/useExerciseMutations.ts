import { type CreateExerciseInput, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showAlert } from '@/components/ui/appAlert';

// As consultas desceram para `workouts.service`: eram escritas em `exercises`
// duplicadas aqui e no web, cada uma com o próprio formato de payload. O
// `Alert` continua aqui porque é a única parte genuinamente do mobile.
export type { CreateExerciseInput } from '@elevapro/shared';

const workoutsService = createWorkoutsService(supabase);

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exercise: CreateExerciseInput) => workoutsService.createExercise(exercise),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
    onError: (error: Error) => {
      showAlert({
        title: 'Erro',
        message: error.message || 'Não foi possível criar o exercício.',
        type: 'error',
      });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExerciseInput> }) =>
      workoutsService.updateExercise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
    onError: (error: Error) => {
      showAlert({
        title: 'Erro',
        message: error.message || 'Não foi possível atualizar o exercício.',
        type: 'error',
      });
    },
  });
}
