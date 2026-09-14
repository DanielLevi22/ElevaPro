import { plausibleInteger, WORKOUT_BPM } from './plausible';
import type { WearableReader } from './types';

/**
 * FC média da janela de uma sessão, ou `null` quando não há o que gravar.
 *
 * **Só a média.** A série lida morre aqui dentro (ADR-0024). Nulo cobre o relógio
 * fora do pulso, a permissão negada (a plataforma devolve lista vazia) e a
 * leitura fora da faixa — nunca zero, que gravado seria parada cardíaca.
 *
 * @example
 * const bpm = await averageSessionHeartRate(reader, startedAt, finishedAt);
 */
export async function averageSessionHeartRate(
  reader: WearableReader,
  start: Date,
  end: Date
): Promise<number | null> {
  if (end.getTime() <= start.getTime()) return null;

  try {
    const samples = await reader.heartRateSamples({ start, end });
    if (samples.length === 0) return null;
    const sum = samples.reduce((total, bpm) => total + bpm, 0);
    return plausibleInteger(sum / samples.length, WORKOUT_BPM);
  } catch {
    return null;
  }
}
