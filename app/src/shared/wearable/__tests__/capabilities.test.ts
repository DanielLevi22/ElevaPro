import { detectCapabilities } from '../capabilities';
import type { TimeRange, WearableReader } from '../types';

const NOW = new Date('2026-09-14T12:00:00.000Z');

interface FakeWatch {
  dailyActivity?: boolean;
  sleep?: boolean;
  restingHeartRate?: boolean;
  /** Batimentos que o relógio gravou, com o instante de cada um. */
  heartRate?: Date[];
}

/** Leitor falso que registra cada leitura, para afirmar também a ausência dela. */
function fakeReader(watch: FakeWatch = {}) {
  const reads: string[] = [];
  const reader: WearableReader = {
    hasDailyActivity: async () => {
      reads.push('dailyActivity');
      return watch.dailyActivity ?? false;
    },
    hasSleep: async () => {
      reads.push('sleep');
      return watch.sleep ?? false;
    },
    hasRestingHeartRate: async () => {
      reads.push('restingHeartRate');
      return watch.restingHeartRate ?? false;
    },
    heartRateSamples: async ({ start, end }: TimeRange) => {
      reads.push('heartRate');
      return (watch.heartRate ?? [])
        .filter((instant) => instant >= start && instant <= end)
        .map(() => 120);
    },
  };
  return { reader, reads };
}

const withConsent = { hasHealthConsent: true, cardioWindows: [], now: NOW };

describe('detectCapabilities — atividade e sono', () => {
  it('passos ou calorias na última semana tornam a atividade diária disponível', async () => {
    const ranges: TimeRange[] = [];
    const { reader } = fakeReader({ dailyActivity: true });
    reader.hasDailyActivity = async (range) => {
      ranges.push(range);
      return true;
    };

    const report = await detectCapabilities(reader, withConsent);

    expect(report.dailyActivity).toBe('available');
    expect(ranges).toEqual([{ start: new Date('2026-09-07T12:00:00.000Z'), end: NOW }]);
  });

  it('sem passos nem calorias, a atividade diária é indisponível, não desconhecida', async () => {
    const report = await detectCapabilities(fakeReader().reader, withConsent);
    expect(report.dailyActivity).toBe('unavailable');
  });

  it('sono e FC de repouso também são procurados só na última semana', async () => {
    const ranges: TimeRange[] = [];
    const { reader } = fakeReader();
    reader.hasSleep = async (range) => {
      ranges.push(range);
      return true;
    };
    reader.hasRestingHeartRate = async (range) => {
      ranges.push(range);
      return true;
    };

    await detectCapabilities(reader, withConsent);

    const lastWeek = { start: new Date('2026-09-07T12:00:00.000Z'), end: NOW };
    expect(ranges).toEqual([lastWeek, lastWeek]);
  });

  it('sono sem FC de repouso não basta: a recuperação precisa dos dois', async () => {
    const onlySleep = await detectCapabilities(fakeReader({ sleep: true }).reader, withConsent);
    const both = await detectCapabilities(
      fakeReader({ sleep: true, restingHeartRate: true }).reader,
      withConsent
    );

    expect(onlySleep.sleepAndRestingHr).toBe('unavailable');
    expect(both.sleepAndRestingHr).toBe('available');
  });
});

/** Um batimento por intervalo, a partir de `start`. */
function beats(start: string, count: number, everySeconds: number): Date[] {
  const first = new Date(start).getTime();
  return Array.from({ length: count }, (_, i) => new Date(first + i * everySeconds * 1000));
}

const RUN = {
  start: new Date('2026-09-10T10:00:00.000Z'),
  end: new Date('2026-09-10T10:30:00.000Z'),
};

describe('detectCapabilities — FC durante o treino', () => {
  it('sem sessão de cardio no app, é desconhecida e o relógio não é lido', async () => {
    const { reader, reads } = fakeReader({ heartRate: beats('2026-09-10T10:00:00.000Z', 60, 30) });

    const report = await detectCapabilities(reader, withConsent);

    expect(report.workoutHeartRate).toBe('unknown');
    expect(reads).not.toContain('heartRate');
  });

  it('um batimento por minuto ou mais dentro da corrida a torna disponível', async () => {
    // 30 minutos, um batimento a cada 60 s: exatamente o mínimo.
    const { reader } = fakeReader({ heartRate: beats('2026-09-10T10:00:00.000Z', 30, 60) });

    const report = await detectCapabilities(reader, { ...withConsent, cardioWindows: [RUN] });

    expect(report.workoutHeartRate).toBe('available');
  });

  it('batimento esparso na corrida é indisponível: é o relógio medindo de hora em hora', async () => {
    // Uma leitura a cada 10 minutos é o padrão de repouso, não de treino.
    const { reader } = fakeReader({ heartRate: beats('2026-09-10T10:00:00.000Z', 3, 600) });

    const report = await detectCapabilities(reader, { ...withConsent, cardioWindows: [RUN] });

    expect(report.workoutHeartRate).toBe('unavailable');
  });

  it('basta uma corrida com batimento denso entre várias', async () => {
    const earlier = {
      start: new Date('2026-09-01T10:00:00.000Z'),
      end: new Date('2026-09-01T10:30:00.000Z'),
    };
    const { reader } = fakeReader({ heartRate: beats('2026-09-10T10:00:00.000Z', 40, 45) });

    const report = await detectCapabilities(reader, {
      ...withConsent,
      cardioWindows: [earlier, RUN],
    });

    expect(report.workoutHeartRate).toBe('available');
  });

  it('corrida de mais de 30 dias não conta: o relógio pode ter sido trocado', async () => {
    const old = {
      start: new Date('2026-08-10T10:00:00.000Z'),
      end: new Date('2026-08-10T10:30:00.000Z'),
    };
    const { reader, reads } = fakeReader({
      heartRate: beats('2026-08-10T10:00:00.000Z', 60, 30),
    });

    const report = await detectCapabilities(reader, { ...withConsent, cardioWindows: [old] });

    expect(report.workoutHeartRate).toBe('unknown');
    expect(reads).not.toContain('heartRate');
  });
});

describe('detectCapabilities — consentimento', () => {
  // LGPD, Art. 11, I. Ler o relógio só para descobrir o que ele entrega ainda é
  // tratamento de dado de saúde. Sem consentimento vigente o app não sabe, e não
  // procura saber: toda capacidade fica desconhecida sem nenhuma leitura.
  it('sem consentimento de saúde vigente, não lê o relógio', async () => {
    const { reader, reads } = fakeReader({ dailyActivity: true, sleep: true });

    const report = await detectCapabilities(reader, {
      hasHealthConsent: false,
      cardioWindows: [],
      now: NOW,
    });

    if (reads.length > 0) {
      throw new Error(`LEITURA SEM CONSENTIMENTO: o relógio foi lido para ${reads.join(', ')}`);
    }
    expect(report).toEqual({
      dailyActivity: 'unknown',
      sleepAndRestingHr: 'unknown',
      workoutHeartRate: 'unknown',
    });
  });
});
