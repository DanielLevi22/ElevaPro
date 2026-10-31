import { nomeCurto } from '@elevapro/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useProfileOverview } from '../useProfileOverview';

const mockGetProfile = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createAuthService: () => ({ getProfile: (id: string) => mockGetProfile(id) }),
  createGamificationService: () => ({
    getAchievements: () => Promise.resolve([{ id: 'a1' }, { id: 'a2' }]),
    getStreak: () => Promise.resolve({ current_streak: 5, longest_streak: 12 }),
  }),
  createProgressService: () => ({
    listActivityHistory: () =>
      Promise.resolve({
        sessions: [
          { date: '2026-10-01', cardio: false },
          { date: '2026-10-02', cardio: true },
          { date: '2026-10-03', cardio: false },
        ],
        meals: [],
      }),
    getPeriodContext: () =>
      Promise.resolve({ periodization: 'Bloco 2 · Força', specialist: 'Carla Mendes Silva' }),
  }),
}));
const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useProfileOverview', () => {
  it('para o aluno: treinos de força feitos, conquistas, sequência, plano e especialista', async () => {
    mockGetProfile.mockResolvedValue({ full_name: 'Ana Souza', account_type: 'member' });
    const { result } = await renderHook(() => useProfileOverview('u1'), { wrapper: wrap });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toEqual({
      fullName: 'Ana Souza',
      accountType: 'member',
      student: {
        workoutsDone: 2,
        achievements: 2,
        currentStreakDays: 5,
        longestStreakDays: 12,
        planName: 'Bloco 2 · Força',
        specialistName: nomeCurto('Carla Mendes Silva'),
      },
    });
  });

  it('o especialista não tem números de aluno', async () => {
    mockGetProfile.mockResolvedValue({ full_name: 'Carla', account_type: 'specialist' });
    const { result } = await renderHook(() => useProfileOverview('u1'), { wrapper: wrap });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.student).toBeNull();
  });
});
