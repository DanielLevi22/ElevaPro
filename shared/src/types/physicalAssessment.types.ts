/**
 * Uma avaliação física, com os nomes reais das colunas.
 *
 * Existe porque as duas plataformas escreviam nomes que não existiam no banco —
 * `weight` em vez de `weight_kg`, `neck` em vez de `circ_neck` — e as duas
 * desligavam o que teria acusado: o mobile descartava o `error` da resposta, o
 * web usava `as unknown as AssessmentInsert`. A avaliação física não gravava em
 * lugar nenhum, e o sintoma aparecia como "aluno sem avaliação".
 *
 * Um tipo só, derivado do schema, para não haver duas listas divergindo.
 */
export interface PhysicalAssessment {
  id: string;
  student_id: string;
  specialist_id: string | null;
  assessed_at: string;

  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;

  /** Dobras cutâneas, em mm — protocolo Jackson-Pollock. */
  skinfold_chest: number | null;
  skinfold_abdomen: number | null;
  skinfold_thigh: number | null;
  skinfold_tricep: number | null;
  skinfold_suprailiac: number | null;
  skinfold_subscapular: number | null;
  skinfold_midaxillary: number | null;

  /** Circunferências, em cm. Bilateral onde a assimetria importa. */
  circ_neck: number | null;
  circ_shoulder: number | null;
  circ_chest: number | null;
  circ_waist: number | null;
  /** Na altura do umbigo — `circ_waist` é a parte mais estreita. */
  circ_abdomen: number | null;
  circ_hip: number | null;
  circ_right_arm: number | null;
  circ_left_arm: number | null;
  circ_right_forearm: number | null;
  circ_left_forearm: number | null;
  circ_right_thigh: number | null;
  circ_left_thigh: number | null;
  circ_right_calf: number | null;
  circ_left_calf: number | null;

  notes: string | null;
  created_at: string;
}

/** O que um formulário pode enviar. `student_id` sai sempre do chamador. */
export type PhysicalAssessmentInput = Partial<
  Omit<PhysicalAssessment, "id" | "student_id" | "created_at" | "assessed_at">
>;

/**
 * Os campos de circunferência na ordem em que fazem sentido numa ficha:
 * de cima para baixo, e lado a lado quando são bilaterais.
 *
 * Uma lista só, consumida pelo formulário do web e pela ficha do mobile — antes
 * cada um tinha a sua, e elas já discordavam sobre lateralidade.
 */
export const CIRCUMFERENCE_FIELDS = [
  { key: "circ_neck", label: "Pescoço" },
  { key: "circ_shoulder", label: "Ombro" },
  { key: "circ_chest", label: "Peito" },
  { key: "circ_waist", label: "Cintura" },
  { key: "circ_abdomen", label: "Abdômen" },
  { key: "circ_hip", label: "Quadril" },
  { key: "circ_right_arm", label: "Braço D" },
  { key: "circ_left_arm", label: "Braço E" },
  { key: "circ_right_forearm", label: "Antebraço D" },
  { key: "circ_left_forearm", label: "Antebraço E" },
  { key: "circ_right_thigh", label: "Coxa D" },
  { key: "circ_left_thigh", label: "Coxa E" },
  { key: "circ_right_calf", label: "Panturrilha D" },
  { key: "circ_left_calf", label: "Panturrilha E" },
] as const satisfies ReadonlyArray<{ key: keyof PhysicalAssessment; label: string }>;

export const SKINFOLD_FIELDS = [
  { key: "skinfold_chest", label: "Peitoral" },
  { key: "skinfold_abdomen", label: "Abdominal" },
  { key: "skinfold_thigh", label: "Coxa" },
  { key: "skinfold_tricep", label: "Tríceps" },
  { key: "skinfold_suprailiac", label: "Suprailíaca" },
  { key: "skinfold_subscapular", label: "Subescapular" },
  { key: "skinfold_midaxillary", label: "Axilar média" },
] as const satisfies ReadonlyArray<{ key: keyof PhysicalAssessment; label: string }>;
