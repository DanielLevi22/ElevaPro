import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';

export interface Workout {
  id: string;
  title: string;
  description: string | null;
  specialist_id: string;
  student_id: string | null;
  created_at: string;
}

export function useWorkouts(personalId?: string) {
  return useQuery({
    queryKey: ['workouts', personalId],
    queryFn: async () => {
      let query = supabase.from('workouts').select('*').order('created_at', { ascending: false });

      if (personalId) {
        query = query.eq('specialist_id', personalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Workout[];
    },
    enabled: !!personalId,
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Workout;
    },
    enabled: !!id,
  });
}
