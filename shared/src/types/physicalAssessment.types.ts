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
/** Quem mediu: o especialista, com fita, ou o próprio aluno, que declara. */
export type MeasurementSource = "specialist" | "self";

export interface PhysicalAssessment {
  id: string;
  student_id: string;
  specialist_id: string | null;
  /** `specialist` é imutável; `self` foi declarada pelo aluno e ele corrige (0056). */
  measured_by: MeasurementSource;
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

/**
 * As colunas de `physical_assessments`, nomeadas.
 *
 * Existe para que nenhuma consulta use `select("*")` nesta tabela. Ela é
 * sensível pela `LGPD_COMPLIANCE.md`, e com `*` uma coluna nova passa a sair do
 * banco no dia em que é criada — sem ninguém decidir que ela deveria sair.
 * Aqui, expor um campo novo é uma linha a mais que alguém escreve de propósito.
 *
 * @example
 * supabase.from("physical_assessments").select(PHYSICAL_ASSESSMENT_COLUMNS)
 */
// Literal de uma linha só, e não concatenação: o supabase-js infere a linha
// devolvida a partir do tipo *literal* do select. Quebrada em pedaços com `+`,
// a constante vira `string` genérica e a consulta perde a tipagem inteira.
// biome-ignore format: uma quebra de linha aqui reintroduz esse problema
export const PHYSICAL_ASSESSMENT_COLUMNS = "id, student_id, specialist_id, measured_by, assessed_at, weight_kg, height_cm, body_fat_pct, muscle_mass_kg, skinfold_chest, skinfold_abdomen, skinfold_thigh, skinfold_tricep, skinfold_suprailiac, skinfold_subscapular, skinfold_midaxillary, circ_neck, circ_shoulder, circ_chest, circ_waist, circ_abdomen, circ_hip, circ_right_arm, circ_left_arm, circ_right_forearm, circ_left_forearm, circ_right_thigh, circ_left_thigh, circ_right_calf, circ_left_calf, notes, created_at" as const;

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
