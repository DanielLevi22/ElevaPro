import {
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import {
  ASLEEP_STAGES,
  type DailyAggregate,
  RESTING_BPM,
  SLEEP_MINUTES,
  sleepRange,
  todayRange,
} from './daily';
import { healthKitReadTypes } from './permissions';
import { plausibleInteger } from './plausible';
import type { Capability, TimeRange, WearableReader } from './types';

/** Não é um limite: `0` pede todas as amostras do intervalo ao HealthKit. */
const ALL_SAMPLES = 0;

function dateFilter({ start, end }: TimeRange) {
  return { filter: { date: { startDate: start, endDate: end } } };
}

function isoToRange({ startTime, endTime }: { startTime: string; endTime: string }): TimeRange {
  return { start: new Date(startTime), end: new Date(endTime) };
}

type QuantityType =
  | 'HKQuantityTypeIdentifierStepCount'
  | 'HKQuantityTypeIdentifierActiveEnergyBurned'
  | 'HKQuantityTypeIdentifierRestingHeartRate'
  | 'HKQuantityTypeIdentifierHeartRate';

/**
 * Há ao menos uma amostra no intervalo? Uma basta para provar a capacidade.
 *
 * É a única prova possível no iOS: o HealthKit não conta ao app se a leitura foi
 * negada, e devolve vazio do mesmo jeito que devolveria para um relógio que não
 * grava o tipo.
 */
async function hasAnyQuantity(type: QuantityType, range: TimeRange): Promise<boolean> {
  try {
    const samples = await queryQuantitySamples(type, { ...dateFilter(range), limit: 1 });
    return samples.length > 0;
  } catch {
    return false;
  }
}

async function hasSleep(range: TimeRange): Promise<boolean> {
  try {
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      ...dateFilter(range),
      limit: 1,
    });
    return samples.length > 0;
  } catch {
    return false;
  }
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
    (await hasAnyQuantity('HKQuantityTypeIdentifierStepCount', range)) ||
    hasAnyQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', range),
  hasSleep,
  hasRestingHeartRate: (range) => hasAnyQuantity('HKQuantityTypeIdentifierRestingHeartRate', range),
  heartRateSamples,
};

interface Interval {
  start: number;
  end: number;
}

/**
 * Soma a união dos intervalos, e não a duração de cada amostra: o iPhone e o Apple
 * Watch escrevem os mesmos trechos, e somar tudo contaria a noite duas vezes.
 */
function unionMinutes(intervals: Interval[]): number {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let current = sorted[0];
  for (const next of sorted.slice(1)) {
    if (next.start <= current.end) {
      current = { start: current.start, end: Math.max(current.end, next.end) };
      continue;
    }
    total += current.end - current.start;
    current = next;
  }
  return (total + current.end - current.start) / 60000;
}

/** Minutos dormidos na noite, ou `null` sem nenhum trecho dormido. */
async function readSleepMinutes(): Promise<number | null> {
  try {
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      ...dateFilter(isoToRange(sleepRange())),
      // Uma noite fragmentada rende dezenas de trechos, e o iPhone duplica os do
      // relógio. Cortar cedo demais truncaria a noite pelo fim, sem erro nenhum.
      limit: 2000,
    });
    const asleep = samples
      .filter((sample) => ASLEEP_STAGES.has(sample.value))
      .map((sample) => ({
        start: new Date(sample.startDate).getTime(),
        end: new Date(sample.endDate).getTime(),
      }));
    if (asleep.length === 0) return null;
    return plausibleInteger(unionMinutes(asleep), SLEEP_MINUTES.min, SLEEP_MINUTES.max);
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
      dateFilter(isoToRange(todayRange()))
    );
    const average = stats.averageQuantity?.quantity;
    return average == null ? null : plausibleInteger(average, RESTING_BPM.min, RESTING_BPM.max);
  } catch {
    return null;
  }
}

/**
 * O agregado de hoje no HealthKit. `cumulativeSum` devolve o total pronto.
 *
 * @example
 * const today = await readHealthKitToday();
 */
export async function readHealthKitToday(): Promise<DailyAggregate> {
  const filter = dateFilter(isoToRange(todayRange()));
  const [stepsStats, caloriesStats, sleepMinutes, restingHeartRate] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], filter),
    queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      filter
    ),
    readSleepMinutes(),
    readRestingHeartRate(),
  ]);

  // `sumQuantity` ausente é o equivalente iOS da lista vazia do Android: não houve
  // amostra no período. Distinto de ter havido e somado zero.
  const noSample = stepsStats.sumQuantity == null && caloriesStats.sumQuantity == null;
  return {
    steps: Math.round(stepsStats.sumQuantity?.quantity ?? 0),
    calories: Math.round(caloriesStats.sumQuantity?.quantity ?? 0),
    sleepMinutes,
    restingHeartRate,
    hasRecords: !noSample,
  };
}

/**
 * Pede a leitura dos tipos das capacidades num diálogo só: o HealthKit abre um
 * diálogo por autorização, e um segundo pedido no meio da corrida interromperia o
 * treino.
 *
 * @example
 * const answered = await requestHealthKitPermissions(ALL_CAPABILITIES);
 */
export async function requestHealthKitPermissions(capabilities: Capability[]): Promise<boolean> {
  return requestAuthorization({ toRead: healthKitReadTypes(capabilities) });
}
