import type { PhysicalAssessment } from "../types/physicalAssessment.types";
import { bodyComposition, seriesOf } from "./bodyMeasurements";
import type { DailyActivity } from "./dailyActivity";
import { addDays, weekdayFromMonday } from "./dateOnly";
import { type LoadRecord, loadRecords } from "./periodReport";
import type { CompletedSet } from "./trainingProgress";

/**
 * O relatório da semana (#376, R1): treinos, dieta, peso, recordes, ajustes e
 * a sequência em semanas, montados dos registros, sem tabela de resumo.
 *
 * Os números são os do relatório do período (#312), na janela de uma semana:
 * recorde é `loadRecords`, treino é sessão de força concluída, dia na meta é
 * o plano do dia cumprido. Uma tela não pode dizer 2 recordes onde a outra diz 3.
 */

/** O que mudou no plano durante a semana, do mais antigo ao mais recente. */
export type WeekAdjustment =
  | {
      kind: "calories";
      before: number;
      after: number;
      reason: "weight_above_pace" | "weight_below_pace" | "undo";
      at: string;
    }
  /** "Desenvolvimento → Elevação lateral": só as trocas que mudaram o plano. */
  | { kind: "swap"; summary: string; at: string };

/**
 * - **complete**: todos os treinos prescritos;
 * - **steady**: alguma coisa a menos, mas a semana andou;
 * - **hard**: pouco treino e pouco registro — a tela R1a, sem bronca;
 * - **empty**: nada a relatar.
 */
export type WeekTone = "complete" | "steady" | "hard" | "empty";

export interface WeekDiet {
  /** Dias com o plano do dia cumprido inteiro. */
  daysOnTarget: number;
  /** Dias com ao menos uma refeição registrada. */
  daysLogged: number;
  /** Dias da semana com refeição planejada. */
  daysPlanned: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  tone: WeekTone;
  workouts: { done: number; planned: number | null };
  /** Nulo sem plano de dieta na semana. */
  diet: WeekDiet | null;
  /** A última pesagem da semana menos a última de antes dela; nula sem as duas. */
  weightChange: number | null;
  records: LoadRecord[];
  adjustments: WeekAdjustment[];
  /** Semanas seguidas, até esta, com ao menos um treino. */
  streakWeeks: number;
}

export interface WeeklyReportInput {
  weekStart: string;
  /** Os dias de várias semanas: a sequência olha para trás. */
  days: readonly DailyActivity[];
  /** As séries de antes da semana também: recorde é contra o histórico. */
  sets: readonly CompletedSet[];
  /** Treinos com dia da semana no plano ativo; nulo sem plano. */
  plannedWorkouts: number | null;
  measurements: readonly PhysicalAssessment[];
  adjustments: readonly WeekAdjustment[];
  /** Os dias do Modo Descanso: a sequência atravessa a pausa. */
  paused?: ReadonlySet<string>;
}

const WEEK_DAYS = 7;
/** Até 2 dias registrados é pouco registro, a mesma régua do check-in (A5b). */
const LOW_LOGGING_DAYS = 2;

/**
 * O instante em que o dia começa no Brasil, para cortar consultas por data: o
 * Brasil está em UTC−3 fixo desde 2019, e meia-noite de lá é 03:00 UTC.
 *
 * @example brazilDayStart("2026-10-05") // "2026-10-05T03:00:00.000Z"
 */
export function brazilDayStart(date: string): string {
  return `${date}T03:00:00.000Z`;
}

/**
 * A semana do relatório: no domingo, a que termina hoje; nos outros dias, a
 * anterior, que já fechou.
 *
 * @example reportWeekStart("2026-10-11") // "2026-10-05" (domingo: esta semana)
 * @example reportWeekStart("2026-10-13") // "2026-10-05" (terça: a semana passada)
 */
export function reportWeekStart(today: string): string {
  const monday = addDays(today, -weekdayFromMonday(today));
  return weekdayFromMonday(today) === WEEK_DAYS - 1 ? monday : addDays(monday, -WEEK_DAYS);
}

/**
 * @example
 * const report = summarizeWeek({ weekStart: "2026-10-05", days, sets, plannedWorkouts: 4, measurements, adjustments });
 * report.tone // "complete"
 */
export function summarizeWeek(input: WeeklyReportInput): WeeklyReport {
  const weekEnd = addDays(input.weekStart, WEEK_DAYS - 1);
  const week = input.days.filter((day) => day.date >= input.weekStart && day.date <= weekEnd);
  const workouts = {
    done: week.reduce((total, day) => total + day.workouts - day.cardioSessions, 0),
    planned: input.plannedWorkouts,
  };
  const diet = dietDays(week);
  const weightChange = weightChangeOf(input.measurements, input.weekStart, weekEnd);
  const records = loadRecords(input.sets, input.weekStart, weekEnd);
  const adjustments = [...input.adjustments].sort((a, b) => a.at.localeCompare(b.at));
  return {
    weekStart: input.weekStart,
    weekEnd,
    tone: toneOf(workouts, diet, weightChange, records.length + adjustments.length),
    workouts,
    diet,
    weightChange,
    records,
    adjustments,
    streakWeeks: streakWeeks(input.days, input.weekStart, input.paused),
  };
}

/**
 * Os dias na meta, registrados e planejados de uma janela: a semana do
 * relatório ou o bloco inteiro (B4).
 *
 * @example dietDays(diasDaSemana) // { daysOnTarget: 6, daysLogged: 7, daysPlanned: 7 }
 */
export function dietDays(week: readonly DailyActivity[]): WeekDiet | null {
  const planned = week.filter((day) => day.plannedMeals > 0);
  if (planned.length === 0) return null;
  return {
    daysOnTarget: planned.filter((day) => day.doneMeals >= day.plannedMeals).length,
    daysLogged: week.filter((day) => day.loggedMeals > 0).length,
    daysPlanned: planned.length,
  };
}

function toneOf(
  workouts: WeeklyReport["workouts"],
  diet: WeekDiet | null,
  weightChange: number | null,
  happenings: number,
): WeekTone {
  const logged = diet?.daysLogged ?? 0;
  if (workouts.done === 0 && logged === 0 && weightChange === null && happenings === 0) {
    return "empty";
  }
  if (workouts.planned !== null && workouts.done >= workouts.planned) return "complete";
  const fewWorkouts =
    workouts.planned === null ? workouts.done === 0 : workouts.done * 2 < workouts.planned;
  // Só as duas coisas juntas fazem a semana difícil: quem treinou pouco mas
  // seguiu a dieta teve uma semana que andou.
  return fewWorkouts && logged <= LOW_LOGGING_DAYS ? "hard" : "steady";
}

/**
 * Na mesma origem, como o relatório do período: a fita do especialista e a
 * balança de casa não entram na mesma conta (ADR-0030).
 */
function weightChangeOf(
  measurements: readonly PhysicalAssessment[],
  weekStart: string,
  weekEnd: string,
): number | null {
  const weighed = measurements.filter((record) => bodyComposition(record).weight !== null);
  const upToEnd = weighed.filter((record) => dayOf(record.assessed_at) <= weekEnd);
  const latest = [...upToEnd].sort((a, b) => a.assessed_at.localeCompare(b.assessed_at)).at(-1);
  if (!latest || dayOf(latest.assessed_at) < weekStart) return null;
  const before = seriesOf(upToEnd, latest.measured_by)
    .filter((record) => dayOf(record.assessed_at) < weekStart)
    .at(-1);
  if (!before) return null;
  const change = (bodyComposition(latest).weight ?? 0) - (bodyComposition(before).weight ?? 0);
  return Math.round(change * 10) / 10;
}

/**
 * Semanas seguidas com ao menos um treino, contando para trás desde a semana
 * dada. Em semanas, nunca em dias: um dia de folga não zera nada.
 *
 * @example streakWeeks(dias, "2026-10-05") // 3
 */
export function streakWeeks(
  days: readonly DailyActivity[],
  weekStart: string,
  paused: ReadonlySet<string> = new Set(),
): number {
  const mondayOf = (date: string) => addDays(date, -weekdayFromMonday(date));
  const trained = new Set(days.filter((day) => day.workouts > 0).map((day) => mondayOf(day.date)));
  // A semana com pausa do Modo Descanso (#376, A8) e sem treino não quebra a
  // sequência: ela atravessa, sem contar.
  const restWeeks = new Set([...paused].map(mondayOf));
  let count = 0;
  for (
    let monday = weekStart;
    trained.has(monday) || restWeeks.has(monday);
    monday = addDays(monday, -WEEK_DAYS)
  ) {
    if (trained.has(monday)) count++;
  }
  return count;
}

const dayOf = (instant: string): string => instant.slice(0, 10);
