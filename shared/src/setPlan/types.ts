/** Meta de repetições de uma série ou segmento, em um dos quatro modos da prescrição. */
export type RepsTarget =
  | { mode: "count"; value: number }
  | { mode: "range"; min: number; max: number }
  | { mode: "failure" }
  | { mode: "time"; seconds: number };

/** Trecho de uma série: o "bloco de repetição" que monta rest-pause, drop-set e cluster. */
export interface SetSegment {
  reps: RepsTarget;
  /** `null`: o aluno escolhe a carga. */
  weight_kg: number | null;
  pause_seconds: number;
}

/** Uma série prescrita de um WorkoutItem. */
export interface SetPrescription {
  methods: string[];
  reps: RepsTarget;
  weight_kg: number | null;
  /** `null`: o descanso padrão da execução. Zero é zero — sem descanso. */
  rest_seconds: number | null;
  target_rir: number | null;
  segments: SetSegment[];
}

export type SetPlan = SetPrescription[];

/**
 * A prescrição simples, "3 × 8-12, 20 kg, 60 s": como a IA propõe e como o
 * editor simples do Praticante pede. Vira plano de séries Normal.
 */
export interface SimplePrescription {
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
}
