import { type SessionVitals, summarizeHeartRate } from '@elevapro/shared';
import type { TimeRange, WearableReader } from './types';

/**
 * FC média e tempo por zona da janela de uma sessão, ou `null` quando não há o
 * que gravar.
 *
 * **Nunca a série.** Os batimentos lidos morrem aqui dentro (ADR-0024): quem está
 * fora recebe um número e cinco percentuais. Nulo cobre o relógio fora do pulso, a
 * permissão negada (a plataforma devolve lista vazia) e nenhuma amostra plausível
 * — nunca zero, que gravado seria parada cardíaca.
 *
 * @example
 * const vitals = await vitalsFromReader(reader, { start, end }, profile.maxHeartRate);
 */
export async function vitalsFromReader(
  reader: WearableReader,
  window: TimeRange,
  maxHeartRate: number | null
): Promise<SessionVitals | null> {
  if (window.end.getTime() <= window.start.getTime()) return null;
  try {
    return summarizeHeartRate(await reader.heartRateSamples(window), maxHeartRate);
  } catch {
    return null;
  }
}
