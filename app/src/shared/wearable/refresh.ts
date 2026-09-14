import { createHealthService, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { registrarAviso } from '@/lib/registro';
import { readCapabilityReport, saveCapabilityReport } from './capabilityCache';
import { type CapabilityRefresher, createCapabilityRefresher } from './capabilityRefresher';
import { currentPlatform } from './currentPlatform';
import type { TimeRange, WearableReader } from './types';

const healthService = createHealthService(supabase);
const workoutsService = createWorkoutsService(supabase);

/** Fora de iOS e Android nada é lido: toda capacidade fica indisponível. */
const NO_READER: WearableReader = {
  hasDailyActivity: async () => false,
  hasSleep: async () => false,
  hasRestingHeartRate: async () => false,
  heartRateSamples: async () => [],
};

async function currentStudentId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

async function cardioWindowsSince(studentId: string, since: Date): Promise<TimeRange[]> {
  const windows = await workoutsService.fetchCardioWindowsSince(studentId, since.toISOString());
  return windows.map((window) => ({
    start: new Date(window.started_at),
    end: new Date(window.completed_at),
  }));
}

function refresher(): CapabilityRefresher {
  return createCapabilityRefresher({
    reader: currentPlatform()?.reader ?? NO_READER,
    currentStudentId,
    hasHealthConsent: (studentId) => healthService.hasCollectionConsent(studentId),
    cardioWindowsSince,
    readCache: readCapabilityReport,
    saveCache: saveCapabilityReport,
    now: () => new Date(),
  });
}

/** Nunca lança: quem chama é a leitura do dia e a tarefa de background. */
async function safely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    registrarAviso('wearable.detect_capabilities');
  }
}

/**
 * Refaz a detecção quando o relatório guardado passou da validade. Roda ao abrir o
 * app e na sincronização em background.
 *
 * @example
 * void refreshCapabilitiesIfStale();
 */
export function refreshCapabilitiesIfStale(): Promise<void> {
  return safely(() => refresher().refreshIfStale());
}

/**
 * Refaz a detecção agora, ignorando a validade. Chamado logo depois de o Student
 * consentir: sem isto, o relatório "desconhecido" de antes do consentimento valeria
 * por mais seis horas.
 *
 * @example
 * await refreshCapabilities();
 */
export function refreshCapabilities(): Promise<void> {
  return safely(() => refresher().refresh());
}
