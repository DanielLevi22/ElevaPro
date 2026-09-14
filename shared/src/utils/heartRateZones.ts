import { lerRespostaTexto } from "./anamnese";

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
 * Conta amostras, e não segundos: os relógios gravam em intervalos regulares
 * durante o treino, e a proporção das amostras é a proporção do tempo.
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

/** Negativas comuns, sem acento e em minúsculas. */
const NEGATIVE_ANSWER = /^(nao|nenhum|nenhuma|nada|n\/a|-+)(\b|$)/;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * A resposta "Usa algum medicamento contínuo?" declara medicação?
 *
 * Existe para o aviso de que medicação pode alterar a FC, e só isso: o texto não
 * sai daqui, e o chamador recebe um booleano (`LGPD_COMPLIANCE.md` §2.3).
 *
 * @example
 * declaresContinuousMedication("Não uso"); // false
 * declaresContinuousMedication("Atenolol 25mg"); // true
 */
export function declaresContinuousMedication(answer: unknown): boolean {
  const text = lerRespostaTexto(answer, "medications");
  if (!text) return false;
  return !NEGATIVE_ANSWER.test(normalize(text));
}
