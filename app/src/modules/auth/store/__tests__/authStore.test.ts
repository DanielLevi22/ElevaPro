// Mock modules before any imports
jest.mock('@elevapro/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  // O store lê o contexto por aqui. Antes o mock cobria `@/lib/supabase`, um
  // reexport que só trazia o cliente, e esta função vinha do módulo real; com o
  // reexport removido, o mock passou a substituir o pacote inteiro e precisa
  // declará-la.
  getUserContextJWT: jest.fn(),
  defineAbilitiesFor: jest.fn(() => ({ can: () => true, cannot: () => false })),
}));

const mockStudentReset = jest.fn();
const mockNutritionReset = jest.fn();
const mockWorkoutReset = jest.fn();

// Mock domain stores to verify reset() calls
jest.mock('../../../students/store/studentStore', () => ({
  useStudentStore: { getState: () => ({ reset: mockStudentReset }) },
}));
jest.mock('../../../nutrition/store/nutritionStore', () => ({
  useNutritionStore: { getState: () => ({ reset: mockNutritionReset }) },
}));
jest.mock('../../../workout/store/workoutStore', () => ({
  useWorkoutStore: { getState: () => ({ reset: mockWorkoutReset }) },
}));

import { getUserContextJWT } from '@elevapro/supabase';
import { useNutritionStore } from '../../../nutrition/store/nutritionStore';
import { useStudentStore } from '../../../students/store/studentStore';
import { useWorkoutStore } from '../../../workout/store/workoutStore';
import { useAuthStore } from '../authStore';

// Use global mocks
// const { mockSupabase } = global as unknown;

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      user: null,
      accountType: null,
      isLoading: false,
      isMasquerading: false,
    });
    jest.clearAllMocks();
  });

  it('should initialize available session', async () => {
    const mockUser = { id: 'u1', email: 'test@test.com' };
    const mockSession = { user: mockUser, access_token: 't1' };

    (getUserContextJWT as jest.Mock).mockResolvedValueOnce({
      accountType: 'personal',
      accountStatus: 'active',
      isSuperAdmin: false,
    });

    // biome-ignore lint/suspicious/noExplicitAny: Mocking session for unit tests
    await useAuthStore.getState().initializeSession(mockSession as any);

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect(state.accountType).toBe('personal');
    expect(state.isLoading).toBe(false);
  });

  it('should clear all stores on signOut', async () => {
    // Setup some state
    // biome-ignore lint/suspicious/noExplicitAny: Mocking session shape
    useAuthStore.setState({ user: { id: 'u1' } as any, session: {} as any });

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();

    // Check if domain stores were reset
    expect(useStudentStore.getState().reset).toHaveBeenCalled();
    expect(useNutritionStore.getState().reset).toHaveBeenCalled();
    expect(useWorkoutStore.getState().reset).toHaveBeenCalled();
  });

  it('should manage student view (masquerade)', async () => {
    const mockStudent = { id: 's1', full_name: 'John Doe', email: 'john@doe.com' };
    // biome-ignore lint/suspicious/noExplicitAny: Mocking user shape
    const mockState = { user: { id: 'p1' } as any, accountType: 'specialist' as const };
    useAuthStore.setState(mockState);

    (getUserContextJWT as jest.Mock).mockResolvedValueOnce({
      accountType: 'student',
      accountStatus: 'active',
    });

    await useAuthStore.getState().enterStudentView(mockStudent);

    const state = useAuthStore.getState();
    expect(state.isMasquerading).toBe(true);
    expect(state.user?.id).toBe('s1');
    expect(state.originalUser?.id).toBe('p1');

    // Verify resets on entering student view
    expect(useNutritionStore.getState().reset).toHaveBeenCalled();
    expect(useWorkoutStore.getState().reset).toHaveBeenCalled();

    // Exit student view
    await useAuthStore.getState().exitStudentView();

    const exitState = useAuthStore.getState();
    expect(exitState.isMasquerading).toBe(false);
    expect(exitState.user?.id).toBe('p1');
  });

  it('should skip session init during masquerade', async () => {
    useAuthStore.setState({ isMasquerading: true });

    // biome-ignore lint/suspicious/noExplicitAny: Empty session mock
    await useAuthStore.getState().initializeSession({} as any);

    // Should not set isLoading if skipping
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
