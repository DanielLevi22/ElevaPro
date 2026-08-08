import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { createElement } from 'react';
import { useCreateWorkout, useDeleteWorkout } from '@/hooks/useWorkoutMutations';

const { mockSupabase, mockSupabaseBuilder } = global as unknown as {
  mockSupabase: { from: jest.Mock };
  mockSupabaseBuilder: Record<string, jest.Mock>;
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

const WORKOUT_INPUT = {
  title: 'Treino A',
  specialist_id: 'spec-1',
  items: [
    {
      exercise_id: 'ex-1',
      sets: 3,
      reps: '12',
      weight: '20',
      rest_seconds: 60,
      order_index: 0,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.from.mockReturnValue(mockSupabaseBuilder);
  mockSupabaseBuilder.single.mockResolvedValue({ data: { id: 'w-1' }, error: null });
  mockSupabaseBuilder.insert.mockReturnValue(mockSupabaseBuilder);
  mockSupabaseBuilder.delete.mockReturnValue(mockSupabaseBuilder);
});

describe('useCreateWorkout', () => {
  // Regressão: os exercícios eram inseridos em `workout_items`, tabela que não
  // existe no banco. O erro era propagado, então criar treino com exercício
  // falhava por completo.
  it('insere exercícios em workout_exercises', async () => {
    const { result } = renderHook(() => useCreateWorkout(), { wrapper });

    result.current.mutate(WORKOUT_INPUT);

    await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises'));
    expect(mockSupabase.from).not.toHaveBeenCalledWith('workout_items');
  });

  // Regressão: as colunas eram rest_time e order — os nomes reais em
  // workout_exercises são rest_seconds e order_index.
  it('usa os nomes de coluna do schema', async () => {
    const { result } = renderHook(() => useCreateWorkout(), { wrapper });

    result.current.mutate(WORKOUT_INPUT);

    await waitFor(() => expect(mockSupabaseBuilder.insert).toHaveBeenCalled());

    const inserted = mockSupabaseBuilder.insert.mock.calls.at(-1)?.[0];
    expect(inserted[0]).toMatchObject({ rest_seconds: 60, order_index: 0 });
    expect(inserted[0]).not.toHaveProperty('rest_time');
    expect(inserted[0]).not.toHaveProperty('order');
  });

  it('grava o treino com specialist_id, não personal_id', async () => {
    const { result } = renderHook(() => useCreateWorkout(), { wrapper });

    result.current.mutate(WORKOUT_INPUT);

    await waitFor(() => expect(mockSupabaseBuilder.insert).toHaveBeenCalled());

    const workoutRow = mockSupabaseBuilder.insert.mock.calls[0]?.[0];
    expect(workoutRow).toMatchObject({ specialist_id: 'spec-1' });
    expect(workoutRow).not.toHaveProperty('personal_id');
  });
});

describe('useDeleteWorkout', () => {
  it('limpa os exercícios da tabela correta antes de remover o treino', async () => {
    const { result } = renderHook(() => useDeleteWorkout(), { wrapper });

    result.current.mutate('w-1');

    await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('workouts'));
    expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('workout_items');
  });
});
