/**
 * Zonas de frequência cardíaca da sessão de cardio (issue #304, ADR-0026).
 *
 * Moram no `shared` para o mobile, que calcula no fim da corrida, e o web, que um
 * dia mostra as zonas ao especialista, dividirem a mesma régua.
 */

/** Percentual do tempo da sessão em cada zona. Soma 100. */
export interface ZoneShare {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

/** A FC média de uma sessão e, quando há FC máxima, o tempo em cada zona. */
export interface SessionVitals {
  avgHeartRate: number;
  zones: ZoneShare | null;
}

/**
 * Faixa fisiológica em esforço. 30 bpm é abaixo do atleta de endurance mais
 * bradicárdico; 230 é acima da FC máxima de qualquer adulto. É a faixa do CHECK
 * da `0049`, e vale para cada amostra: fora dela é o sensor escorregando no pulso.
 */
const MIN_WORKOUT_BPM = 30;
const MAX_WORKOUT_BPM = 230;

/**
 * Limite inferior das zonas 2 a 5, em fração da FC máxima. A Z1 recebe tudo o
 * que fica abaixo de 60%, inclusive abaixo de 50%, e a Z5 tudo acima de 90%: sem
 * isso, a caminhada leve e o tiro acima da máxima estimada sumiriam da soma.
 */
const ZONE_FLOORS = [0.6, 0.7, 0.8, 0.9] as const;

/** Faixa de idade em que a fórmula de 220 − idade ainda é usada. */
const MIN_AGE = 10;
const MAX_AGE = 100;

function fullYearsBetween(from: Date, to: Date): number {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const anniversaryPassed =
    to.getUTCMonth() > from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() >= from.getUTCDate());
  return anniversaryPassed ? years : years - 1;
}

/**
 * FC máxima estimada por 220 − idade, com a idade que o aluno declarou na anamnese
 * somada dos anos completos desde a declaração. É a fórmula que os relógios usam
 * por padrão, então as zonas do app batem com as do pulso.
 *
 * @example
 * estimateMaxHeartRate(30, new Date("2023-09-10"), new Date("2026-09-14")); // 187
 */
export function estimateMaxHeartRate(
  declaredAge: number,
  declaredAt: Date,
  today: Date,
): number | null {
  if (!Number.isFinite(declaredAge)) return null;
  const age = declaredAge + Math.max(0, fullYearsBetween(declaredAt, today));
  if (age < MIN_AGE || age > MAX_AGE) return null;
  return Math.round(220 - age);
}

function zoneIndex(bpm: number, maxHeartRate: number): number {
  const fraction = bpm / maxHeartRate;
  return ZONE_FLOORS.filter((floor) => fraction >= floor).length;
}

/**
 * Percentuais inteiros que somam 100: arredonda para baixo e entrega o que falta
 * às zonas que mais perderam no arredondamento.
 */
function wholePercentages(counts: number[], total: number): number[] {
  const exact = counts.map((count) => (count * 100) / total);
  const floored = exact.map(Math.floor);
  const missing = 100 - floored.reduce((sum, pct) => sum + pct, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder.slice(0, missing)) floored[index] += 1;
  return floored;
}

/**
 * Percentual das amostras de batimento em cada zona, pela FC máxima.
 *
 * Conta amostras, e não segundos: supõe que o relógio grava em intervalo regular
 * durante o treino, e então a proporção das amostras é a proporção do tempo. A
 * suposição é conferida pelo roteiro de teste em aparelho de
 * `docs/research/relogios-chineses-health-connect.md`; com amostragem irregular,
 * o peso de cada amostra precisaria vir do intervalo até a seguinte.
 *
 * @example
 * distributeIntoZones([100, 130, 150, 170, 190], 200); // 20% em cada zona
 */
export function distributeIntoZones(
  bpm: readonly number[],
  maxHeartRate: number,
): ZoneShare | null {
  if (bpm.length === 0 || !(maxHeartRate > 0)) return null;

  const counts = [0, 0, 0, 0, 0];
  for (const value of bpm) counts[zoneIndex(value, maxHeartRate)] += 1;
  const percentages = wholePercentages(counts, bpm.length);

  return {
    zone1: percentages[0],
    zone2: percentages[1],
    zone3: percentages[2],
    zone4: percentages[3],
    zone5: percentages[4],
  };
}

/**
 * A média e as zonas da série de batimentos de uma sessão, ou `null` quando não
 * há amostra plausível. Média e zonas saem das mesmas amostras filtradas: um zero
 * de sensor solto não pode pesar nas zonas depois de ter sido tirado da média.
 *
 * @example
 * summarizeHeartRate(samples, profile.maxHeartRate); // { avgHeartRate: 152, zones: {...} }
 */
export function summarizeHeartRate(
  samples: readonly number[],
  maxHeartRate: number | null,
): SessionVitals | null {
  const plausible = samples.filter(
    (bpm) => Number.isFinite(bpm) && bpm >= MIN_WORKOUT_BPM && bpm <= MAX_WORKOUT_BPM,
  );
  if (plausible.length === 0) return null;

  const average = plausible.reduce((total, bpm) => total + bpm, 0) / plausible.length;
  const zones = maxHeartRate === null ? null : distributeIntoZones(plausible, maxHeartRate);
  return { avgHeartRate: Math.round(average), zones };
}
