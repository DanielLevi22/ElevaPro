import { defineAbilitiesFor } from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import { mockSupabaseBuilder } from '../../../../../jest.setup';
import { useWorkoutWizardStore } from '../../store/workoutWizardStore';
import WorkoutAssistantScreen from '../WorkoutAssistantScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ studentId: 'student', sessionId: 'old-chat' }),
}));
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  mockReplace.mockClear();
  useWorkoutWizardStore.getState().reset();
  useAuthStore.setState({
    accountType: 'specialist',
    user: { id: 'author' } as Session['user'],
    session: { access_token: 'token' } as Session,
    abilities: defineAbilitiesFor({ accountType: 'specialist', services: ['personal_training'] }),
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      sessionId: 'old-chat',
      messages: [],
      periodization: { name: 'Treino A', phases: [] },
      savedPeriodizationId: 'period',
      savedWorkoutTitles: [],
      workoutProposal: null,
    }),
  });
  mockSupabaseBuilder.maybeSingle.mockResolvedValue({
    data: { id: 'period', student_id: 'student', status: 'active' },
    error: null,
  });
});

it.each([
  'planned',
  'active',
  'completed',
])('abre a fase %s no destino correto sem perder a conversa', async (status) => {
  mockSupabaseBuilder.then
    .mockImplementationOnce((resolve) => resolve({ data: null, error: null }))
    .mockImplementationOnce((resolve) =>
      resolve({ data: [{ id: 'phase', periodization_id: 'period', status }], error: null })
    )
    .mockImplementationOnce((resolve) => resolve({ data: [], error: null }));
  render(<WorkoutAssistantScreen />);
  await screen.findByText('Treino A');
  fireEvent.press(screen.getByText('Abrir plano de treino'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  if (status !== 'planned') {
    expect(mockReplace).toHaveBeenCalledWith(ROUTES.WORKOUTS.PERIODIZATION('period'));
    expect(useWorkoutWizardStore.getState().phaseId).toBeNull();
    return;
  }
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
    params: { studentId: 'student', sessionId: 'old-chat' },
  });
  expect(useWorkoutWizardStore.getState().aiSessionId).toBe('old-chat');
});
