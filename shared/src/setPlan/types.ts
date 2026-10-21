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

/** Os campos achatados que o WorkoutItem guardava antes do plano. */
export interface LegacyPrescription {
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
}
