import type { MeasurementSource, PhysicalAssessment } from "../types/physicalAssessment.types";
import { bodyComposition, seriesOf } from "./bodyMeasurements";
import type { DailyActivity } from "./dailyActivity";
import { activityStreak, mealAdherence, type StreakStanding } from "./progressSummary";
import type { CompletedSet } from "./trainingProgress";

/**
 * O relatório do período (issue #312, tela 8): o que aconteceu nos últimos 90
 * dias, em números que outra tela já mostra.
 *
 * Nada de meta inventada: a única linha de meta é a aderência de 90% da #298.
 * Treino, cardio e medida vão como contagem simples, porque ninguém prescreveu
 * um alvo para eles.
 *
 * **Sem marcador de ritmo.** A regra dele — a fração do período já decorrida
 * vezes a meta — só diz alguma coisa enquanto o período corre. A janela aqui são
 * os últimos 90 dias, sempre inteiramente vividos, e o marcador cairia exatamente
 * em cima da meta, dois nomes para a mesma linha.
 */

/** A meta de aderência da #298, a única do relatório. */
export const ADHERENCE_GOAL = 90;

export interface PeriodPanel {
  /** Sessões de força concluídas: o cardio vai no número ao lado, e não nos dois. */
  workouts: number;
  /** Refeições feitas sobre planejadas; `null` sem plano no período. */
  adherence: number | null;
  goal: number;
  cardioSessions: number;
  /** Medidas registradas no período, das duas origens. */
  measurements: number;
}

/** Uma máxima do período acima de tudo que veio antes dela. */
export interface LoadRecord {
  exerciseId: string;
  name: string;
  weight: number;
  date: string;
}

/** Peso e gordura no período, sem interpretar a direção. */
export interface CompositionChange {
  source: MeasurementSource;
  weightDelta: number | null;
  fatDelta: number | null;
}

export interface PeriodReport {
  from: string;
  to: string;
  /** Nada aconteceu na janela: nem treino, nem refeição, nem medida. */
  empty: boolean;
  panel: PeriodPanel;
  records: LoadRecord[];
  streak: StreakStanding;
  composition: CompositionChange | null;
}

export interface PeriodReportInput {
  from: string;
  to: string;
  /** Hoje, para a sequência: ela conta os dias seguidos até agora, não até `to`. */
  today: string;
  days: readonly DailyActivity[];
  sets: readonly CompletedSet[];
  measurements: readonly PhysicalAssessment[];
}

/**
 * O relatório inteiro, de uma passada.
 *
 * @example
 * const report = summarizePeriod({ from: "2026-06-17", to: "2026-09-15", today, days, sets, measurements });
 * report.panel.workouts // 34
 */
export function summarizePeriod(input: PeriodReportInput): PeriodReport {
  const days = input.days.filter((day) => day.date >= input.from && day.date <= input.to);
  const inPeriod = input.measurements.filter(
    (record) => dayOf(record.assessed_at) >= input.from && dayOf(record.assessed_at) <= input.to,
  );
  const panel = {
    // Força e cardio saem da mesma lista de dias: contados por consultas
    // diferentes, a soma dos dois cartões passava do que aconteceu de verdade.
    workouts: days.reduce((total, day) => total + day.workouts - day.cardioSessions, 0),
    adherence: mealAdherence(days),
    goal: ADHERENCE_GOAL,
    cardioSessions: days.reduce((total, day) => total + day.cardioSessions, 0),
    measurements: inPeriod.length,
  };
  return {
    from: input.from,
    to: input.to,
    // Zero em tudo não é um relatório de zeros: é não ter o que relatar, e a tela
    // diz isso em vez de desenhar quatro cartões vazios.
    empty:
      panel.workouts === 0 &&
      panel.cardioSessions === 0 &&
      panel.measurements === 0 &&
      panel.adherence === null &&
      days.every((day) => day.loggedMeals === 0),
    panel,
    records: loadRecords(input.sets, input.from, input.to),
    streak: activityStreak(input.days, input.today),
    composition: compositionChange(input.measurements, input.from, input.to),
  };
}

/**
 * Os recordes de carga do período: a máxima de um exercício acima de toda
 * máxima anterior a ela. O primeiro peso registrado de um exercício não conta —
 * sem histórico não há recorde, só começo.
 *
 * @example loadRecords(sets, "2026-06-17", "2026-09-15") // [{ name: "Supino", weight: 95, … }]
 */
export function loadRecords(sets: readonly CompletedSet[], from: string, to: string): LoadRecord[] {
  const byExercise = new Map<string, CompletedSet[]>();
  for (const item of sets) {
    if (item.weight === null) continue;
    byExercise.set(item.exerciseId, [...(byExercise.get(item.exerciseId) ?? []), item]);
  }
  return [...byExercise.values()]
    .flatMap((items) => recordOf(items, from, to))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function recordOf(sets: readonly CompletedSet[], from: string, to: string): LoadRecord[] {
  const ordered = [...sets].sort((a, b) => a.date.localeCompare(b.date));
  let previousBest: number | null = null;
  let record: LoadRecord | null = null;
  for (const item of ordered) {
    const weight = item.weight as number;
    if (item.date >= from && item.date <= to && previousBest !== null && weight > previousBest) {
      record = { exerciseId: item.exerciseId, name: item.exerciseName, weight, date: item.date };
    }
    previousBest = previousBest === null ? weight : Math.max(previousBest, weight);
  }
  return record ? [record] : [];
}

/**
 * A variação de peso e gordura no período, dentro de uma origem só: a fita do
 * especialista e a medida declarada nunca entram na mesma conta (ADR-0030).
 *
 * @example compositionChange(measurements, "2026-06-17", "2026-09-15")?.weightDelta // -1.4
 */
export function compositionChange(
  measurements: readonly PhysicalAssessment[],
  from: string,
  to: string,
): CompositionChange | null {
  const inPeriod = measurements.filter(
    (record) => dayOf(record.assessed_at) >= from && dayOf(record.assessed_at) <= to,
  );
  const latest = [...inPeriod].sort((a, b) => a.assessed_at.localeCompare(b.assessed_at)).at(-1);
  if (!latest) return null;
  const series = seriesOf(inPeriod, latest.measured_by);
  if (series.length < 2) return null;
  const first = bodyComposition(series[0]);
  const last = bodyComposition(series[series.length - 1]);
  return {
    source: latest.measured_by,
    weightDelta: delta(first.weight, last.weight),
    fatDelta: delta(first.fatPercent, last.fatPercent),
  };
}

const delta = (from: number | null, to: number | null): number | null =>
  from === null || to === null ? null : Math.round((to - from) * 10) / 10;

const dayOf = (instant: string): string => instant.slice(0, 10);
