import { supabase } from '@elevapro/supabase';
import { localDateKey, syncDailyMetrics } from '@/services/healthSync';

const mockHasConsent = jest.fn();
const mockUpsertDaily = jest.fn();

// healthSync instancia o service no load do módulo — antes dos const acima
// existirem. As setas adiam a referência para o momento da chamada.
jest.mock('@elevapro/shared', () => ({
  createHealthService: () => ({
    hasCollectionConsent: (studentId: string) => mockHasConsent(studentId),
    upsertDaily: (studentId: string, metric: unknown) => mockUpsertDaily(studentId, metric),
  }),
}));

jest.mock('@elevapro/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;

const METRIC = { date: '2026-08-02', steps: 8321, active_calories: 412 };
const SESSION = { data: { session: { user: { id: 'user-1' } } } };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockHasConsent.mockResolvedValue(true);
  mockUpsertDaily.mockResolvedValue(undefined);
});

describe('localDateKey', () => {
  // toISOString() converte para UTC e, em fuso negativo, joga o registro para
  // o dia anterior perto da meia-noite — bagunçaria a chave (student_id, date).
  it('usa a data local, não UTC', () => {
    expect(localDateKey(new Date(2026, 7, 2, 23, 30))).toBe('2026-08-02');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('syncDailyMetrics', () => {
  it('persiste quando há sessão e consentimento', async () => {
    await expect(syncDailyMetrics(METRIC)).resolves.toBe('saved');
    expect(mockUpsertDaily).toHaveBeenCalledWith('user-1', METRIC);
  });

  // Gate de LGPD: a permissão do SO autoriza ler, o consentimento autoriza gravar.
  it('não grava nada sem consentimento registrado', async () => {
    mockHasConsent.mockResolvedValue(false);

    await expect(syncDailyMetrics(METRIC)).resolves.toBe('no-consent');
    expect(mockUpsertDaily).not.toHaveBeenCalled();
  });

  it('não grava nada sem sessão ativa', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(syncDailyMetrics(METRIC)).resolves.toBe('no-session');
    expect(mockUpsertDaily).not.toHaveBeenCalled();
  });

  // Chamada tanto pela UI quanto pelo TaskManager — nenhum dos dois trata exceção.
  it('não propaga erro quando a escrita falha', async () => {
    mockUpsertDaily.mockRejectedValue(new Error('network down'));

    await expect(syncDailyMetrics(METRIC)).resolves.toBe('failed');
  });
});
