import { lastDays, minutesBetween } from './time';
import type { CapabilityReport, CapabilityStatus, TimeRange, WearableReader } from './types';

export interface DetectionInput {
  /** Consentimento de saúde vigente do Student. */
  hasHealthConsent: boolean;
  /** Começo e fim das sessões de cardio concluídas no próprio app. */
  cardioWindows: TimeRange[];
  now: Date;
}

const UNKNOWN_REPORT: CapabilityReport = {
  dailyActivity: 'unknown',
  sleepAndRestingHr: 'unknown',
  workoutHeartRate: 'unknown',
};

/**
 * Sete dias cobrem o relógio que ficou na gaveta num fim de semana, sem que um
 * relógio trocado há um mês continue contando como fonte.
 */
export const RECENT_DAYS = 7;

/** O relógio trocado há um mês não pode continuar respondendo pelo de hoje. */
export const CARDIO_LOOKBACK_DAYS = 30;

/**
 * Um batimento por minuto separa o relógio que mede o treino do que mede a cada
 * dez minutos em repouso. Ponto de partida, a calibrar no teste em aparelho da
 * pesquisa de relógios chineses (`docs/research/relogios-chineses-health-connect.md`).
 */
const MIN_BEATS_PER_MINUTE = 1;

function statusOf(available: boolean): CapabilityStatus {
  return available ? 'available' : 'unavailable';
}

async function hasDenseHeartRate(reader: WearableReader, window: TimeRange): Promise<boolean> {
  const minutes = minutesBetween(window.start.getTime(), window.end.getTime());
  if (minutes <= 0) return false;
  const samples = await reader.heartRateSamples(window);
  return samples.length / minutes >= MIN_BEATS_PER_MINUTE;
}

/**
 * Basta **uma** corrida recente com batimento denso. Outra corrida sem FC não
 * desmente o relógio: é o dia em que ele ficou em casa, ou em que acabou a
 * bateria.
 */
async function workoutHeartRate(
  reader: WearableReader,
  input: DetectionInput
): Promise<CapabilityStatus> {
  const since = lastDays(input.now, CARDIO_LOOKBACK_DAYS).start;
  const recentRuns = input.cardioWindows.filter((window) => window.end >= since);
  if (recentRuns.length === 0) return 'unknown';

  const dense = await Promise.all(recentRuns.map((window) => hasDenseHeartRate(reader, window)));
  return statusOf(dense.some(Boolean));
}

async function sleepAndRestingHr(
  reader: WearableReader,
  range: TimeRange
): Promise<CapabilityStatus> {
  const [sleep, restingHeartRate] = await Promise.all([
    reader.hasSleep(range),
    reader.hasRestingHeartRate(range),
  ]);
  return statusOf(sleep && restingHeartRate);
}

/**
 * O que o relógio do Student entrega, julgado pelo dado que chega, e não pela
 * permissão concedida: o HealthKit não conta ao app que a leitura foi negada, e
 * o Health Connect concede tipo que o relógio nunca grava.
 *
 * @example
 * const report = await detectCapabilities(reader, { hasHealthConsent: true, cardioWindows, now: new Date() });
 */
export async function detectCapabilities(
  reader: WearableReader,
  input: DetectionInput
): Promise<CapabilityReport> {
  if (!input.hasHealthConsent) return UNKNOWN_REPORT;

  const recent = lastDays(input.now, RECENT_DAYS);
  const [dailyActivity, sleepAndRestingHrStatus, workoutHeartRateStatus] = await Promise.all([
    reader.hasDailyActivity(recent).then(statusOf),
    sleepAndRestingHr(reader, recent),
    workoutHeartRate(reader, input),
  ]);

  return {
    dailyActivity,
    sleepAndRestingHr: sleepAndRestingHrStatus,
    workoutHeartRate: workoutHeartRateStatus,
  };
}
