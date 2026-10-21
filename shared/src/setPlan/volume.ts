import { TRAINING_METHODS } from "./trainingMethods";
import type { SetPlan } from "./types";

const OUTSIDE_VOLUME = new Set(
  TRAINING_METHODS.filter((m) => !m.countsTowardVolume).map((m) => m.id),
);

/**
 * Quantas séries do plano contam no volume de trabalho. Basta uma técnica fora
 * do volume (aquecimento, preparação) para a série ficar de fora.
 *
 * @example workingSetCount(item.set_plan) // 3
 */
export function workingSetCount(plan: SetPlan): number {
  return plan.filter((set) => !set.methods.some((id) => OUTSIDE_VOLUME.has(id))).length;
}
