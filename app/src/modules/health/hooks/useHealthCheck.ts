import type { HealthDailyMetric } from '@elevapro/shared';
import { useMemo } from 'react';
import { localDateKey } from '@/services/healthSync';
import { type HealthCheckResult, healthChecklist } from '../services/healthChecklist';
import { useConsentStatus, useHealthHistory } from './useHealthHistory';
import { useWatchStatus, type WatchStatus } from './useWatchStatus';

const WEEK = 7;

/** Dias com alguma leitura gravada nos últimos 7, contando hoje. */
function daysWithReading(days: HealthDailyMetric[], today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (WEEK - 1));
  const from = localDateKey(start);
  return days.filter(
    (day) =>
      day.date >= from &&
      (day.steps > 0 || day.sleep_minutes !== null || day.resting_heart_rate !== null)
  ).length;
}

export interface HealthCheckState {
  /** `null` enquanto o aceite ou a plataforma ainda estão sendo conferidos. */
  result: HealthCheckResult | null;
  watch: WatchStatus;
  /** Confere tudo de novo: o aceite, o relógio e o histórico. */
  recheck: () => Promise<void>;
}

/**
 * O health check montado com o estado do Student: aceite, relógio e histórico.
 *
 * @example const { result, recheck } = useHealthCheck(user.id);
 */
export function useHealthCheck(studentId: string): HealthCheckState {
  const { consent, reload: reloadConsent } = useConsentStatus(studentId);
  const watch = useWatchStatus();
  const history = useHealthHistory(studentId);
  const { available, background, capabilities, platform } = watch;

  const result = useMemo(() => {
    if (!consent || available === null || background === null) return null;
    return healthChecklist({
      platform,
      consent,
      platformAvailable: available,
      capabilities,
      background,
      historyDays: daysWithReading(history.days, new Date()),
    });
  }, [consent, available, background, capabilities, platform, history.days]);

  const recheck = async () => {
    await Promise.all([watch.recheck(), reloadConsent(), history.reload()]);
  };

  return { result, watch, recheck };
}
