import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useLeaderboard } from '../useLeaderboard';

const mockFetchLeaderboard = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createGamificationService: () => ({
    fetchLeaderboard: (...args: unknown[]) => mockFetchLeaderboard(...args),
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  // `gcTime` infinito: o coletor agenda um timer por consulta, e o Jest não sai.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockFetchLeaderboard.mockReset().mockResolvedValue([]);
});

describe('useLeaderboard', () => {
  // Regressão da revisão da #320: `refetch` passa por cima de `enabled`, e puxar
  // a tela sem o aceite pedia ao banco o placar global que ele recusa.
  it('puxar para atualizar sem o aceite não pede o placar', () => {
    const { result } = renderHook(() => useLeaderboard('global', false), { wrapper });

    act(() => result.current.refresh());

    expect(mockFetchLeaderboard).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('com o aceite, busca o escopo e atualiza de novo ao puxar', async () => {
    const { result } = renderHook(() => useLeaderboard('global', true), { wrapper });
    await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenCalledWith('global'));

    act(() => result.current.refresh());

    await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenCalledTimes(2));
  });
});
