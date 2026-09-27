import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { mockSupabaseBuilder } from '../../../../../jest.setup';
import { useDietPlanList } from '../useDietPlanList';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

function setup(canRead = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDietPlanList('specialist-1', canRead), { wrapper });
}

it('lista rascunhos e combina status com busca por nome de aluno ou plano', async () => {
  mockSupabaseBuilder.then.mockImplementation((resolve) =>
    resolve({
      data: [
        { id: 'active', name: 'Plano atual', status: 'active', student: { full_name: 'Ana' } },
        { id: 'draft', name: 'Fase nova', status: 'draft', student: { full_name: 'José' } },
        {
          id: 'finished',
          name: 'Fase anterior',
          status: 'finished',
          student: { full_name: 'José' },
        },
      ],
      error: null,
    })
  );
  const { result } = setup();
  await waitFor(() => expect(result.current.plans).toHaveLength(3));
  act(() => {
    result.current.setStatus('draft');
    result.current.setSearch(' jose ');
  });
  expect(result.current.visible.map((plan) => plan.id)).toEqual(['draft']);
  act(() => result.current.setSearch('anterior'));
  expect(result.current.visible).toEqual([]);
  act(() => result.current.setStatus('finished'));
  expect(result.current.visible.map((plan) => plan.id)).toEqual(['finished']);
});

it('mantém os planos numa falha de atualização e permite tentar novamente', async () => {
  mockSupabaseBuilder.then.mockImplementation((resolve) =>
    resolve({ data: [{ id: 'draft', name: 'Nova dieta', status: 'draft' }], error: null })
  );
  const { result } = setup();
  await waitFor(() => expect(result.current.plans).toHaveLength(1));
  mockSupabaseBuilder.then.mockImplementation((resolve) =>
    resolve({ data: null, error: { message: 'Offline' } })
  );
  await act(async () => {
    await result.current.refetch();
  });
  expect(result.current.visible.map((plan) => plan.id)).toEqual(['draft']);
  await waitFor(() => expect(result.current.error).toBeTruthy());
  mockSupabaseBuilder.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.plans).toEqual([]));
  expect(result.current.error).toBeNull();
});

// Art. 6°, VII: ausência de permissão não pode disparar leitura de prescrição.
it('não consulta planos quando a conta não tem permissão de leitura', () => {
  mockSupabaseBuilder.select.mockClear();
  const { result } = setup(false);
  if (mockSupabaseBuilder.select.mock.calls.length || result.current.plans) {
    throw new Error('PRESCRIÇÃO SEM PERMISSÃO: a lista acessou dietas sem autorização');
  }
});
