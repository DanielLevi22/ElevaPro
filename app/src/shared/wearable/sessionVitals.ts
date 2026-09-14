import { distributeIntoZones, type SessionVitals } from '@elevapro/shared';
import { plausibleInteger, WORKOUT_BPM } from './plausible';
import type { TimeRange, WearableReader } from './types';

/**
 * FC média e tempo por zona da janela de uma sessão, ou `null` quando não há o
 * que gravar.
 *
 * **Nunca a série.** Os batimentos lidos morrem aqui dentro (ADR-0024): quem está
 * fora recebe um número e cinco percentuais. Nulo cobre o relógio fora do pulso, a
 * permissão negada (a plataforma devolve lista vazia) e a média fora da faixa —
 * nunca zero, que gravado seria parada cardíaca.
 *
 * @example
 * const vitals = await readSessionVitals(reader, { start, end }, profile.maxHeartRate);
 */
export async function readSessionVitals(
  reader: WearableReader,
  window: TimeRange,
  maxHeartRate: number | null
): Promise<SessionVitals | null> {
  if (window.end.getTime() <= window.start.getTime()) return null;

  try {
    const samples = await reader.heartRateSamples(window);
    if (samples.length === 0) return null;
    const sum = samples.reduce((total, bpm) => total + bpm, 0);
    const avgHeartRate = plausibleInteger(sum / samples.length, WORKOUT_BPM);
    if (avgHeartRate === null) return null;
    const zones = maxHeartRate === null ? null : distributeIntoZones(samples, maxHeartRate);
    return { avgHeartRate, zones };
  } catch {
    return null;
  }
}
