import type { CachedCapabilities } from '../capabilityCache';
import {
  createCapabilityRefresher,
  type RefresherDependencies,
  STALE_AFTER_MS,
} from '../capabilityRefresher';
import type { CapabilityReport, TimeRange } from '../types';

const NOW = new Date('2026-09-14T12:00:00.000Z');

interface Recorded {
  readerCalls: number;
  windowQueries: Date[];
  saved: CapabilityReport[];
}

function dependencies(overrides: Partial<RefresherDependencies> = {}) {
  const recorded: Recorded = { readerCalls: 0, windowQueries: [], saved: [] };
  const count = async () => {
    recorded.readerCalls += 1;
    return true;
  };
  const deps: RefresherDependencies = {
    reader: {
      hasDailyActivity: count,
      hasSleep: count,
      hasRestingHeartRate: count,
      heartRateSamples: async () => {
        recorded.readerCalls += 1;
        return [];
      },
    },
    currentStudentId: async () => 'aluno-1',
    hasHealthConsent: async () => true,
    cardioWindowsSince: async (_studentId, since) => {
      recorded.windowQueries.push(since);
      return [] as TimeRange[];
    },
    readCache: () => null,
    saveCache: (report) => recorded.saved.push(report),
    now: () => NOW,
    ...overrides,
  };
  return { deps, recorded };
}

describe('createCapabilityRefresher', () => {
  // LGPD, Art. 11, I. Uma queda de rede na hora de conferir o consentimento não pode
  // virar autorização para ler dado de saúde do relógio. Na dúvida, o app trata o
  // Student como sem consentimento: não lê o relógio e não busca as sessões.
  it('falha ao conferir o consentimento não vira leitura do relógio', async () => {
    const { deps, recorded } = dependencies({
      hasHealthConsent: async () => {
        throw new Error('network down');
      },
    });

    await createCapabilityRefresher(deps).refresh();

    if (recorded.readerCalls > 0 || recorded.windowQueries.length > 0) {
      throw new Error(
        `LEITURA SEM CONSENTIMENTO CONFIRMADO: ${recorded.readerCalls} leituras do relógio e ${recorded.windowQueries.length} buscas de sessão`
      );
    }
    expect(recorded.saved).toEqual([
      { dailyActivity: 'unknown', sleepAndRestingHr: 'unknown', workoutHeartRate: 'unknown' },
    ]);
  });

  it('sem consentimento, nem as sessões de cardio são buscadas', async () => {
    const { deps, recorded } = dependencies({ hasHealthConsent: async () => false });

    await createCapabilityRefresher(deps).refresh();

    expect(recorded.windowQueries).toEqual([]);
  });

  it('com consentimento, busca as sessões dos últimos 30 dias e guarda o relatório', async () => {
    const { deps, recorded } = dependencies();

    await createCapabilityRefresher(deps).refresh();

    expect(recorded.windowQueries).toEqual([new Date('2026-08-15T12:00:00.000Z')]);
    expect(recorded.saved).toHaveLength(1);
  });

  it('sem Student na sessão, não detecta nem guarda nada', async () => {
    const { deps, recorded } = dependencies({ currentStudentId: async () => null });

    await createCapabilityRefresher(deps).refresh();

    expect(recorded.readerCalls).toBe(0);
    expect(recorded.saved).toEqual([]);
  });

  it('relatório dentro da validade não é refeito', async () => {
    const fresh: CachedCapabilities = {
      report: {
        dailyActivity: 'available',
        sleepAndRestingHr: 'unknown',
        workoutHeartRate: 'unknown',
      },
      checkedAt: new Date(NOW.getTime() - STALE_AFTER_MS + 1),
    };
    const { deps, recorded } = dependencies({ readCache: () => fresh });

    await createCapabilityRefresher(deps).refreshIfStale();

    expect(recorded.saved).toEqual([]);
  });

  it('relatório vencido é refeito', async () => {
    const stale: CachedCapabilities = {
      report: {
        dailyActivity: 'unknown',
        sleepAndRestingHr: 'unknown',
        workoutHeartRate: 'unknown',
      },
      checkedAt: new Date(NOW.getTime() - STALE_AFTER_MS),
    };
    const { deps, recorded } = dependencies({ readCache: () => stale });

    await createCapabilityRefresher(deps).refreshIfStale();

    expect(recorded.saved).toHaveLength(1);
  });
});
