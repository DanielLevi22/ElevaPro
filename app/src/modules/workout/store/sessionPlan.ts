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
 * O plano de séries visto pela sessão (#431): a prescrição de cada série, o
 * descanso depois dela e o que cada uma grava.
 */

/** A prescrição da série de posição `index` (a partir de 0), ou nula fora do plano. */
export function setPrescriptionAt(item: WorkoutExercise, index: number): SetPrescription | null {
  return item.set_plan[index] ?? null;
}

/** O descanso depois da série; sem valor prescrito, o padrão de um minuto. */
export function restAfterSet(prescription: SetPrescription | null): number {
  return prescription?.rest_seconds ?? DEFAULT_REST_TIME;
}

/**
 * O que a série grava: uma linha por série, com as repetições somadas de todos
 * os blocos e a carga da série. O registro bloco a bloco é a fase 2 da #431.
 */
export function setRecord(prescription: SetPrescription | null): SerieFeita {
  if (!prescription) return { reps: null, carga: null };
  const parts = [prescription.reps, ...prescription.segments.map((s) => s.reps)].map(countableReps);
  // Uma parte sem número (até a falha, tempo) deixa o total desconhecido:
  // somar só as outras gravaria menos do que o aluno fez.
  const reps = parts.every((r): r is number => r !== null)
    ? parts.reduce((sum, r) => sum + r, 0)
    : null;
  return {
    reps,
    carga: prescription.weight_kg,
    ...(countsTowardVolume(prescription) ? {} : { contaVolume: false }),
  };
}

/** Faixa conta o mínimo, como o `numeroDaPrescricao` lia "8-12"; falha e tempo não têm número. */
function countableReps(reps: RepsTarget): number | null {
  if (reps.mode === 'count') return reps.value;
  if (reps.mode === 'range') return reps.min;
  return null;
}

/** A carga sugerida vai para as séries que contam volume; o aquecimento fica. */
export function withSuggestedLoad(item: WorkoutExercise, load: string): WorkoutExercise {
  const kilos = Number.parseFloat(load.replace(',', '.'));
  if (!Number.isFinite(kilos)) return item;
  const set_plan = item.set_plan.map((set) =>
    countsTowardVolume(set) ? { ...set, weight_kg: kilos } : set
  );
  return { ...item, set_plan };
}

/**
 * Na descarga o exercício perde metade das séries de trabalho, do fim. O
 * aquecimento e a preparação ficam todos: são eles que deixam a carga segura,
 * e não contam no volume que a descarga corta.
 *
 * @example deloadPlan(item) // [aquecimento, trabalho, trabalho, trabalho, trabalho] → [aquecimento, trabalho, trabalho]
 */
export function deloadPlan(item: WorkoutExercise): WorkoutExercise {
  const working = item.set_plan.filter(countsTowardVolume).length;
  if (working === 0) return item;
  const keep = deloadSets(working);
  let kept = 0;
  const set_plan = item.set_plan.filter((set) => {
    if (!countsTowardVolume(set)) return true;
    kept += 1;
    return kept <= keep;
  });
  return { ...item, set_plan };
}

export interface PrescriptionSummary {
  sets: number;
  /** "12", "8-12", "falha" ou "30s" — da série de trabalho. */
  reps: string;
  load: number | null;
  rest: number | null;
  /** A meta de repetições da série de trabalho, ou nula sem séries. */
  target: RepsTarget | null;
}

/**
 * O exercício numa linha só ("4 × 8-12 · 80 kg · 90 s"): o total de séries e a
 * série de trabalho, que é a que representa o exercício — não o aquecimento.
 *
 * @example prescriptionSummary(item) // { sets: 4, reps: "8-12", load: 80, rest: 90 }
 */
export function prescriptionSummary(item: WorkoutExercise): PrescriptionSummary {
  const set = item.set_plan.find(countsTowardVolume) ?? item.set_plan[0];
  return {
    sets: item.set_plan.length,
    reps: set ? repsToText(set.reps) : '—',
    load: set?.weight_kg ?? null,
    rest: set?.rest_seconds ?? null,
    target: set?.reps ?? null,
  };
}
