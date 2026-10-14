import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useActiveBlock } from '../useActiveBlock';
import { useRestActions, useRestPeriods } from '../useRestPeriods';

const mockActiveBlock = jest.fn();
const mockRecent = jest.fn();
const mockStart = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createBlockService: () => ({ activeBlock: (id: string) => mockActiveBlock(id) }),
  createRestService: () => ({
    recent: (id: string) => mockRecent(id),
    start: (until: string | null) => mockStart(until),
    end: jest.fn(),
  }),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useActiveBlock', () => {
  it('o bloco do próprio Praticante', async () => {
    mockActiveBlock.mockResolvedValue({ id: 'bloco-2' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useActiveBlock('aluno'), { wrapper });
    await waitFor(() => expect(mockActiveBlock).toHaveBeenCalledWith('aluno'));
    await waitFor(() => expect(result.current).toEqual({ id: 'bloco-2' }));
  });

  it('sem pessoa, não busca e não há bloco', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useActiveBlock(null), { wrapper });
    expect(result.current).toBeNull();
    expect(mockActiveBlock).not.toHaveBeenCalled();
  });
});

describe('useRestPeriods', () => {
  it('as pausas da pessoa, e lista vazia enquanto carrega', async () => {
    mockRecent.mockResolvedValue([{ id: 'r1' }]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useRestPeriods('aluno'), { wrapper });
    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual([{ id: 'r1' }]));
  });

  // Pausar muda a sequência, o check-in e o cartão do início de uma vez.
  it('pausar recarrega tudo o que lê o plano', async () => {
    mockStart.mockResolvedValue({ id: 'r2' });
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRestActions(), { wrapper });

    await act(() => result.current.start.mutateAsync('2026-10-21'));

    expect(mockStart).toHaveBeenCalledWith('2026-10-21');
    expect(invalidate).toHaveBeenCalledWith();
  });
});
