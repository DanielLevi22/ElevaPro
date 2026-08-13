/**
 * Uma análise corporal gravada.
 *
 * As colunas `photo_*_url` existem na tabela mas ficam sempre nulas: a decisão
 * do `ADR-010` é guardar o resultado derivado e nunca a imagem — é a maior
 * minimização possível para um dado biométrico.
 */
export interface BodyScanRecord {
  id: string;
  student_id: string;
  scanned_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  circ_chest: number | null;
  circ_waist: number | null;
  circ_hips: number | null;
  circ_arms: number | null;
  circ_thighs: number | null;
  circ_calves: number | null;
  circ_neck: number | null;
  circ_shoulders: number | null;
  posture_symmetry_score: number | null;
  posture_muscle_score: number | null;
  posture_overall_score: number | null;
  posture_feedback: unknown;
  recommendations: string | null;
}

export interface BodyScanInput {
  height_cm: number;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  circ_chest: number | null;
  circ_waist: number | null;
  circ_hips: number | null;
  circ_arms: number | null;
  circ_thighs: number | null;
  circ_calves: number | null;
  circ_neck: number | null;
  circ_shoulders: number | null;
  posture_symmetry_score: number | null;
  posture_muscle_score: number | null;
  posture_overall_score: number | null;
  posture_feedback: unknown;
  recommendations: string | null;
}

/** Campos que fazem sentido comparar entre dois escaneamentos. */
export type ComparableField =
  | "weight_kg"
  | "body_fat_pct"
  | "muscle_mass_kg"
  | "bmi"
  | "circ_chest"
  | "circ_waist"
  | "circ_hips"
  | "circ_arms"
  | "circ_thighs"
  | "circ_calves"
  | "circ_neck"
  | "circ_shoulders";

export interface BodyScanDelta {
  field: ComparableField;
  current: number;
  previous: number;
  /** current − previous. Negativo é redução; interpretar é do especialista. */
  change: number;
}
