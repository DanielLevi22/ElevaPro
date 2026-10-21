import {
  countsTowardVolume,
  deloadSets,
  type RepsTarget,
  repsToText,
  type SerieFeita,
  type SetPrescription,
  type WorkoutExercise,
} from '@elevapro/shared';
import { DEFAULT_REST_TIME } from '../constants';

/**
 * O plano de séries visto pela sessão (#431): quantas séries o exercício tem,
 * o descanso de cada uma e o que cada uma grava.
 */

/** Quantas séries o exercício prescreve. */
export function seriesDoPlano(item: WorkoutExercise): number {
  return item.set_plan.length;
}

/** A prescrição da série de posição `indice` (a partir de 0), ou nula fora do plano. */
export function prescricaoDaSerie(item: WorkoutExercise, indice: number): SetPrescription | null {
  return item.set_plan[indice] ?? null;
}

/** O descanso depois da série; sem valor prescrito, o padrão de um minuto. */
export function descansoDaSerie(prescricao: SetPrescription | null): number {
  return prescricao?.rest_seconds ?? DEFAULT_REST_TIME;
}

/**
 * O que a série grava: uma linha por série, com as repetições somadas de todos
 * os blocos e a carga da série. O registro bloco a bloco é a fase 2 da #431.
 */
export function registroDaSerie(prescricao: SetPrescription | null): SerieFeita {
  if (!prescricao) return { reps: null, carga: null };
  const partes = [prescricao.reps, ...prescricao.segments.map((s) => s.reps)].map(repsContaveis);
  // Uma parte sem número (até a falha, tempo) deixa o total desconhecido:
  // somar só as outras gravaria menos do que o aluno fez.
  const reps = partes.every((r): r is number => r !== null)
    ? partes.reduce((soma, r) => soma + r, 0)
    : null;
  return {
    reps,
    carga: prescricao.weight_kg,
    ...(countsTowardVolume(prescricao) ? {} : { contaVolume: false }),
  };
}

/** Faixa conta o mínimo, como o `numeroDaPrescricao` lia "8-12"; falha e tempo não têm número. */
function repsContaveis(reps: RepsTarget): number | null {
  if (reps.mode === 'count') return reps.value;
  if (reps.mode === 'range') return reps.min;
  return null;
}

/** A carga sugerida vai para as séries que contam volume; o aquecimento fica. */
export function comCargaSugerida(item: WorkoutExercise, carga: string): WorkoutExercise {
  const quilos = Number.parseFloat(carga.replace(',', '.'));
  if (!Number.isFinite(quilos)) return item;
  const set_plan = item.set_plan.map((serie) =>
    countsTowardVolume(serie) ? { ...serie, weight_kg: quilos } : serie
  );
  return { ...item, set_plan };
}

/** Na descarga o exercício perde metade das séries, do fim: o aquecimento fica. */
export function planoEmDescarga(item: WorkoutExercise): WorkoutExercise {
  const total = seriesDoPlano(item);
  if (total === 0) return item;
  return { ...item, set_plan: item.set_plan.slice(0, deloadSets(total)) };
}

export interface ResumoDaPrescricao {
  series: number;
  /** "12", "8-12", "falha" ou "30s" — da série de trabalho. */
  reps: string;
  carga: number | null;
  descanso: number | null;
  /** A meta de repetições da série de trabalho, ou nula sem séries. */
  meta: RepsTarget | null;
}

/**
 * O exercício numa linha só ("4 × 8-12 · 80 kg · 90 s"): o total de séries e a
 * série de trabalho, que é a que representa o exercício — não o aquecimento.
 *
 * @example resumoDaPrescricao(item) // { series: 4, reps: "8-12", carga: 80, descanso: 90 }
 */
export function resumoDaPrescricao(item: WorkoutExercise): ResumoDaPrescricao {
  const serie = item.set_plan.find(countsTowardVolume) ?? item.set_plan[0];
  return {
    series: item.set_plan.length,
    reps: serie ? repsToText(serie.reps) : '—',
    carga: serie?.weight_kg ?? null,
    descanso: serie?.rest_seconds ?? null,
    meta: serie?.reps ?? null,
  };
}
