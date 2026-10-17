import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useNoticePreferencesStore } from '@/shared/notices';
import { useCheckInActions, useCheckInSummary, useDailyLogReminder } from '../useWeeklyCheckIn';
import { useWeeklyReport, useWeekNote } from '../useWeeklyReport';

const mockSummary = jest.fn();
const mockSubmit = jest.fn();
const mockReport = jest.fn();
const mockNote = jest.fn();
const mockSchedule = jest.fn();
let mockCanReadNote = false;

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createWeeklyCheckInService: () => ({
    summary: (id: string) => mockSummary(id),
    submit: (input: unknown) => mockSubmit(input),
  }),
  createMeasurementService: () => ({}),
  createWeeklyReportService: () => ({
    fetchWeeklyReport: (id: string, today: string) => mockReport(id, today),
  }),
  createSpecialistNoteService: () => ({
    latestNoteInPeriod: (...args: unknown[]) => mockNote(...args),
  }),
}));
jest.mock('@/services/notificationService', () => ({
  requestNotificationPermissions: () => mockSchedule(),
}));
jest.mock('@/services/healthSync', () => ({ localDateKey: () => '2026-10-13' }));
jest.mock('@/auth', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ abilities: { can: () => mockCanReadNote } }),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useCheckInSummary / useCheckInActions', () => {
  it('enviar o check-in relê o estado da semana: é ele que muda o cartão do início', async () => {
    mockSummary.mockResolvedValue({ state: 'due' });
    mockSubmit.mockResolvedValue({ id: 'c1' });
    const { wrapper } = setup();
    const summary = renderHook(() => useCheckInSummary('aluno'), { wrapper });
    await waitFor(() => expect(summary.result.current.data).toEqual({ state: 'due' }));

    const actions = renderHook(() => useCheckInActions(), { wrapper });
    await act(() =>
      actions.result.current.submit.mutateAsync({
        logging: 'all',
        weightKg: 77,
        weightOrigin: 'manual',
      })
    );

    await waitFor(() => expect(mockSummary).toHaveBeenCalledTimes(2));
  });

  it('sem pessoa, não busca', () => {
    const { wrapper } = setup();
    renderHook(() => useCheckInSummary(null), { wrapper });
    expect(mockSummary).not.toHaveBeenCalled();
  });
});

describe('useDailyLogReminder (A5b)', () => {
  it('ligar pede a permissão e liga a preferência: quem agenda é o agendador', async () => {
    useNoticePreferencesStore.getState().update({ dailyLog: false });
    mockSchedule.mockResolvedValue(true);
    const { wrapper } = setup();
    const { result } = renderHook(() => useDailyLogReminder(), { wrapper });

    await act(() => result.current.toggle.mutateAsync());

    expect(mockSchedule).toHaveBeenCalled();
    expect(useNoticePreferencesStore.getState().dailyLog).toBe(true);
  });

  it('sem a permissão do aparelho, não liga', async () => {
    useNoticePreferencesStore.getState().update({ dailyLog: false });
    mockSchedule.mockResolvedValue(false);
    const { wrapper } = setup();
    const { result } = renderHook(() => useDailyLogReminder(), { wrapper });

    await act(() => result.current.toggle.mutateAsync());

    expect(useNoticePreferencesStore.getState().dailyLog).toBe(false);
  });
});

describe('useWeeklyReport / useWeekNote', () => {
  it('pede o relatório pelo dia de hoje no aparelho', async () => {
    mockReport.mockResolvedValue({ weekStart: '2026-10-05', weekEnd: '2026-10-11' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useWeeklyReport('aluno'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(mockReport).toHaveBeenCalledWith('aluno', '2026-10-13');
    expect(result.current.today).toBe('2026-10-13');
  });

  // CASL: o Praticante não tem especialista para escrever nota; a busca nem sai.
  it('sem permissão de ler nota, a nota não é buscada', () => {
    mockCanReadNote = false;
    const { wrapper } = setup();
    renderHook(
      () => useWeekNote('aluno', { weekStart: '2026-10-05', weekEnd: '2026-10-11' } as never),
      { wrapper }
    );
    expect(mockNote).not.toHaveBeenCalled();
  });

  it('o Aluno lê a última nota da semana', async () => {
    mockCanReadNote = true;
    mockNote.mockResolvedValue({ body: 'Boa semana!' });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWeekNote('aluno', { weekStart: '2026-10-05', weekEnd: '2026-10-11' } as never),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toEqual({ body: 'Boa semana!' }));
  });
});
