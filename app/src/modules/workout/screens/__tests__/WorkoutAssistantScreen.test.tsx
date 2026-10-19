import { defineAbilitiesFor } from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import WorkoutAssistantScreen from '../WorkoutAssistantScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ studentId: 'student', sessionId: 'old-chat' }),
}));
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  mockReplace.mockClear();
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
});

it('a periodização aprovada abre na tela dela, como as criadas à mão', async () => {
  await render(<WorkoutAssistantScreen />);
  await screen.findByText('Treino A');
  await fireEvent.press(screen.getByText('Abrir plano de treino'));

  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith(ROUTES.WORKOUTS.PERIODIZATION('period'))
  );
});
