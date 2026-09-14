import { createMMKV } from 'react-native-mmkv';
import { type CapabilityReport, type CapabilityStatus, isCapabilityStatus } from './types';

const storage = createMMKV({ id: 'wearable-capabilities' });
const KEY = 'report';

export interface CachedCapabilities {
  report: CapabilityReport;
  checkedAt: Date;
}

interface StoredReport {
  report?: Record<string, unknown>;
  checkedAt?: string;
}

function statusOrUnknown(value: unknown): CapabilityStatus {
  return isCapabilityStatus(value) ? value : 'unknown';
}

/**
 * Só o estado de cada capacidade, campo a campo: um objeto espalhado levaria
 * junto qualquer medida que viesse pendurada nele.
 */
function onlyStatuses(source: Record<string, unknown>): CapabilityReport {
  return {
    dailyActivity: statusOrUnknown(source.dailyActivity),
    sleepAndRestingHr: statusOrUnknown(source.sleepAndRestingHr),
    workoutHeartRate: statusOrUnknown(source.workoutHeartRate),
  };
}

/**
 * Guarda no aparelho o que o relógio entrega, para a tela liberar ou bloquear sem
 * ler a plataforma de saúde de novo. Nunca vai ao servidor (§2.3).
 *
 * @example
 * saveCapabilityReport(await detectCapabilities(reader, input), new Date());
 */
export function saveCapabilityReport(report: CapabilityReport, checkedAt: Date): void {
  const stored: StoredReport = { report: onlyStatuses(report), checkedAt: checkedAt.toISOString() };
  storage.set(KEY, JSON.stringify(stored));
}

/**
 * O último relatório verificado, ou `null` se nunca houve verificação.
 *
 * @example
 * const cached = readCapabilityReport();
 */
export function readCapabilityReport(): CachedCapabilities | null {
  const raw = storage.getString(KEY);
  if (!raw) return null;
  try {
    const stored: StoredReport = JSON.parse(raw);
    return {
      report: onlyStatuses(stored.report ?? {}),
      checkedAt: new Date(stored.checkedAt ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Apaga o relatório. Chamado no logout: o próximo Student do aparelho pode usar
 * outro relógio, e o relatório de um não pode liberar tela para o outro.
 *
 * @example
 * clearCapabilityReport();
 */
export function clearCapabilityReport(): void {
  storage.remove(KEY);
}
