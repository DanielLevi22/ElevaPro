import { CARDIO_LOOKBACK_DAYS, detectCapabilities } from './capabilities';
import type { CachedCapabilities } from './capabilityCache';
import { lastDays } from './time';
import type { CapabilityReport, TimeRange, WearableReader } from './types';

/**
 * O relatório vale por seis horas. A tela inicial, a de saúde e a de nutrição
 * pedem a leitura do dia ao abrir e ao voltar do background; sem esta janela cada
 * uma refaria a detecção.
 */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export interface RefresherDependencies {
  reader: WearableReader;
  currentStudentId(): Promise<string | null>;
  /** Pode lançar: falha de rede é tratada como ausência de consentimento. */
  hasHealthConsent(studentId: string): Promise<boolean>;
  /** Pode lançar: falha vira nenhuma sessão, e a FC do treino fica desconhecida. */
  cardioWindowsSince(studentId: string, since: Date): Promise<TimeRange[]>;
  readCache(): CachedCapabilities | null;
  saveCache(report: CapabilityReport, checkedAt: Date): void;
  now(): Date;
}

export interface CapabilityRefresher {
  /** Refaz a detecção agora, como depois de o Student consentir. */
  refresh(): Promise<void>;
  /** Refaz só quando o relatório guardado passou da validade. */
  refreshIfStale(): Promise<void>;
}

/** Fechado na dúvida: falha de rede não vira consentimento para ler dado de saúde. */
async function consentOrDeny(deps: RefresherDependencies, studentId: string): Promise<boolean> {
  try {
    return await deps.hasHealthConsent(studentId);
  } catch {
    return false;
  }
}

async function windowsOrNone(
  deps: RefresherDependencies,
  studentId: string,
  now: Date
): Promise<TimeRange[]> {
  try {
    return await deps.cardioWindowsSince(studentId, lastDays(now, CARDIO_LOOKBACK_DAYS).start);
  } catch {
    return [];
  }
}

async function refreshWith(deps: RefresherDependencies): Promise<void> {
  const studentId = await deps.currentStudentId();
  if (!studentId) return;

  const now = deps.now();
  const hasHealthConsent = await consentOrDeny(deps, studentId);
  // Sem consentimento a detecção não lê o relógio, e as janelas não teriam onde
  // servir: nem as sessões de cardio são buscadas.
  const cardioWindows = hasHealthConsent ? await windowsOrNone(deps, studentId, now) : [];
  const report = await detectCapabilities(deps.reader, { hasHealthConsent, cardioWindows, now });
  deps.saveCache(report, now);
}

function isFresh(deps: RefresherDependencies): boolean {
  const cached = deps.readCache();
  return cached !== null && deps.now().getTime() - cached.checkedAt.getTime() < STALE_AFTER_MS;
}

/**
 * Junta consentimento, sessões de cardio, detecção e cache. As dependências entram
 * por parâmetro: é assim que a trava de consentimento é testada sem mock.
 *
 * @example
 * const refresher = createCapabilityRefresher({ reader, currentStudentId, ... });
 * await refresher.refreshIfStale();
 */
export function createCapabilityRefresher(deps: RefresherDependencies): CapabilityRefresher {
  return {
    refresh: () => refreshWith(deps),
    refreshIfStale: async () => {
      if (!isFresh(deps)) await refreshWith(deps);
    },
  };
}
