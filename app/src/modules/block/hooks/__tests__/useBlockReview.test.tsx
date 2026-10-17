import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useReviewStore } from '../../store/reviewStore';
import {
  useDeclareMeasure,
  useLatestDeclaredMeasure,
  useNextBlockActions,
} from '../useBlockReview';

const mockList = jest.fn();
const mockDeclare = jest.fn();
const mockRequest = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createMeasurementService: () => ({
    listMeasurements: (id: string) => mockList(id),
    declareMeasurement: (id: string, input: unknown) => mockDeclare(id, input),
  }),
}));
jest.mock('../../services/nextBlockService', () => ({
  requestNextBlock: (input: unknown) => mockRequest(input),
  approveNextBlock: jest.fn(),
}));

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useLatestDeclaredMeasure', () => {
  // A reavaliação parte do que a pessoa mediu: a avaliação do especialista é
  // outra fonte, e a série de uma não se mistura com a da outra.
  it('a medida mais recente da própria pessoa, não a do especialista', async () => {
    mockList.mockResolvedValue([
      { id: 'velha', measured_by: 'self', assessed_at: '2026-09-01T10:00:00Z' },
      { id: 'do-especialista', measured_by: 'specialist', assessed_at: '2026-10-10T10:00:00Z' },
      { id: 'nova', measured_by: 'self', assessed_at: '2026-10-01T10:00:00Z' },
    ]);
    const { result } = renderHook(() => useLatestDeclaredMeasure('aluno'), { wrapper: wrap });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.id).toBe('nova');
  });
});

describe('useDeclareMeasure', () => {
  it('grava a medida declarada com o instante de agora', async () => {
    mockDeclare.mockResolvedValue({});
    const { result } = renderHook(() => useDeclareMeasure('aluno'), { wrapper: wrap });

    await act(() => result.current.mutateAsync({ weight_kg: 78, circ_waist: 84, height_cm: 178 }));

    expect(mockDeclare).toHaveBeenCalledWith(
      'aluno',
      expect.objectContaining({ weight_kg: 78, assessed_at: expect.any(String) })
    );
  });
});

describe('useNextBlockActions', () => {
  // ADR-0020: a proposta espera "Aprovar"; montar não grava nada.
  it('montar guarda a proposta para a tela de aprovar', async () => {
    useReviewStore.getState().reset();
    mockRequest.mockResolvedValue({ blockNumber: 3 });
    const { result } = renderHook(() => useNextBlockActions(), { wrapper: wrap });

    await act(() => result.current.build.mutateAsync({ changes: {}, early: false }));

    expect(useReviewStore.getState().pending).toEqual({ blockNumber: 3 });
  });
});
