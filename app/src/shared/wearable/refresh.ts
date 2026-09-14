import { createHealthService, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Platform } from 'react-native';
import { registrarAviso } from '@/lib/registro';
import { CARDIO_LOOKBACK_DAYS, detectCapabilities } from './capabilities';
import { readCapabilityReport, saveCapabilityReport } from './capabilityCache';
import { healthConnectReader } from './healthConnect';
import { healthKitReader } from './healthKit';
import type { TimeRange, WearableReader } from './types';

const healthService = createHealthService(supabase);
const workoutsService = createWorkoutsService(supabase);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * O relatório vale por seis horas. A tela inicial, a de saúde e a de nutrição
 * pedem a leitura do dia ao abrir; sem esta janela cada uma refaria a detecção.
 */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** O leitor da plataforma do aparelho, decidido na chamada: o teste troca a plataforma. */
export function platformReader(): WearableReader {
  return Platform.OS === 'ios' ? healthKitReader : healthConnectReader;
}

/** Fechado na dúvida: falha de rede não vira consentimento para ler dado de saúde. */
async function hasHealthConsent(studentId: string): Promise<boolean> {
  try {
    return await healthService.hasCollectionConsent(studentId);
  } catch {
    return false;
  }
}

async function cardioWindows(studentId: string, now: Date): Promise<TimeRange[]> {
  try {
    const since = new Date(now.getTime() - CARDIO_LOOKBACK_DAYS * DAY_MS).toISOString();
    const windows = await workoutsService.fetchCardioWindowsSince(studentId, since);
    return windows.map((w) => ({ start: new Date(w.started_at), end: new Date(w.completed_at) }));
  } catch {
    registrarAviso('relogio.janelas_de_cardio');
    return [];
  }
}

function isFresh(now: Date): boolean {
  const cached = readCapabilityReport();
  return cached !== null && now.getTime() - cached.checkedAt.getTime() < STALE_AFTER_MS;
}

async function currentStudentId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

/**
 * Refaz a detecção do que o relógio entrega quando o relatório guardado passou de
 * seis horas. Roda ao abrir o app e na sincronização em background.
 *
 * Só procura as sessões de cardio com consentimento: sem ele a detecção não lê o
 * relógio, e as janelas não teriam onde servir. Nunca lança — quem chama é a
 * leitura do dia, e ela não pode cair por causa disto.
 *
 * @example
 * void refreshCapabilitiesIfStale();
 */
export async function refreshCapabilitiesIfStale(now: Date = new Date()): Promise<void> {
  try {
    if (isFresh(now)) return;
    const studentId = await currentStudentId();
    if (!studentId) return;

    const consent = await hasHealthConsent(studentId);
    const windows = consent ? await cardioWindows(studentId, now) : [];
    const report = await detectCapabilities(platformReader(), {
      hasHealthConsent: consent,
      cardioWindows: windows,
      now,
    });
    saveCapabilityReport(report, now);
  } catch {
    registrarAviso('relogio.detectar_capacidades');
  }
}
