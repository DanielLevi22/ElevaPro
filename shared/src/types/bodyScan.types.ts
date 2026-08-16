/** Os níveis que o prompt pede. Ordem crescente de atenção. */
export const POSTURE_RISKS = ["ÓTIMO", "BOM", "NORMAL", "MODERADO", "ALTO"] as const;

export type PostureRisk = (typeof POSTURE_RISKS)[number];

export interface PostureFinding {
  title: string;
  /**
   * Deliberadamente `string`, não a união.
   *
   * Vem do modelo, que pode devolver um rótulo fora da lista. Tipar como união
   * aqui obrigaria a descartar o achado inteiro por causa de uma palavra — e um
   * achado sobre a postura de alguém vale mais que a etiqueta dele. A tela cai
   * num estilo neutro quando não reconhece.
   */
  risk: string;
  text: string;
}

/**
 * Achados por vista.
 *
 * É o conteúdo que substitui a foto na tela do especialista: em vez de olhar a
 * imagem, ele lê o que a análise encontrou em cada ângulo. A imagem não é
 * persistida (`ADR-010`), então isto é tudo o que sobra do que foi visto.
 */
export interface PostureFeedback {
  front?: PostureFinding[];
  back?: PostureFinding[];
  side?: PostureFinding[];
}

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
  /** Como a foto foi enquadrada. Null em capturas anteriores à `0027`. */
  framing_mark_top: number | null;
  framing_mark_bottom: number | null;
  framing_pitch: number | null;
  framing_roll: number | null;
  /** Falso: o aparelho não tinha sensor, então pitch e roll não valem. */
  framing_level_sensor: boolean | null;
  /** Lente usada. Escaneamentos de lentes diferentes não são comparáveis. */
  framing_camera: "front" | "back" | null;
  posture_feedback: PostureFeedback | null;
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
  /** Como a foto foi enquadrada. Null em capturas anteriores à `0027`. */
  framing_mark_top: number | null;
  framing_mark_bottom: number | null;
  framing_pitch: number | null;
  framing_roll: number | null;
  /** Falso: o aparelho não tinha sensor, então pitch e roll não valem. */
  framing_level_sensor: boolean | null;
  /** Lente usada. Escaneamentos de lentes diferentes não são comparáveis. */
  framing_camera: "front" | "back" | null;
  posture_feedback: PostureFeedback | null;
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
