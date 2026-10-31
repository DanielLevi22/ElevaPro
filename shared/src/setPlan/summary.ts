import { visibleMethodIds } from "./trainingMethods";
import type { SetPlan } from "./types";

export interface SetPlanSummary {
  sets: string;
  /** `null` quando não há série. */
  reps: string | null;
  /** `null` quando nenhuma série prescreve carga. */
  weight: string | null;
  /** "4 séries · 10–12 reps · 60–140 kg": as três partes numa linha. */
  line: string;
  /** Ids das técnicas usadas, sem "Normal", na ordem em que aparecem. */
  methods: string[];
}

/**
 * O resumo de um exercício na lista do Workout e no PDF: quantas séries, a
 * faixa de repetições e de carga e as técnicas usadas.
 *
 * @example summarizeSetPlan(plan) // { sets: "4 séries", reps: "10–12 reps", weight: "60–140 kg", line: "4 séries · 10–12 reps · 60–140 kg", methods: ["rest_pause"] }
 */
export function summarizeSetPlan(plan: SetPlan): SetPlanSummary {
  const sets = `${plan.length} ${plan.length === 1 ? "série" : "séries"}`;
  const reps = summarizeReps(plan);
  const weight = summarizeWeight(plan);
  return {
    sets,
    reps,
    weight,
    line: [sets, reps, weight].filter(Boolean).join(" · "),
    methods: summarizeMethods(plan),
  };
}

function summarizeReps(plan: SetPlan): string | null {
  const counts = plan.flatMap((s) =>
    s.reps.mode === "count"
      ? [s.reps.value]
      : s.reps.mode === "range"
        ? [s.reps.min, s.reps.max]
        : [],
  );
  const seconds = plan.flatMap((s) => (s.reps.mode === "time" ? [s.reps.seconds] : []));
  const parts = [
    counts.length > 0 ? `${span(counts)} reps` : null,
    plan.some((s) => s.reps.mode === "failure") ? "até a falha" : null,
    seconds.length > 0 ? `${span(seconds)} s` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function summarizeWeight(plan: SetPlan): string | null {
  const weights = plan.flatMap((s) => (s.weight_kg === null ? [] : [s.weight_kg]));
  return weights.length > 0 ? `${span(weights)} kg` : null;
}

function summarizeMethods(plan: SetPlan): string[] {
  const ids = plan.flatMap((s) => [
    ...s.methods,
    ...s.segments.flatMap((segment) => segment.methods),
  ]);
  return [...new Set(visibleMethodIds(ids))];
}

/** "12" ou "10–15": o menor e o maior, com vírgula decimal. */
function span(values: number[]): string {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const format = (n: number) => String(n).replace(".", ",");
  return low === high ? format(low) : `${format(low)}–${format(high)}`;
}
