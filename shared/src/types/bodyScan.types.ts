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
 * persistida (`ADR-0010`), então isto é tudo o que sobra do que foi visto.
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
 * do `ADR-0010` é guardar o resultado derivado e nunca a imagem — é a maior
 * minimização possível para um dado biométrico.
 */
/**
 * O que o aparelho mediu na captura, já convertido para centímetro e grau.
 *
 * O MediaPipe mede em **pixels**, porque o aparelho não conhece a altura do
 * aluno — o portão de elegibilidade responde se ele pode escanear e de onde
 * viria a Escala, nunca quanto. A divisão acontece no BFF, onde a Escala já foi
 * resolvida (`ADR-0022`).
 *
 * Tudo anulável: a máscara falha às vezes, e a lateral não produz assimetria
 * frontal. Null aqui significa "não medido nesta captura", nunca zero.
 */
export interface MedidasGeometricas {
  /** Uma conversão por pose — o aluno não para na mesma distância nas três. */
  px_per_cm_front: number | null;
  px_per_cm_back: number | null;
  px_per_cm_side: number | null;
  /** Assimetrias da frontal. Sinal positivo é o lado direito mais alto. */
  shoulder_drop_cm: number | null;
  shoulder_tilt_deg: number | null;
  hip_drop_cm: number | null;
  hip_tilt_deg: number | null;
  axis_deviation_cm: number | null;
  /** Veredito, não a razão bruta: com true, assimetria pode ser perspectiva. */
  trunk_rotated: boolean | null;
  plumb_shoulder_cm: number | null;
  plumb_hip_cm: number | null;
  plumb_knee_cm: number | null;
}

/**
 * A geometria mais os vereditos do portão — a linha inteira que o scan grava.
 *
 * Separado de `MedidasGeometricas` porque as duas metades vêm de lugares
 * diferentes: a geometria é conta sobre pixels, feita no BFF; o veredito é
 * decisão do portão, tomada no aparelho. Só a geometria volta para a tela do
 * aluno — o aviso de luz ele já recebeu na hora da captura.
 */
export interface MedidasDoAparelho extends MedidasGeometricas, VereditosDaCaptura {}

/**
 * O que o portão concluiu sobre a captura, sem olhar o corpo.
 *
 * Tipo próprio porque tem consumidor próprio: o selo de confiança lê só esta
 * metade, e passar `MedidasDoAparelho` inteiro para ele levaria junto o
 * desnível de ombro — medida de saúde que aquele componente não tem por que
 * conhecer.
 *
 * Null significa "capturado antes de este sinal existir", nunca "estava bom".
 */
export interface VereditosDaCaptura {
  /** Luz não trava a captura, marca o scan — precedente do `framing_level_sensor`. */
  quality_backlit: boolean | null;
  quality_low_light: boolean | null;
  quality_blown_out: boolean | null;
  /** false quando o aluno usou a saída manual do portão sem confirmar o encaixe. */
  framing_confirmed: boolean | null;
}

export interface BodyScanRecord extends MedidasDoAparelho {
  id: string;
  student_id: string;
  scanned_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
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

export interface BodyScanInput extends MedidasDoAparelho {
  height_cm: number;
  weight_kg: number | null;
  /**
   * Se a Escala deste scan foi medida com fita pelo especialista ou declarada
   * pelo aluno na anamnese. Sem isto a tela rotula toda altura como "medido",
   * o que passa a mentir assim que a anamnese vira fonte.
   */
  scale_source?: "assessment" | "self" | "anamnese";
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
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
  | "lean_mass_kg"
  | "bmi"
  | "circ_chest"
  | "circ_waist"
  | "circ_hips"
  | "circ_arms"
  | "circ_thighs"
  | "circ_calves"
  | "circ_neck"
  | "circ_shoulders"
  | "shoulder_drop_cm";

export interface BodyScanDelta {
  field: ComparableField;
  current: number;
  previous: number;
  /** current − previous. Negativo é redução; interpretar é do especialista. */
  change: number;
}
