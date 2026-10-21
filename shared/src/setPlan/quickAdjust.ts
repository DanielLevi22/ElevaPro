import { MAX_SETS } from "./constants";
import { parseReps, parseWeight } from "./simplePrescription";
import type { RepsTarget, SetPlan } from "./types";
import { countsTowardVolume } from "./volume";

/** Os quatro campos do lápis do aluno, como o formulário os mostra. */
export interface QuickAdjust {
  sets: number;
  reps: string;
  /** Vazio: carga livre. */
  weight: string;
  rest_seconds: number | null;
}

/**
 * Os valores com que o lápis abre: o total de séries e a primeira série que
 * conta volume — a de trabalho, não o aquecimento.
 *
 * @example quickAdjustOf(item.set_plan) // { sets: 4, reps: "8-12", weight: "80", rest_seconds: 90 }
 */
export function quickAdjustOf(plan: SetPlan): QuickAdjust {
  const representative = plan.find(countsTowardVolume) ?? plan[0];
  return {
    sets: plan.length,
    reps: representative ? repsToText(representative.reps) : "",
    weight: representative?.weight_kg != null ? String(representative.weight_kg) : "",
    rest_seconds: representative?.rest_seconds ?? null,
  };
}

/**
 * Aplica o lápis ao plano da sessão: o número de séries redimensiona (copiando
 * a última ou cortando do fim), e reps, carga e descanso valem nas séries que
 * contam volume. O aquecimento e os blocos de cada série ficam como estão.
 *
 * @example applyQuickAdjust(plan, { sets: 3, reps: "6", weight: "100", rest_seconds: 120 })
 */
export function applyQuickAdjust(plan: SetPlan, adjust: QuickAdjust): SetPlan {
  const reps = parseReps(adjust.reps).reps;
  const { weight_kg } = parseWeight(adjust.weight);
  const resized = resize(plan, adjust.sets);
  return resized.map((set) =>
    countsTowardVolume(set) ? { ...set, reps, weight_kg, rest_seconds: adjust.rest_seconds } : set,
  );
}

function resize(plan: SetPlan, sets: number): SetPlan {
  const total = Math.min(Math.max(sets, 0), MAX_SETS);
  const last = plan.at(-1);
  const copies = last
    ? Array.from({ length: Math.max(0, total - plan.length) }, () => structuredClone(last))
    : [];
  return [...structuredClone(plan).slice(0, total), ...copies];
}

/** O texto que o campo de reps aceita de volta: "12", "8-12", "falha", "30s". */
export function repsToText(reps: RepsTarget): string {
  if (reps.mode === "count") return String(reps.value);
  if (reps.mode === "range") return `${reps.min}-${reps.max}`;
  if (reps.mode === "time") return `${reps.seconds}s`;
  return "falha";
}
