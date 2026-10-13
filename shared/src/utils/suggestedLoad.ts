/**
 * A carga sugerida do próximo treino (#376, A1–A3): o que o aluno sentiu da
 * última vez decide se a carga sobe, fica ou desce. A série é gravada com a
 * repetição da prescrição, e não com a feita, então o esforço é o sinal.
 *
 * Só para o treino do próprio Praticante: no treino prescrito, a carga é do
 * especialista, e o app não muda nada sozinho.
 *
 * Os valores provisórios esperam a validação do CREF (ADR-0044).
 */

export type ExerciseEffort = "easy" | "ok" | "hard";

/** Uma sessão anterior do exercício, da mais recente para a mais antiga. */
export interface ExerciseHistoryEntry {
  /** A maior carga usada na sessão; 0 quando o exercício não leva carga. */
  maxWeightKg: number;
  effort: ExerciseEffort | null;
}

export interface LoadInput {
  /** A carga da prescrição, já lida como número; `null` sem carga. */
  prescribedWeight: number | null;
  /** A repetição como está na prescrição: "10-12", "12", "40 s". */
  prescribedReps: string | null;
  history: ExerciseHistoryEntry[];
}

export type LoadSuggestion =
  | {
      kind: "keep";
      weightKg: number | null;
      reason: "no_history" | "no_answer" | "ok" | "hard_once";
    }
  | { kind: "increase"; weightKg: number; deltaKg: number; reason: "easy" }
  | { kind: "decrease"; weightKg: number; deltaKg: number; reason: "hard_twice" }
  | { kind: "add_reps"; reps: number; reason: "easy" }
  | { kind: "add_seconds"; seconds: number; reason: "easy" };

/** Provisório (CREF): o passo de carga, menor em halter leve. */
const STEP_KG = 2.5;
const LIGHT_STEP_KG = 1;
const LIGHT_LOAD_KG = 10;
/** Provisório (CREF): a queda depois de duas sessões difíceis seguidas. */
const DECREASE_RATE = 0.05;
const HALF_KG = 0.5;
const EXTRA_SECONDS = 10;
const TIMED = /\d\s*(s|seg|segundos?|min)\b/i;

/**
 * @example
 * suggestLoad({ prescribedWeight: 10, prescribedReps: "10-12", history: [{ maxWeightKg: 12.5, effort: "easy" }] });
 * // { kind: "increase", weightKg: 15, deltaKg: 2.5, reason: "easy" }
 */
export function suggestLoad(input: LoadInput): LoadSuggestion {
  const [last, beforeLast] = input.history;
  if (!last) return { kind: "keep", weightKg: input.prescribedWeight, reason: "no_history" };

  const weight = last.maxWeightKg > 0 ? last.maxWeightKg : input.prescribedWeight;
  if (last.effort === null) return { kind: "keep", weightKg: weight, reason: "no_answer" };
  if (last.effort === "ok") return { kind: "keep", weightKg: weight, reason: "ok" };
  if (last.effort === "hard") return afterHard(weight, beforeLast?.effort === "hard");
  return afterEasy(weight, input.prescribedReps);
}

function afterEasy(weight: number | null, reps: string | null): LoadSuggestion {
  if (!weight) {
    return TIMED.test(reps ?? "")
      ? { kind: "add_seconds", seconds: EXTRA_SECONDS, reason: "easy" }
      : { kind: "add_reps", reps: 1, reason: "easy" };
  }
  const step = weight < LIGHT_LOAD_KG ? LIGHT_STEP_KG : STEP_KG;
  return { kind: "increase", weightKg: weight + step, deltaKg: step, reason: "easy" };
}

function afterHard(weight: number | null, twice: boolean): LoadSuggestion {
  if (!twice || !weight) return { kind: "keep", weightKg: weight, reason: "hard_once" };
  const lowered = Math.round((weight * (1 - DECREASE_RATE)) / HALF_KG) * HALF_KG;
  const next = Math.min(lowered, weight - HALF_KG);
  return { kind: "decrease", weightKg: next, deltaKg: next - weight, reason: "hard_twice" };
}
