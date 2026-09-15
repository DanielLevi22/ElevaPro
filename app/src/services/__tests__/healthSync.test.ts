import { supabase } from '@elevapro/supabase';
import { localDateKey, syncDailyMetrics } from '@/services/healthSync';

const mockHasConsent = jest.fn();
const mockUpsertDaily = jest.fn();
const mockGetRange = jest.fn();

// healthSync instancia o service no load do módulo — antes dos const acima
// existirem. As setas adiam a referência para o momento da chamada.
jest.mock('@elevapro/shared', () => ({
  // A regra de verdade: o teste confere a nota que o aluno veria, e não um dublê dela.
  computeReadiness: jest.requireActual('@elevapro/shared').computeReadiness,
  createHealthService: () => ({
    hasCollectionConsent: (studentId: string) => mockHasConsent(studentId),
    upsertDaily: (studentId: string, metric: unknown) => mockUpsertDaily(studentId, metric),
    getRange: (studentId: string, start: string, end: string) =>
      mockGetRange(studentId, start, end),
  }),
}));

jest.mock('@elevapro/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;

const METRIC = { date: '2026-08-02', steps: 8321, active_calories: 412 };
const SESSION = { data: { session: { user: { id: 'user-1' } } } };

/** Três dias anteriores iguais: 420 min de sono e FC de repouso de 60. */
const BASELINE_ROWS = [1, 2, 3].map((day) => ({
  date: `2026-08-0${day}`,
  sleep_minutes: 420,
  resting_heart_rate: 60,
}));
const WITH_SLEEP = {
  date: '2026-08-04',
  steps: 8321,
  active_calories: 412,
  sleep_minutes: 420,
  resting_heart_rate: 60,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockHasConsent.mockResolvedValue(true);
  mockUpsertDaily.mockResolvedValue(undefined);
  mockGetRange.mockResolvedValue(BASELINE_ROWS);
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

  it('grava a prontidão do dia com a versão da regra, contra os 14 dias anteriores', async () => {
    await expect(syncDailyMetrics(WITH_SLEEP)).resolves.toBe('saved');

    expect(mockGetRange).toHaveBeenCalledWith('user-1', '2026-07-21', '2026-08-03');
    expect(mockUpsertDaily).toHaveBeenCalledWith('user-1', {
      ...WITH_SLEEP,
      readiness: { score: 70, version: 1 },
    });
  });

  // Nota apagada na base curta, e não mantida: a de ontem não vale para hoje.
  it('com base curta, grava a prontidão do dia como nula', async () => {
    mockGetRange.mockResolvedValue(BASELINE_ROWS.slice(0, 2));

    await syncDailyMetrics(WITH_SLEEP);

    expect(mockUpsertDaily).toHaveBeenCalledWith('user-1', { ...WITH_SLEEP, readiness: null });
  });

  // Sem sono ou FC nesta leitura, a nota calculada numa leitura anterior do mesmo
  // dia fica: omitir preserva, como sono e FC já preservam no `upsertDaily`.
  it('sem sono e FC nesta leitura, não mexe na prontidão gravada', async () => {
    await syncDailyMetrics(METRIC);

    expect(mockGetRange).not.toHaveBeenCalled();
    expect(mockUpsertDaily).toHaveBeenCalledWith('user-1', METRIC);
  });

  it('a falha ao ler a base não derruba o dia: grava sem mexer na prontidão', async () => {
    mockGetRange.mockRejectedValue(new Error('network down'));

    await expect(syncDailyMetrics(WITH_SLEEP)).resolves.toBe('saved');
    expect(mockUpsertDaily).toHaveBeenCalledWith('user-1', WITH_SLEEP);
  });

  // LGPD, Art. 11, I. A nota é dado de saúde derivado e gravado (ADR-0029): sem
  // consentimento ela não é gravada, e a base de 14 dias nem é consultada para
  // calculá-la — ler o histórico de saúde para produzir uma inferência que ninguém
  // autorizou ainda é tratamento.
  it('sem consentimento, a prontidão não é calculada nem gravada', async () => {
    mockHasConsent.mockResolvedValue(false);

    await syncDailyMetrics(WITH_SLEEP);

    if (mockGetRange.mock.calls.length > 0 || mockUpsertDaily.mock.calls.length > 0) {
      throw new Error('PRONTIDÃO SEM CONSENTIMENTO: a base foi lida ou o dia foi gravado');
    }
  });

  // LGPD, Art. 6°, VII. O log de falha não carrega a nota: é inferência sobre a
  // recuperação do aluno, e observabilidade não tem finalidade para ela.
  it('a falha ao gravar não leva a prontidão ao log', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUpsertDaily.mockRejectedValue(new Error('readiness_score 70'));

    await syncDailyMetrics(WITH_SLEEP);

    const logged = error.mock.calls.flat().join(' ');
    error.mockRestore();
    if (/readiness|70/.test(logged)) {
      throw new Error(`PRONTIDÃO NO LOG: ${logged}`);
    }
  });
});
