/**
 * A prontidão do dia (ADR-0029): o sono e a FC de repouso de hoje contra a linha
 * de base do próprio Student, numa nota de 0 a 100.
 *
 * Mora no `shared` pelo mesmo motivo das zonas de FC: o mobile calcula e grava, e
 * o web, que mostra ao especialista, lê a mesma régua. A regra é versionada — nota
 * de outra versão não se compara com esta.
 */

/** A versão da regra abaixo. Mudar a conta é subir este número (ADR-0029). */
export const READINESS_VERSION = 1;

/** Sono e FC de repouso de um dia; `null` é ausência de leitura. */
export interface ReadinessReading {
  sleepMinutes: number | null;
  restingHeartRate: number | null;
}

export type ReadinessBand = "good" | "moderate" | "low";
export type SleepTrend = "above" | "steady" | "below";
export type HeartRateTrend = "lower" | "steady" | "higher";

export interface Readiness {
  score: number;
  band: ReadinessBand;
  version: number;
  sleepTrend: SleepTrend;
  heartRateTrend: HeartRateTrend;
}

/** Um dia igual à média. */
const NEUTRAL_SCORE = 70;
/** O peso máximo de cada medida, para cima ou para baixo. */
const COMPONENT_POINTS = 15;
/** Até onde a diferença conta: além disso é viagem, doença ou sensor escorregando. */
const SLEEP_LIMIT = 0.2;
const HEART_RATE_LIMIT = 0.08;
/** Diferenças menores que estas são "estável" na frase. */
const SLEEP_STEADY = 0.05;
const HEART_RATE_STEADY = 0.03;
const BASELINE_DAYS = 14;
/** Média de dois dias tem cara de medição e não é uma. */
const MIN_BASELINE_DAYS = 3;
const GOOD_FROM = 75;
const MODERATE_FROM = 55;

function average(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length < MIN_BASELINE_DAYS) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

function bandOf(score: number): ReadinessBand {
  if (score >= GOOD_FROM) return "good";
  if (score >= MODERATE_FROM) return "moderate";
  return "low";
}

function trendOf<T extends string>(
  delta: number,
  steady: number,
  [up, down]: [T, T],
): T | "steady" {
  if (Math.abs(delta) < steady) return "steady";
  return delta > 0 ? up : down;
}

/**
 * A prontidão de hoje, ou `null` quando não há como calculá-la sem inventar: falta
 * a leitura de hoje, ou a base tem menos de 3 dias de cada medida.
 *
 * `baseline` são os dias anteriores, do mais recente para o mais antigo, **sem
 * hoje**: comparar com uma média que contém o dia achata o desvio que interessa.
 *
 * @example computeReadiness({ sleepMinutes: 470, restingHeartRate: 58 }, lastFourteenDays)
 */
export function computeReadiness(
  today: ReadinessReading,
  baseline: ReadinessReading[],
): Readiness | null {
  const { sleepMinutes, restingHeartRate } = today;
  if (sleepMinutes === null || restingHeartRate === null) return null;

  const recent = baseline.slice(0, BASELINE_DAYS);
  const sleepAverage = average(recent.map((day) => day.sleepMinutes));
  const heartRateAverage = average(recent.map((day) => day.restingHeartRate));
  if (sleepAverage === null || heartRateAverage === null || sleepAverage <= 0) return null;

  const sleepDelta = (sleepMinutes - sleepAverage) / sleepAverage;
  // Invertida: FC de repouso abaixo da média é a direção boa.
  const heartRateDelta = (heartRateAverage - restingHeartRate) / heartRateAverage;
  const sleepPoints = (clamp(sleepDelta, SLEEP_LIMIT) / SLEEP_LIMIT) * COMPONENT_POINTS;
  const heartRatePoints =
    (clamp(heartRateDelta, HEART_RATE_LIMIT) / HEART_RATE_LIMIT) * COMPONENT_POINTS;
  const score = Math.max(
    0,
    Math.min(100, Math.round(NEUTRAL_SCORE + sleepPoints + heartRatePoints)),
  );

  return {
    score,
    band: bandOf(score),
    version: READINESS_VERSION,
    sleepTrend: trendOf(sleepDelta, SLEEP_STEADY, ["above", "below"]),
    // A frase fala da FC em si ("acima dela"), e não do efeito na nota.
    heartRateTrend: trendOf(-heartRateDelta, HEART_RATE_STEADY, ["higher", "lower"]),
  };
}

const SLEEP_PHRASE: Record<SleepTrend, string> = {
  above: "Sono acima da sua média",
  steady: "Sono na sua média",
  below: "Sono abaixo da sua média",
};

const HEART_RATE_PHRASE: Record<HeartRateTrend, string> = {
  lower: "FC de repouso abaixo dela",
  steady: "FC de repouso estável",
  higher: "FC de repouso acima dela",
};

/**
 * A frase sob a nota. Descreve a comparação e nunca o que ela significa para a
 * saúde: é o que separa acompanhamento de treino de parecer clínico.
 *
 * @example describeReadiness(readiness) // "Sono acima da sua média e FC de repouso estável."
 */
export function describeReadiness(readiness: Readiness): string {
  return `${SLEEP_PHRASE[readiness.sleepTrend]} e ${HEART_RATE_PHRASE[readiness.heartRateTrend]}.`;
}
