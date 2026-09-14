import {
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { ASLEEP_STAGES, type DailyAggregate, sleepRange, todayRange } from './daily';
import { healthKitReadTypes } from './permissions';
import type { ReadContext, WearablePlatform } from './platform';
import { plausibleInteger, RESTING_BPM, SLEEP_MINUTES } from './plausible';
import { minutesBetween } from './time';
import { CAPABILITIES, type Capability, type TimeRange, type WearableReader } from './types';

/** Não é um limite: `0` pede todas as amostras do intervalo ao HealthKit. */
const ALL_SAMPLES = 0;

interface DateFilter {
  filter: { date: { startDate: Date; endDate: Date } };
}

function dateFilter({ start, end }: TimeRange): DateFilter {
  return { filter: { date: { startDate: start, endDate: end } } };
}

type ProbeQuantity =
  | 'HKQuantityTypeIdentifierStepCount'
  | 'HKQuantityTypeIdentifierActiveEnergyBurned'
  | 'HKQuantityTypeIdentifierRestingHeartRate';

/**
 * Há ao menos uma amostra no intervalo? Uma basta para provar a capacidade.
 *
 * É a única prova possível no iOS: o HealthKit não conta ao app se a leitura foi
 * negada, e devolve vazio do mesmo jeito que para um relógio que não grava o tipo.
 */
async function hasAnySample(query: () => Promise<readonly unknown[]>): Promise<boolean> {
  try {
    return (await query()).length > 0;
  } catch {
    return false;
  }
}

function hasQuantity(type: ProbeQuantity, range: TimeRange): Promise<boolean> {
  return hasAnySample(() => queryQuantitySamples(type, { ...dateFilter(range), limit: 1 }));
}

async function heartRateSamples(range: TimeRange): Promise<number[]> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      ...dateFilter(range),
      limit: ALL_SAMPLES,
      unit: 'count/min',
    });
    return samples.map((sample) => sample.quantity);
  } catch {
    return [];
  }
}

/** O leitor do HealthKit para a detecção de capacidades e a média da sessão. */
export const healthKitReader: WearableReader = {
  hasDailyActivity: async (range) =>
    (await hasQuantity('HKQuantityTypeIdentifierStepCount', range)) ||
    hasQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', range),
  hasSleep: (range) =>
    hasAnySample(() =>
      queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        ...dateFilter(range),
        limit: 1,
      })
    ),
  hasRestingHeartRate: (range) => hasQuantity('HKQuantityTypeIdentifierRestingHeartRate', range),
  heartRateSamples,
};

interface Interval {
  startMs: number;
  endMs: number;
}

/**
 * Soma a união dos intervalos, e não a duração de cada amostra: o iPhone e o Apple
 * Watch escrevem os mesmos trechos, e somar tudo contaria a noite duas vezes.
 */
function unionMinutes(intervals: Interval[]): number {
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let current = sorted[0];
  for (const next of sorted.slice(1)) {
    if (next.startMs <= current.endMs) {
      current = { startMs: current.startMs, endMs: Math.max(current.endMs, next.endMs) };
      continue;
    }
    total += minutesBetween(current.startMs, current.endMs);
    current = next;
  }
  return total + minutesBetween(current.startMs, current.endMs);
}

/** Minutos dormidos na noite, ou `null` sem nenhum trecho dormido. */
async function readSleepMinutes(): Promise<number | null> {
  try {
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      ...dateFilter(sleepRange()),
      // Uma noite fragmentada rende dezenas de trechos, e o iPhone duplica os do
      // relógio. Cortar cedo demais truncaria a noite pelo fim, sem erro nenhum.
      limit: 2000,
    });
    const asleep = samples
      .filter((sample) => ASLEEP_STAGES.has(sample.value))
      .map((sample) => ({
        startMs: new Date(sample.startDate).getTime(),
        endMs: new Date(sample.endDate).getTime(),
      }));
    return asleep.length === 0 ? null : plausibleInteger(unionMinutes(asleep), SLEEP_MINUTES);
  } catch {
    return null;
  }
}

/** FC de repouso do dia. `discreteAverage` porque o HealthKit grava várias. */
async function readRestingHeartRate(): Promise<number | null> {
  try {
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierRestingHeartRate',
      ['discreteAverage'],
      dateFilter(todayRange())
    );
    const average = stats.averageQuantity?.quantity;
    return average == null ? null : plausibleInteger(average, RESTING_BPM);
  } catch {
    return null;
  }
}

interface DailyTotals {
  steps: number;
  calories: number;
  hasRecords: boolean;
}

/** `cumulativeSum` devolve o total do dia pronto, sem somar amostra na mão. */
async function readDailyTotals(): Promise<DailyTotals> {
  const filter = dateFilter(todayRange());
  const [stepsStats, caloriesStats] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], filter),
    queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      filter
    ),
  ]);
  return {
    steps: Math.round(stepsStats.sumQuantity?.quantity ?? 0),
    calories: Math.round(caloriesStats.sumQuantity?.quantity ?? 0),
    // `sumQuantity` ausente é o equivalente iOS da lista vazia do Android: não
    // houve amostra no período, o que é diferente de ter havido e somado zero.
    hasRecords: stepsStats.sumQuantity != null || caloriesStats.sumQuantity != null,
  };
}

async function readToday(): Promise<DailyAggregate> {
  const [totals, sleepMinutes, restingHeartRate] = await Promise.all([
    readDailyTotals(),
    readSleepMinutes(),
    readRestingHeartRate(),
  ]);
  return { ...totals, sleepMinutes, restingHeartRate };
}

/**
 * Um diálogo só para todos os tipos: o HealthKit abre um diálogo por autorização,
 * e um segundo pedido no meio da corrida interromperia o treino.
 */
function requestPermissions(capabilities: readonly Capability[]): Promise<boolean> {
  return requestAuthorization({ toRead: healthKitReadTypes(capabilities) });
}

/**
 * Em primeiro plano, pedir a autorização já respondida não abre diálogo de novo e
 * garante a leitura. Em background não há como mostrar diálogo, então a leitura
 * segue sem pedir, como a tarefa sempre fez.
 */
async function ensureTodayAccess(context: ReadContext): Promise<boolean> {
  if (context === 'background') return true;
  return requestPermissions(CAPABILITIES);
}

/** O HealthKit, no iPhone. */
export const healthKitPlatform: WearablePlatform = {
  name: 'healthkit',
  reader: healthKitReader,
  isAvailable: async () => true,
  requestPermissions,
  // Só o Health Connect separa a leitura em background das demais.
  requestBackgroundRead: async () => {},
  ensureTodayAccess,
  readToday,
};
