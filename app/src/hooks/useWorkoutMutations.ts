import { supabase } from '@elevapro/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import type { Workout } from './useWorkouts';

export interface CreateWorkoutInput {
  title: string;
  description?: string;
  specialist_id: string;
  items: Array<{
    exercise_id: string;
    sets: number;
    reps: string;
    weight?: string;
    rest_seconds: number;
    order_index: number;
  }>;
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workout: CreateWorkoutInput) => {
      // Criar workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          title: workout.title,
          description: workout.description || null,
          specialist_id: workout.specialist_id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Criar workout items
      if (workout.items.length > 0) {
        const workoutItems = workout.items.map((item) => ({
          workout_id: workoutData.id,
          exercise_id: item.exercise_id,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight || null,
          rest_seconds: item.rest_seconds,
          order_index: item.order_index,
        }));

        const { error: itemsError } = await supabase.from('workout_exercises').insert(workoutItems);

        if (itemsError) throw itemsError;
      }

      return workoutData as Workout;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout', data.id] });
    },
    onError: (error: Error) => {
      Alert.alert('Erro', error.message || 'Não foi possível criar o treino.');
    },
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Workout> }) => {
      const { data: updated, error } = await supabase
        .from('workouts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated as Workout;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout', data.id] });
    },
    onError: (error: Error) => {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o treino.');
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Deletar workout items primeiro
      await supabase.from('workout_exercises').delete().eq('workout_id', id);

      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onError: (error: Error) => {
      Alert.alert('Erro', error.message || 'Não foi possível deletar o treino.');
    },
  });
}
