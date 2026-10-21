import { TRAINING_METHODS, visibleMethodIds } from "./trainingMethods";
import type { RepsTarget, SetPlan, SetPrescription, SetSegment } from "./types";

const LABELS = new Map(TRAINING_METHODS.map((m) => [m.id, m.label]));
const SECONDS_PER_MINUTE = 60;

/** Uma série na folha, já em texto: o PDF só desenha. */
export interface WorkoutSheetSet {
  label: string;
  /** Rótulos das técnicas, sem "Normal". */
  methods: string[];
  reps: string;
  weight: string | null;
  rest: string | null;
  rir: string | null;
  /** Os blocos como roteiro: "Pausa 15 s → 4 reps · 80 kg". */
  segments: string[];
}

export interface WorkoutSheetExercise {
  /** Posição na folha, a partir de 1. */
  order: number;
  name: string;
  muscleGroup: string | null;
  notes: string | null;
  sets: WorkoutSheetSet[];
}

export interface WorkoutSheet {
  title: string;
  exercises: WorkoutSheetExercise[];
}

interface SheetSource {
  title: string;
  /** Opcional como no `Workout`: sem a lista, a folha sai sem exercícios. */
  exercises?: {
    order_index: number;
    notes: string | null;
    set_plan: SetPlan;
    exercise?: { name: string; muscle_group?: string | null } | null;
  }[];
}

/**
 * A meta de repetições em texto: "12 reps", "8–12 reps", "até a falha", "45 s",
 * "10 min".
 *
 * @example describeRepsTarget({ mode: "range", min: 8, max: 12 }) // "8–12 reps"
 */
export function describeRepsTarget(reps: RepsTarget): string {
  if (reps.mode === "count") return `${reps.value} reps`;
  if (reps.mode === "range") return `${reps.min}–${reps.max} reps`;
  if (reps.mode === "failure") return "até a falha";
  const inMinutes = reps.seconds >= SECONDS_PER_MINUTE && reps.seconds % SECONDS_PER_MINUTE === 0;
  return inMinutes ? `${reps.seconds / SECONDS_PER_MINUTE} min` : `${reps.seconds} s`;
}

/**
 * O treino como a folha do PDF o mostra: exercícios na ordem da prescrição e
 * cada série escrita por extenso. Web (jsPDF) e app (HTML) desenham a mesma
 * folha, e nenhum dos dois decide texto.
 *
 * @example buildWorkoutSheet(treino).exercises[0].sets[0].reps // "8–12 reps"
 */
export function buildWorkoutSheet(source: SheetSource): WorkoutSheet {
  const ordered = [...(source.exercises ?? [])].sort((a, b) => a.order_index - b.order_index);
  return {
    title: source.title,
    exercises: ordered.map((item, index) => ({
      order: index + 1,
      name: item.exercise?.name ?? "Exercício",
      muscleGroup: item.exercise?.muscle_group ?? null,
      notes: item.notes,
      sets: item.set_plan.map(describeSet),
    })),
  };
}

function describeSet(set: SetPrescription, index: number): WorkoutSheetSet {
  return {
    label: `Série ${index + 1}`,
    methods: visibleMethodIds(set.methods).map((id) => LABELS.get(id) ?? id),
    reps: describeRepsTarget(set.reps),
    weight: describeWeight(set.weight_kg),
    rest: set.rest_seconds === null ? null : `${set.rest_seconds} s`,
    rir: set.target_rir === null ? null : `RIR ${set.target_rir}`,
    segments: set.segments.map(describeSegment),
  };
}

/**
 * Um bloco da série como roteiro: "Pausa 15 s → 4 reps · 80 kg".
 *
 * @example describeSegment({ reps: { mode: "count", value: 4 }, weight_kg: 80, pause_seconds: 15 })
 */
export function describeSegment(segment: SetSegment): string {
  const pause = segment.pause_seconds > 0 ? `Pausa ${segment.pause_seconds} s → ` : "→ ";
  const parts = [
    describeRepsTarget(segment.reps),
    describeWeight(segment.weight_kg),
    segment.methods.length > 0
      ? segment.methods.map((id) => LABELS.get(id) ?? id).join(", ")
      : null,
  ].filter(Boolean);
  return `${pause}${parts.join(" · ")}`;
}

/** Vírgula decimal, como a tela escreve. */
function describeWeight(kg: number | null): string | null {
  return kg === null ? null : `${String(kg).replace(".", ",")} kg`;
}
