import { addDays, withinDays } from "./dateOnly";
import { weeklyValues } from "./periodTrend";
import { volumeDasSeries } from "./sessao";

/**
 * A evolução do treino em números (issue #312): carga por semana, volume por
 * grupo muscular, estímulo e a evolução de cada exercício, num período.
 *
 * Tudo parte da série feita, achatada: o serviço lê as sessões uma vez, e cada
 * cartão da tela é uma conta sobre a mesma lista.
 */

/** Uma série concluída, com o dia local em que a sessão terminou. */
export interface CompletedSet {
  date: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  reps: number | null;
  weight: number | null;
}

export interface WeeklyLoad {
  weekStart: string;
  kilograms: number;
}

export interface TrainingLoadSummary {
  /** Carga × repetições do período, em quilos. */
  total: number;
  /** Variação contra o período anterior de mesmo tamanho; nula sem base. */
  deltaPercent: number | null;
  weekly: WeeklyLoad[];
  byMuscle: MuscleVolume[];
  stimulus: StimulusCount[];
}

export interface MuscleVolume {
  muscle: string;
  current: number;
  previous: number;
}

/** A faixa de repetições da série. Não há "potência": nada no dado a distingue. */
export type Stimulus = "strength" | "hypertrophy" | "endurance";

export interface StimulusCount {
  kind: Stimulus;
  sets: number;
}

const WEEK_DAYS = 7;
const PERCENT = 100;
const TOP_MUSCLES = 5;
const NO_MUSCLE_GROUP = "Outros";
const STRENGTH_MAX_REPS = 6;
const HYPERTROPHY_MAX_REPS = 12;

/**
 * A carga do período escolhido contra o anterior de mesmo tamanho, por semana, por
 * grupo muscular e por faixa de repetições: os três cartões da evolução em números.
 *
 * @example summarizeTrainingLoad(sets, "2026-09-15", 12).total // 42600
 */
export function summarizeTrainingLoad(
  sets: readonly CompletedSet[],
  today: string,
  weeks: number,
): TrainingLoadSummary {
  const periodDays = weeks * WEEK_DAYS;
  const current = withinDays(sets, today, periodDays);
  const previous = withinDays(sets, addDays(today, -periodDays), periodDays);
  const total = volumeOf(current);
  return {
    total,
    deltaPercent: percentChange(volumeOf(previous), total),
    weekly: weeklyLoad(sets, today, weeks),
    byMuscle: muscleVolumes(current, previous),
    stimulus: stimulusCounts(current),
  };
}

function muscleVolumes(
  current: readonly CompletedSet[],
  previous: readonly CompletedSet[],
): MuscleVolume[] {
  const muscles = new Set(current.map(muscleOf));
  return [...muscles]
    .map((muscle) => ({
      muscle,
      current: volumeOf(current.filter((item) => muscleOf(item) === muscle)),
      previous: volumeOf(previous.filter((item) => muscleOf(item) === muscle)),
    }))
    .filter((item) => item.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, TOP_MUSCLES);
}

function muscleOf(item: CompletedSet): string {
  return item.muscleGroup ?? NO_MUSCLE_GROUP;
}

function stimulusCounts(sets: readonly CompletedSet[]): StimulusCount[] {
  const kinds: Stimulus[] = ["strength", "hypertrophy", "endurance"];
  return kinds
    .map((kind) => ({ kind, sets: sets.filter((item) => stimulusOf(item.reps) === kind).length }))
    .filter((count) => count.sets > 0)
    .sort((a, b) => b.sets - a.sets);
}

function stimulusOf(reps: number | null): Stimulus | null {
  if (reps === null || reps <= 0) return null;
  if (reps <= STRENGTH_MAX_REPS) return "strength";
  return reps <= HYPERTROPHY_MAX_REPS ? "hypertrophy" : "endurance";
}

function weeklyLoad(sets: readonly CompletedSet[], today: string, weeks: number): WeeklyLoad[] {
  return weeklyValues(sets, today, weeks, volumeOf).map((kilograms, index) => ({
    weekStart: addDays(today, -(weeks - index) * WEEK_DAYS + 1),
    kilograms: kilograms ?? 0,
  }));
}

/**
 * Variação percentual com uma casa; nula quando não há de onde partir.
 *
 * @example percentChange(400, 500) // 25
 */
export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return Math.round(((to - from) / from) * PERCENT * 10) / 10;
}

function volumeOf(sets: readonly CompletedSet[]): number {
  return volumeDasSeries(sets.map((item) => ({ reps: item.reps, carga: item.weight })));
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  /** A máxima da sessão mais recente do período. */
  currentMax: number;
  deltaPercent: number | null;
  bestSet: { weight: number; reps: number | null };
  volume: number;
  sessions: number;
  /** A máxima de cada sessão, da mais antiga à mais recente. */
  series: { date: string; max: number }[];
  lastDate: string;
}

/**
 * A evolução de carga de cada exercício do período, do treinado mais
 * recentemente para o mais antigo.
 *
 * @example exerciseProgress(sets, "2026-09-15", 12)[0].currentMax // 95
 */
export function exerciseProgress(
  sets: readonly CompletedSet[],
  today: string,
  weeks: number,
): ExerciseProgress[] {
  const weighted = withinDays(sets, today, weeks * WEEK_DAYS).filter(hasLoad);
  const ids = [...new Set(weighted.map((item) => item.exerciseId))];
  return ids
    .map((id) => progressOf(weighted.filter((item) => item.exerciseId === id)))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

function progressOf(sets: readonly CompletedSet[]): ExerciseProgress {
  const series = maxPerSession(sets);
  const first = series[0];
  const last = series[series.length - 1];
  return {
    exerciseId: sets[0].exerciseId,
    name: sets[0].exerciseName,
    currentMax: last.max,
    deltaPercent: series.length > 1 ? percentChange(first.max, last.max) : null,
    bestSet: bestSetOf(sets),
    volume: volumeOf(sets),
    sessions: series.length,
    series,
    lastDate: last.date,
  };
}

function maxPerSession(sets: readonly CompletedSet[]): { date: string; max: number }[] {
  const bySession = new Map<string, { date: string; max: number }>();
  for (const item of sets) {
    const known = bySession.get(item.sessionId);
    const weight = item.weight ?? 0;
    if (!known || weight > known.max)
      bySession.set(item.sessionId, { date: item.date, max: weight });
  }
  return [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function bestSetOf(sets: readonly CompletedSet[]): ExerciseProgress["bestSet"] {
  const [best] = [...sets].sort(
    (a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0),
  );
  return { weight: best.weight ?? 0, reps: best.reps };
}

function hasLoad(item: CompletedSet): boolean {
  return item.weight !== null && item.weight > 0;
}
