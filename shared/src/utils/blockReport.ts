import type { PhysicalAssessment } from "../types/physicalAssessment.types";
import { bodyComposition } from "./bodyMeasurements";
import type { DailyActivity } from "./dailyActivity";
import { addDays, daysBetween, weekdayFromMonday } from "./dateOnly";
import { loadRecords } from "./periodReport";
import type { CompletedSet } from "./trainingProgress";
import { dietDays, streakWeeks, type WeekDiet } from "./weeklyReport";
import { projectWeight } from "./weightProjection";

/**
 * O relatório do bloco (#376, B4): o prometido no primeiro dia contra o real,
 * o antes e o depois, os números do bloco e quantas vezes o plano mudou com a
 * pessoa. As contas são as do relatório da semana, na janela do bloco.
 */

/**
 * - **ahead**: o peso andou mais do que a conta linear prometia;
 * - **on_track**: dentro da faixa provável (60% a 100% da conta);
 * - **behind**: menos do que a faixa — sem bronca, a tela diz que o próximo
 *   bloco ajusta;
 * - **no_promise**: sem meta de dieta ou sem duas pesagens, não há o que comparar.
 */
export type BlockVerdict = "ahead" | "on_track" | "behind" | "no_promise";

export interface BlockReport {
  start: string;
  end: string;
  verdict: BlockVerdict;
  /** A variação prometida, da conservadora à da conta linear; nula sem promessa. */
  promisedKg: { from: number; to: number } | null;
  realKg: number | null;
  weight: { before: number; after: number } | null;
  waist: { before: number; after: number } | null;
  workouts: { done: number; planned: number | null };
  records: number;
  diet: WeekDiet | null;
  streakWeeks: number;
  /** As mudanças do plano no bloco, para "seu plano mudou N vezes com você". */
  changes: { loads: number; swaps: number; targets: number };
}

export interface BlockReportInput {
  start: string;
  end: string;
  days: readonly DailyActivity[];
  sets: readonly CompletedSet[];
  measurements: readonly PhysicalAssessment[];
  /** Treinos com dia por semana no plano do bloco; nulo sem plano. */
  plannedPerWeek: number | null;
  /** O gasto e a meta da dieta do bloco; nulos sem dieta. */
  energy: { tdee: number; targetCalories: number } | null;
  adjustments: { swaps: number; targets: number };
  /** Os dias do Modo Descanso: a sequência atravessa a pausa. */
  paused?: ReadonlySet<string>;
}

const WEEK_DAYS = 7;

/**
 * @example
 * const report = summarizeBlock({ start: "2026-09-15", end: "2026-10-13", days, sets, measurements, … });
 * report.verdict // "ahead"
 */
export function summarizeBlock(input: BlockReportInput): BlockReport {
  const weeks = Math.max(1, Math.round(daysBetween(input.start, input.end) / WEEK_DAYS));
  const inBlock = input.days.filter((day) => day.date >= input.start && day.date < input.end);
  const weight = beforeAfter(
    input.measurements,
    input.start,
    input.end,
    (m) => bodyComposition(m).weight,
  );
  const records = loadRecords(input.sets, input.start, addDays(input.end, -1)).length;
  const promise = promiseOf(weight, input.energy, weeks);
  return {
    start: input.start,
    end: input.end,
    verdict: verdictOf(promise, weight),
    promisedKg: promise,
    realKg: weight ? round(weight.after - weight.before) : null,
    weight,
    waist: beforeAfter(input.measurements, input.start, input.end, (m) => numberOf(m.circ_waist)),
    workouts: {
      done: inBlock.reduce((total, day) => total + day.workouts - day.cardioSessions, 0),
      planned: input.plannedPerWeek === null ? null : input.plannedPerWeek * weeks,
    },
    records,
    diet: dietDays(inBlock),
    streakWeeks: streakWeeks(input.days, lastMonday(addDays(input.end, -1)), input.paused),
    changes: { loads: records, ...input.adjustments },
  };
}

/**
 * A medida antes do bloco (a última até o primeiro dia) e a última dentro dele,
 * na mesma origem: a fita do especialista e a balança de casa não se comparam.
 */
function beforeAfter(
  measurements: readonly PhysicalAssessment[],
  start: string,
  end: string,
  readValue: (m: PhysicalAssessment) => number | null,
): { before: number; after: number } | null {
  const measured = [...measurements]
    .filter((m) => readValue(m) !== null && dayOf(m.assessed_at) <= end)
    .sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
  const latest = measured.at(-1);
  if (!latest || dayOf(latest.assessed_at) < start) return null;
  const sameSource = measured.filter((m) => m.measured_by === latest.measured_by);
  const baseline = sameSource.filter((m) => dayOf(m.assessed_at) <= start).at(-1) ?? sameSource[0];
  if (!baseline || baseline === latest) return null;
  return { before: readValue(baseline) as number, after: readValue(latest) as number };
}

function promiseOf(
  weight: { before: number } | null,
  energy: BlockReportInput["energy"],
  weeks: number,
): { from: number; to: number } | null {
  if (!weight || !energy) return null;
  const projection = projectWeight({ weightKg: weight.before, ...energy, weeks });
  if (!projection) return null;
  const changes = [projection.likelyEndKg.from, projection.likelyEndKg.to].map((end) =>
    round(end - weight.before),
  );
  // Da mudança menor (a conservadora) à maior (a da conta linear), com o sinal.
  const [from, to] = changes.sort((a, b) => Math.abs(a) - Math.abs(b));
  return { from, to };
}

function verdictOf(
  promise: { from: number; to: number } | null,
  weight: { before: number; after: number } | null,
): BlockVerdict {
  if (!promise || !weight) return "no_promise";
  const real = weight.after - weight.before;
  const direction = Math.sign(promise.to);
  const progress = real * direction;
  if (progress > Math.abs(promise.to)) return "ahead";
  if (progress >= Math.abs(promise.from)) return "on_track";
  return "behind";
}

const lastMonday = (date: string) => addDays(date, -weekdayFromMonday(date));
const dayOf = (instant: string) => instant.slice(0, 10);
const round = (value: number) => Math.round(value * 10) / 10;
const numberOf = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};
