import type { Periodization, TrainingPlan } from '@elevapro/shared';
import { useWorkoutStore } from '../workoutStore';

function periodizacao(campos: Partial<Periodization> & { id: string }): Periodization {
  return {
    specialist_id: 'p1',
    student_id: 's1',
    name: 'Periodização',
    objective: null,
    status: 'planned',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...campos,
  };
}

function fase(campos: Partial<TrainingPlan> & { id: string }): TrainingPlan {
  return {
    periodization_id: 'p1',
    name: 'Fase',
    status: 'planned',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    order_index: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...campos,
  };
}

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

describe('workoutStore — periodizações e fases', () => {
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
        periodizacao({ id: 'old-active', student_id: studentId, status: 'active', name: 'Old' }),
        periodizacao({ id: periodizationId, student_id: studentId, name: 'New' }),
      ],
    });

    await useWorkoutStore.getState().activatePeriodization(periodizationId);

    const state = useWorkoutStore.getState();
    expect(state.periodizations.find((p) => p.id === periodizationId)?.status).toBe('active');
    expect(state.periodizations.find((p) => p.id === 'old-active')?.status).toBe('completed');
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
      objective: null,
    });

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
        specialist_id: 'p1',
        start_date: '2024-01-01',
        end_date: '2024-02-01',
        status: 'planned',
        objective: null,
      })
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
      periodizations: [periodizacao({ id: 'p1', name: 'Old' })],
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
      currentPeriodizationPhases: [fase({ id: 'tp1', name: 'Old' })],
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
        fase({ id: 'tp1', name: 'Phase 1' }),
        fase({ id: 'tp2', name: 'Phase 2' }),
      ],
    });

    await useWorkoutStore.getState().deleteTrainingPlan('tp1');

    const state = useWorkoutStore.getState();
    expect(state.currentPeriodizationPhases).toHaveLength(1);
    expect(state.currentPeriodizationPhases[0].id).toBe('tp2');
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
});
