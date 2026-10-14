import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useJourney, useWeightTrend } from '@/modules/progress/hooks/useJourney';
import { useExerciseHistory } from '@/modules/workout/hooks/useExerciseHistory';
import { useLearnedWorkoutTime } from '../useLearnedWorkoutTime';
import { useTodayChecklist } from '../useTodayChecklist';

const mockFetchState = jest.fn();
const mockJourney = jest.fn();
const mockTrend = jest.fn();
const mockHistory = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createDailyNoticesService: () => ({
    fetchNoticeState: (id: string, now: Date) => mockFetchState(id, now),
  }),
  createJourneyService: () => ({
    fetchJourney: (id: string, today: string) => mockJourney(id, today),
    fetchWeightTrend: (id: string, period: string, today: string) => mockTrend(id, period, today),
  }),
  createWorkoutsService: () => ({
    fetchExerciseHistory: (workout: string, student: string) => mockHistory(workout, student),
  }),
}));
jest.mock('@/services/healthSync', () => ({ localDateKey: () => '2026-10-14' }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const STATE = {
  today: '2026-10-14',
  nowMinutes: 13 * 60,
  meals: [{ id: 'almoco', name: 'Almoço', time: '12:00', dayOfWeek: null }],
  loggedMealIds: [],
  workouts: [],
  trainedToday: false,
  workoutStarts: [1080, 1100, 1120],
  rests: [],
  lastWorkoutDate: null,
  workoutsThisWeek: 0,
};

beforeEach(() => jest.clearAllMocks());

describe('useLearnedWorkoutTime (F2)', () => {
  it('os inícios e a mediana deles', async () => {
    mockFetchState.mockResolvedValue(STATE);
    const { result } = renderHook(() => useLearnedWorkoutTime('aluno'), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual({ starts: [1080, 1100, 1120], usual: 1100 })
    );
  });
});

describe('useTodayChecklist (E4)', () => {
  it('o que falta hoje, com as escolhas da pessoa aplicadas', async () => {
    mockFetchState.mockResolvedValue(STATE);
    const { result } = renderHook(() => useTodayChecklist('aluno'), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual([
        { kind: 'meal', id: 'almoco', name: 'Almoço', time: '12:00', done: false },
      ])
    );
  });

  it('sem pessoa, não busca', () => {
    renderHook(() => useTodayChecklist(null), { wrapper });
    expect(mockFetchState).not.toHaveBeenCalled();
  });
});

describe('useJourney / useWeightTrend (D1, A10)', () => {
  it('pedem pelo dia de hoje no aparelho, e a tendência pela janela escolhida', async () => {
    mockJourney.mockResolvedValue({ since: null });
    mockTrend.mockResolvedValue({ weights: [] });
    renderHook(() => useJourney('aluno'), { wrapper });
    renderHook(() => useWeightTrend('aluno', '4w'), { wrapper });

    await waitFor(() => expect(mockJourney).toHaveBeenCalledWith('aluno', '2026-10-14'));
    await waitFor(() => expect(mockTrend).toHaveBeenCalledWith('aluno', '4w', '2026-10-14'));
  });
});

describe('useExerciseHistory (A1)', () => {
  // No treino prescrito a carga é do especialista: o histórico nem é lido.
  it('fora do treino do próprio Praticante, não lê o histórico', () => {
    const { result } = renderHook(() => useExerciseHistory('treino', 'aluno', false), { wrapper });
    expect(result.current).toEqual({});
    expect(mockHistory).not.toHaveBeenCalled();
  });

  it('no treino do Praticante, lê a carga e o esforço das últimas sessões', async () => {
    mockHistory.mockResolvedValue({ e1: [{ weight: 40 }] });
    const { result } = renderHook(() => useExerciseHistory('treino', 'aluno', true), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ e1: [{ weight: 40 }] }));
  });
});
