import { createDailyNoticesService, usualWorkoutMinutes } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const notices = createDailyNoticesService(supabase);

export interface LearnedWorkoutTime {
  starts: number[];
  /** O horário de costume, em minutos desde a meia-noite. */
  usual: number;
}

/**
 * F2 · Os inícios de treino das últimas 4 semanas e o horário aprendido deles.
 *
 * @example const { data: horario } = useLearnedWorkoutTime(user.id);
 */
export function useLearnedWorkoutTime(studentId: string | null) {
  return useQuery<LearnedWorkoutTime>({
    queryKey: ['learned-workout-time', studentId],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('notices.learned_time', async () => {
        const state = await notices.fetchNoticeState(studentId ?? '', new Date());
        return {
          starts: [...state.workoutStarts],
          usual: usualWorkoutMinutes(state.workoutStarts),
        };
      }),
  });
}
