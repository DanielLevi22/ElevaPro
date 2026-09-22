import { useWorkoutStore } from '../workoutStore';

// Use global mocks defined in jest.setup.ts
// biome-ignore lint/correctness/noUnusedVariables: auto-suppressed during final sweep
const { mockSupabase, mockSupabaseBuilder } = global as unknown as {
  mockSupabase: jest.Mock & { from: jest.Mock };
  mockSupabaseBuilder: jest.Mock;
};

jest.mock('@/modules/auth/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      accountType: 'specialist',
      isMasquerading: false,
    }),
  },
}));

describe('workoutStore', () => {
  const mockSupabaseQuery = (data: unknown, error: unknown = null, count: number | null = null) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      csv: jest.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noThenProperty: valid mock behavior
      then: (onfulfilled: (value: unknown) => unknown) =>
        Promise.resolve({
          data,
          error,
          count,
        }).then(onfulfilled),
    };
    return builder;
  };

  beforeEach(() => {
    useWorkoutStore.getState().reset();
    mockSupabase.from.mockReturnValue(mockSupabaseQuery(null));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be initially empty', () => {
    const state = useWorkoutStore.getState();
    expect(state.workouts).toEqual([]);
    expect(state.periodizations).toEqual([]);
  });

  it('should add workout items to workout', async () => {
    mockSupabase.from.mockReturnValue(mockSupabaseQuery({ id: 'w1', title: 'Updated' }));

    useWorkoutStore.setState({
      workouts: [
        {
          id: 'w1',
          training_plan_id: 'tp1',
          title: 'W1',
          specialist_id: 'spec1',
          student_id: null,
          created_at: '',
          updated_at: '',
          description: null,
          muscle_group: null,
          difficulty: null,
          day_of_week: null,
        },
      ],
    });

    await useWorkoutStore.getState().addWorkoutItems('w1', [
      {
        id: 'wi1',
        workout_id: 'w1',
        exercise_id: 'ex1',
        sets: 3,
        reps: '10',
        weight: '10',
        rest_seconds: 60,
        order_index: 0,
        notes: null,
        created_at: '',
      },
    ]);

    expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises');
  });

  it('should allow adding workout items with zero values (edge case)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workout_exercises') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });

    await useWorkoutStore.getState().addWorkoutItems('w1', [
      {
        id: 'wi2',
        workout_id: 'w1',
        exercise_id: 'ex1',
        sets: 0, // Edge case: 0 sets
        reps: '0', // Edge case: 0 reps
        weight: '0',
        rest_seconds: 0,
        order_index: 0,
        notes: null,
        created_at: '',
      },
    ]);

    expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises');
  });

  it('should fetch workouts for phase and update local state', async () => {
    const mockWorkouts = [{ id: 'w1', title: 'Treino A', training_plan_id: 'tp1' }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockWorkouts, error: null }),
        };
      }
      return {};
    });

    await useWorkoutStore.getState().fetchWorkoutsForPhase('tp1');

    const state = useWorkoutStore.getState();
    expect(state.workouts).toEqual(mockWorkouts);
  });

  it('should create workout and refetch workouts for the phase', async () => {
    const trainingPlanId = 'tp1';

    // Track if refetch was called
    let refetchCalled = false;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(async () => {
            return { data: { id: 'new-w' }, error: null };
          }),
          // For the refetch inside createWorkout
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockImplementation(async () => {
            refetchCalled = true;
            return { data: [], error: null };
          }),
        };
      }
      return {};
    });

    await useWorkoutStore.getState().createWorkout({
      training_plan_id: trainingPlanId,
      title: 'New Workout',
      specialist_id: 'p1',
    });

    expect(refetchCalled).toBe(true);
  });

  // O dia da semana é o que a aderência do aluno lê para saber o que está
  // prescrito (issue #335) — sem atualizar o estado local, a tela de revisão
  // mostraria o treino sem dia mesmo depois de salvo.
  it('should update a workout and update local state', async () => {
    useWorkoutStore.setState({
      // biome-ignore lint/suspicious/noExplicitAny: fixture mínima de teste
      workouts: [{ id: 'w1', title: 'Treino A', day_of_week: null } as any],
    });
    mockSupabase.from.mockReturnValue(
      mockSupabaseQuery({ id: 'w1', title: 'Treino A', day_of_week: 'monday' })
    );

    await useWorkoutStore.getState().updateWorkout('w1', { day_of_week: 'monday' });

    const state = useWorkoutStore.getState();
    expect(state.workouts.find((w) => w.id === 'w1')?.day_of_week).toBe('monday');
  });

  it('should fetch workout by id and update workouts in state', async () => {
    const mockWorkout = {
      id: 'w1',
      title: 'W1',
      items: [],
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkout, error: null }),
        };
      }
      return {};
    });

    useWorkoutStore.setState({ workouts: [] });

    const result = await useWorkoutStore.getState().fetchWorkoutById('w1');

    expect(result).toEqual(mockWorkout);
    const state = useWorkoutStore.getState();
    expect(state.workouts).toContainEqual(mockWorkout);
  });

  it('should duplicate workout correctly', async () => {
    const originalWorkout = {
      id: 'orig-id',
      title: 'Original',
      specialist_id: 'sp1',
      exercises: [{ exercise_id: 'ex1', sets: 3, reps: '10', order_index: 0 }],
    };
    const newWorkout = { id: 'new-id', title: 'Original (Cópia)' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: originalWorkout, error: null }),
          insert: jest.fn().mockReturnThis(),
        };
      }
      if (table === 'workout_exercises') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    // Mock insert to return new workout
    (mockSupabase.from('workouts').insert as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newWorkout, error: null }),
    });

    await useWorkoutStore.getState().duplicateWorkout('orig-id', 'target-plan');

    expect(mockSupabase.from).toHaveBeenCalledWith('workouts');
    expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises');
  });

  it('should fetch exercises and update state', async () => {
    const mockExercises = [{ id: 'ex1', name: 'Exercise 1' }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'exercises') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockExercises, error: null }),
        };
      }
      return {};
    });

    await useWorkoutStore.getState().fetchExercises();

    const state = useWorkoutStore.getState();
    expect(state.exercises).toEqual(mockExercises);
  });

  it('should create exercise and refetch', async () => {
    let fetchCalled = false;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'exercises') {
        const mock = {
          insert: jest.fn(),
          select: jest.fn(),
          single: jest.fn().mockResolvedValue({ data: { id: 'new-ex' }, error: null }),
          order: jest.fn().mockImplementation(() => {
            fetchCalled = true;
            return { data: [], error: null };
          }),
        };
        mock.insert.mockReturnValue(mock);
        mock.select.mockReturnValue(mock);
        return mock;
      }
      return {};
    });

    await useWorkoutStore.getState().createExercise({ name: 'New', muscle_group: 'Chest' });

    expect(fetchCalled).toBe(true);
  });

  it('should fetch library workouts and update libraryWorkouts state', async () => {
    const mockWorkouts = [{ id: 'w1', title: 'Library Workout' }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockWorkouts, error: null }),
        };
      }
      return {};
    });

    await useWorkoutStore.getState().fetchWorkouts('p1');

    const state = useWorkoutStore.getState();
    expect(state.libraryWorkouts).toEqual(mockWorkouts);
  });

  it('should fetch last workout session', async () => {
    const mockSession = { workout_id: 'w1', completed_at: '2024-01-01' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workout_sessions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
        };
      }
      return {};
    });

    const result = await useWorkoutStore.getState().fetchLastWorkoutSession('s1');

    expect(result).toEqual(mockSession);
  });
});
