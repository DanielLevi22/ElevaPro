import {
  deloadSets,
  type RepsTarget,
  resolveSetPlan,
  type SerieFeita,
  type SetPrescription,
  TRAINING_METHODS,
  type WorkoutExercise,
} from '@elevapro/shared';
import { DEFAULT_REST_TIME } from '../constants';

const FORA_DO_VOLUME = new Set(
  TRAINING_METHODS.filter((m) => !m.countsTowardVolume).map((m) => m.id)
);
const foraDoVolume = (id: string) => FORA_DO_VOLUME.has(id);

/**
 * O plano de séries visto pela sessão (#431): quantas séries o exercício tem,
 * o descanso de cada uma e o que cada uma grava. Item sem plano cai no
 * formato achatado pelo `resolveSetPlan` — o comportamento de antes.
 */

/** Quantas séries o exercício prescreve. */
export function seriesDoPlano(item: WorkoutExercise): number {
  return resolveSetPlan(item).length;
}

/** A prescrição da série de posição `indice` (a partir de 0), ou nula fora do plano. */
export function prescricaoDaSerie(item: WorkoutExercise, indice: number): SetPrescription | null {
  return resolveSetPlan(item)[indice] ?? null;
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
  const contadas = partes.filter((r): r is number => r !== null);
  return {
    reps: contadas.length > 0 ? contadas.reduce((soma, r) => soma + r, 0) : null,
    carga: prescricao.weight_kg,
  };
}

/** Faixa conta o mínimo, como o `numeroDaPrescricao` lia "8-12"; falha e tempo não têm número. */
function repsContaveis(reps: RepsTarget): number | null {
  if (reps.mode === 'count') return reps.value;
  if (reps.mode === 'range') return reps.min;
  return null;
}

const CAMPOS_DO_LAPIS = ['sets', 'reps', 'weight', 'rest_seconds'] as const;

/**
 * O lápis edita o formato achatado. Se ele mudou algum desses campos, o plano
 * sai e o achatado ajustado passa a valer — a mesma regra do serviço ao gravar
 * só o achatado.
 */
export function semPlanoSeAjustado(
  antes: WorkoutExercise,
  depois: WorkoutExercise
): WorkoutExercise {
  const mudou = CAMPOS_DO_LAPIS.some((campo) => antes[campo] !== depois[campo]);
  return mudou ? { ...depois, set_plan: null } : depois;
}

/** A carga sugerida vai para as séries que contam volume; o aquecimento fica. */
export function comCargaSugerida(item: WorkoutExercise, carga: string): WorkoutExercise {
  const quilos = Number.parseFloat(carga.replace(',', '.'));
  if (!item.set_plan || !Number.isFinite(quilos)) return item;
  const set_plan = item.set_plan.map((serie) =>
    serie.methods.some(foraDoVolume) ? serie : { ...serie, weight_kg: quilos }
  );
  return { ...item, set_plan };
}

/** Na descarga o exercício perde metade das séries, do fim: o aquecimento fica. */
export function planoEmDescarga(item: WorkoutExercise): WorkoutExercise {
  const total = seriesDoPlano(item);
  if (total === 0) return item;
  const sets = deloadSets(total);
  return item.set_plan
    ? { ...item, sets, set_plan: item.set_plan.slice(0, sets) }
    : { ...item, sets };
}
