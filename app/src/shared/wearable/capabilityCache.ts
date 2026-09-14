import { createMMKV } from 'react-native-mmkv';
import type { Capability, CapabilityReport, CapabilityStatus } from './types';

const storage = createMMKV({ id: 'wearable-capabilities' });
const KEY = 'report';

const CAPABILITIES: Capability[] = ['dailyActivity', 'sleepAndRestingHr', 'workoutHeartRate'];
const STATUSES = new Set<unknown>(['available', 'unavailable', 'unknown']);

export interface CachedCapabilities {
  report: CapabilityReport;
  checkedAt: Date;
}

function statusOrUnknown(value: unknown): CapabilityStatus {
  return STATUSES.has(value) ? (value as CapabilityStatus) : 'unknown';
}

/**
 * Só o nome de cada capacidade e o estado dela, reconstruídos campo a campo: um
 * objeto espalhado levaria junto qualquer medida que viesse pendurada nele.
 */
function onlyStatuses(source: Partial<Record<Capability, unknown>>): CapabilityReport {
  return Object.fromEntries(
    CAPABILITIES.map((capability) => [capability, statusOrUnknown(source[capability])])
  ) as CapabilityReport;
}

/**
 * Guarda no aparelho o que o relógio entrega, para a tela liberar ou bloquear sem
 * ler a plataforma de saúde de novo. Nunca vai ao servidor (§2.3).
 *
 * @example
 * saveCapabilityReport(await detectCapabilities(reader, input), new Date());
 */
export function saveCapabilityReport(report: CapabilityReport, checkedAt: Date): void {
  storage.set(
    KEY,
    JSON.stringify({ report: onlyStatuses(report), checkedAt: checkedAt.toISOString() })
  );
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
    const parsed: { report?: Partial<Record<Capability, unknown>>; checkedAt?: string } =
      JSON.parse(raw);
    return {
      report: onlyStatuses(parsed.report ?? {}),
      checkedAt: new Date(parsed.checkedAt ?? 0),
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
