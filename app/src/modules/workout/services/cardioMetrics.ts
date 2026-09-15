import { doisDigitos, formatarDecimal } from '@elevapro/shared';

/**
 * As contas e os números da sessão de cardio como o kit os escreve: "7,4 km",
 * "5:38 /km", "6 h 10". Só derivação para a tela — nada daqui é gravado além do
 * que `registroDaSessao` já grava.
 */

/** O que a sessão mediu até agora, já derivado: o que a tela mostra e o que é gravado. */
export interface CardioReading {
  /** Tempo em movimento, sem as pausas. */
  elapsedMs: number;
  calories: number;
  distanceMeters: number;
  paceSecondsPerKm: number | null;
  cadenceSpm: number | null;
  laps: number;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const METERS_PER_KM = 1000;

/**
 * Gasto estimado em kcal: MET × peso × horas.
 *
 * @example estimateCalories(6, 74, 30 * 60_000) // 222
 */
export function estimateCalories(met: number, weightKg: number, elapsedMs: number): number {
  return Math.round(met * weightKg * (elapsedMs / MS_PER_HOUR));
}

/**
 * Velocidade média em km/h, ou `null` antes de um minuto ou sem distância.
 *
 * @example speedKmh(7400, 18.6 * 60_000) // ≈ 23,9
 */
export function speedKmh(distanceMeters: number, elapsedMs: number): number | null {
  if (distanceMeters <= 0 || elapsedMs < MS_PER_MINUTE) return null;
  return distanceMeters / METERS_PER_KM / (elapsedMs / MS_PER_HOUR);
}

/**
 * Quilômetros com vírgula e as casas pedidas.
 *
 * @example formatKilometers(5420, 2) // "5,42"
 */
export function formatKilometers(meters: number, decimals: 1 | 2 = 1): string {
  const km = meters / METERS_PER_KM;
  if (decimals === 1) return formatarDecimal(km);
  return km.toFixed(decimals).replace('.', ',');
}

/**
 * Ritmo como relógio: minutos e segundos por km.
 *
 * @example formatPace(338) // "5:38"
 */
export function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / SECONDS_PER_MINUTE)}:${doisDigitos(total % SECONDS_PER_MINUTE)}`;
}

/**
 * Duração do histórico: "28 min" abaixo de uma hora, "6 h 10" a partir dela.
 *
 * @example formatShortDuration(22_200) // "6 h 10"
 */
export function formatShortDuration(seconds: number): string {
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${doisDigitos(minutes % MINUTES_PER_HOUR)}`;
}

/**
 * O MET sempre com uma casa, como o kit escreve: "6,0".
 *
 * @example formatMet(6) // "6,0"
 */
export function formatMet(met: number): string {
  return met.toFixed(1).replace('.', ',');
}

/** Raio de incerteza, em metros, até onde o sinal conta como forte e como médio. */
const STRONG_GPS_M = 10;
const FAIR_GPS_M = 30;

/**
 * O chip de GPS do percurso, pela precisão do último fix. Acima de 30 m o
 * `medirPercurso` já descarta o ponto, então o sinal é fraco de fato.
 *
 * @example gpsSignal(true, 6) // "GPS forte"
 */
export function gpsSignal(hasLocation: boolean, lastAccuracy: number | null | undefined): string {
  if (!hasLocation) return 'Sem GPS';
  if (lastAccuracy === null || lastAccuracy === undefined) return 'Buscando GPS';
  if (lastAccuracy <= STRONG_GPS_M) return 'GPS forte';
  if (lastAccuracy <= FAIR_GPS_M) return 'GPS médio';
  return 'GPS fraco';
}
