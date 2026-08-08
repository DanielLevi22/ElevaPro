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

  it('should fetch periodizations successfully', async () => {
    const mockPeriodizations = [{ id: '1', name: 'Start', student_id: 's1', status: 'active' }];

    mockSupabase.from
      .mockReturnValueOnce(mockSupabaseQuery(mockPeriodizations))
      .mockReturnValueOnce(mockSupabaseQuery([{ id: 's1', full_name: 'Student One' }]))
      .mockReturnValueOnce(mockSupabaseQuery([]));

    await useWorkoutStore.getState().fetchPeriodizations('p1');

    const state = useWorkoutStore.getState();
    expect(state.periodizations).toHaveLength(1);
    expect(state.periodizations[0].student?.full_name).toBe('Student One');
  });

  it('should create a training plan', async () => {
    mockSupabase.from.mockReturnValue(mockSupabaseQuery({ id: 'new-plan', name: 'Phase 1' }));

    await useWorkoutStore.getState().createTrainingPlan({
      periodization_id: 'p1',
      name: 'Phase 1',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      status: 'planned',
      order_index: 0,
    });

    const state = useWorkoutStore.getState();
    expect(state.currentPeriodizationPhases).toHaveLength(1);
    const plan = state.currentPeriodizationPhases[0];
    expect(plan).toBeTruthy();
    expect(plan.id).toBe('new-plan');
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

  it('should handle saveWorkoutSession with empty items', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workout_sessions') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'session-123' },
            error: null,
          }),
        };
      }
      return {};
    });

    const sessionId = await useWorkoutStore.getState().saveWorkoutSession({
      workoutId: 'w1',
      studentId: 's1',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      items: [], // Edge case: empty items
    });

    expect(sessionId).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('workout_sessions');
  });

  it('should handle saveWorkoutSession error gracefully', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workout_sessions') {
        const chain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        };
        return chain;
      }
      return {};
    });

    await expect(
      useWorkoutStore.getState().saveWorkoutSession({
        workoutId: 'w1',
        studentId: 's1',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        items: [],
      })
    ).rejects.toThrow();
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

  it('should activate periodization and deactivate old ones', async () => {
    const periodizationId = 'new-active';
    const studentId = 's1';

    mockSupabase.from.mockImplementation((_table: string) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: periodizationId, student_id: studentId, status: 'active' },
          error: null,
        }),
      };
      return chain;
    });

    // Seed state with an active periodization for same student
    useWorkoutStore.setState({
      periodizations: [
        {
          id: 'old-active',
          student_id: studentId,
          status: 'active',
          name: 'Old',
          start_date: '',
          end_date: '',
        } as never,
        {
          id: periodizationId,
          student_id: studentId,
          status: 'planned',
          name: 'New',
          start_date: '',
          end_date: '',
        } as never,
      ],
    });

    await useWorkoutStore.getState().activatePeriodization(periodizationId);

    const state = useWorkoutStore.getState();
    expect(state.periodizations.find((p) => p.id === periodizationId)?.status).toBe('active');
    expect(state.periodizations.find((p) => p.id === 'old-active')?.status).toBe('completed');
  });

  it('should handle masquerade mode in saveWorkoutSession', async () => {
    // Override authStore mock for this test
    const { useAuthStore } = require('@/modules/auth/store/authStore');
    const originalGetState = useAuthStore.getState;
    useAuthStore.getState = jest.fn().mockReturnValue({ isMasquerading: true });

    const sessionId = await useWorkoutStore.getState().saveWorkoutSession({
      workoutId: 'w1',
      studentId: 's1',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      items: [],
    });

    expect(sessionId).toContain('masquerade-session-id');
    expect(mockSupabase.from).not.toHaveBeenCalled();

    // Restore
    useAuthStore.getState = originalGetState;
  });

  it('should save generated workouts successfully', async () => {
    const trainingPlanId = 'tp1';
    const personalId = 'p1';
    const aiWorkouts = [
      {
        letter: 'A',
        focus: 'Peito',
        exercises: [{ exerciseName: 'Supino', sets: 3, reps: '12', rest: 60 }],
      },
    ];

    // Mock exercises in state
    useWorkoutStore.setState({
      exercises: [{ id: 'ex1', name: 'Supino', muscle_group: 'Peito' } as never],
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return mockSupabaseQuery([{ id: 'w1', title: 'Treino A' }]);
      }
      return mockSupabaseQuery(null);
    });

    await useWorkoutStore.getState().saveGeneratedWorkouts(trainingPlanId, aiWorkouts, personalId);

    expect(mockSupabase.from).toHaveBeenCalledWith('workouts');
    expect(mockSupabase.from).toHaveBeenCalledWith('workout_exercises');
  });

  it('should create a periodization successfully', async () => {
    const mockPeriodization = {
      id: 'new-p',
      name: 'New P',
      student_id: 's1',
      specialist_id: 'p1',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      status: 'active',
      objective: 'hypertrophy',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_periodizations') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockPeriodization, error: null }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { full_name: 'Student Name' },
            error: null,
          }),
        };
      }
      return {};
    });

    const result = await useWorkoutStore.getState().createPeriodization({
      name: 'New P',
      student_id: 's1',
      specialist_id: 'p1',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      status: 'active',
      type: 'hypertrophy',
    } as never);

    expect(result).toEqual(mockPeriodization);
    const state = useWorkoutStore.getState();
    expect(state.periodizations[0]).toEqual({
      ...mockPeriodization,
      student: { id: 's1', full_name: 'Student Name', email: undefined },
    });
  });

  it('should handle createPeriodization error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_periodizations') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
        };
      }
      return {};
    });

    await expect(
      useWorkoutStore.getState().createPeriodization({
        name: 'Fail',
        student_id: 's1',
      } as never)
    ).rejects.toThrow('Insert failed');
  });

  it('should update periodization and update local state', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_periodizations') {
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'p1', name: 'New' }, error: null }),
        };
      }
      return {};
    });

    useWorkoutStore.setState({
      periodizations: [{ id: 'p1', name: 'Old' } as never],
    });

    await useWorkoutStore.getState().updatePeriodization('p1', { name: 'New' });

    const state = useWorkoutStore.getState();
    expect(state.periodizations[0].name).toBe('New');
  });

  it('should update training plan and update local state', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_plans') {
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'tp1', name: 'New' }, error: null }),
        };
      }
      return {};
    });

    useWorkoutStore.setState({
      currentPeriodizationPhases: [{ id: 'tp1', name: 'Old' } as never],
    });

    await useWorkoutStore.getState().updateTrainingPlan('tp1', { name: 'New' });

    const state = useWorkoutStore.getState();
    expect(state.currentPeriodizationPhases[0].name).toBe('New');
  });

  it('should delete training plan and remove from local state', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { periodization_id: 'p1' }, error: null }),
        };
      }
      return {};
    });

    useWorkoutStore.setState({
      currentPeriodizationPhases: [
        { id: 'tp1', name: 'Phase 1' } as never,
        { id: 'tp2', name: 'Phase 2' } as never,
      ],
    });

    await useWorkoutStore.getState().deleteTrainingPlan('tp1');

    const state = useWorkoutStore.getState();
    expect(state.currentPeriodizationPhases).toHaveLength(1);
    expect(state.currentPeriodizationPhases[0].id).toBe('tp2');
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

  it('should save cardio session', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'cardio-w' }, error: null }),
      insert: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(() => mockQuery);

    await useWorkoutStore.getState().saveCardioSession({
      studentId: 's1',
      exerciseName: 'Running',
      durationSeconds: 1800,
      calories: 300,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('workout_sessions');
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

  it('should fetch periodization phases and update state', async () => {
    const mockPhases = [{ id: 'tp1', name: 'Phase 1', periodization_id: 'p1', workouts_count: 0 }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'training_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockPhases, error: null }),
        };
      }
      if (table === 'workouts') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    await useWorkoutStore.getState().fetchPeriodizationPhases('p1');

    const state = useWorkoutStore.getState();
    expect(state.currentPeriodizationPhases).toEqual(mockPhases);
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

  it('should fetch workout session details', async () => {
    const mockDetails = { id: 's1', items: [] };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workout_sessions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockDetails, error: null }),
        };
      }
      return {};
    });

    const result = await useWorkoutStore.getState().fetchWorkoutSessionDetails('w1', 's1');

    expect(result).toEqual(mockDetails);
  });
});
