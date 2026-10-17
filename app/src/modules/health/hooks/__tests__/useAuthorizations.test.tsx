import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useAuthorizations } from '../useAuthorizations';

const mockRevoke = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({
    getConsentStatus: () =>
      Promise.resolve({ state: 'granted', givenAt: null, policyVersion: null }),
    revokeCollectionConsent: (id: string, purpose: unknown) => mockRevoke(id, purpose),
  }),
}));
jest.mock('@/shared/notices', () => ({
  refreshDailyNotices: (id: string) => mockRefresh(id),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useAuthorizations', () => {
  // #344: revogado o consentimento de saúde, o que depende dele para de avisar
  // na hora, e não na próxima vez que o app abrir.
  it('retirar o consentimento reagenda os avisos e o widget na hora', async () => {
    mockRevoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthorizations('aluno'), { wrapper });

    await act(() => result.current.revoke({ type: 'health_data_collection', version: '1.10' }));

    expect(mockRevoke).toHaveBeenCalled();
    if (!mockRefresh.mock.calls.some(([id]) => id === 'aluno')) {
      throw new Error('AVISO SEM CONSENTIMENTO: a revogação não reagendou os avisos');
    }
  });
});
