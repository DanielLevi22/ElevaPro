import { legacyToSetPlan } from "./legacyConversion";
import type { LegacyPrescription, SetPlan } from "./types";

interface ItemWithPlan extends LegacyPrescription {
  set_plan?: SetPlan | null;
}

/**
 * O plano de séries de um WorkoutItem: o gravado, ou o convertido do formato
 * achatado quando o item ainda não tem plano.
 *
 * @example resolveSetPlan(item).length // número de séries prescritas
 */
export function resolveSetPlan(item: ItemWithPlan): SetPlan {
  return item.set_plan ?? legacyToSetPlan(item).plan;
}
