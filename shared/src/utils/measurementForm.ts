import type { DeclaredMeasurementInput } from "../services/progress/measurement.service";
import { lerRespostaNumerica } from "./anamnese";
import { CIRCUMFERENCE_RANGE, FAT_RANGE } from "./anamnesisMeasurement";

/**
 * O formulário "Nova medida" (issue #312): do texto digitado à medida declarada.
 *
 * As faixas são as mesmas das perguntas da anamnese, e o peso e a altura passam pelo
 * leitor da Escala: a mesma medida não pode valer num caminho e ser recusada no outro.
 */

export type MeasurementFormField = Exclude<keyof DeclaredMeasurementInput, "assessed_at">;

export type MeasurementFormResult =
  | { ok: true; input: DeclaredMeasurementInput }
  | { ok: false; field: MeasurementFormField; reason: "required" | "range" };

const OPTIONAL_RANGES: Record<
  Exclude<MeasurementFormField, "weight_kg" | "height_cm">,
  { min: number; max: number }
> = {
  body_fat_pct: FAT_RANGE,
  circ_chest: CIRCUMFERENCE_RANGE,
  circ_waist: CIRCUMFERENCE_RANGE,
  circ_hip: CIRCUMFERENCE_RANGE,
  circ_right_arm: CIRCUMFERENCE_RANGE,
  circ_left_arm: CIRCUMFERENCE_RANGE,
  circ_right_thigh: CIRCUMFERENCE_RANGE,
  circ_left_thigh: CIRCUMFERENCE_RANGE,
  circ_right_calf: CIRCUMFERENCE_RANGE,
  circ_left_calf: CIRCUMFERENCE_RANGE,
  circ_shoulder: CIRCUMFERENCE_RANGE,
  circ_neck: CIRCUMFERENCE_RANGE,
};

/**
 * Converte o formulário, ou diz o primeiro campo a corrigir e por quê.
 *
 * @example parseMeasurementForm({ weight_kg: "78,4", height_cm: "180" }) // { ok: true, input: {…} }
 */
export function parseMeasurementForm(
  values: Partial<Record<MeasurementFormField, string>>,
): MeasurementFormResult {
  const input: DeclaredMeasurementInput = {};
  for (const [field, question] of [
    ["weight_kg", "weight"],
    ["height_cm", "height"],
  ] as const) {
    const read = lerRespostaNumerica(values[field], question);
    if (!read.ok)
      return { ok: false, field, reason: read.motivo === "ausente" ? "required" : "range" };
    input[field] = read.valor;
  }
  for (const [field, range] of Object.entries(OPTIONAL_RANGES) as [
    keyof typeof OPTIONAL_RANGES,
    { min: number; max: number },
  ][]) {
    // O nome do campo entra só como rótulo: circunferência e gordura não têm faixa
    // embutida no leitor (lá só peso e altura têm), e a daqui é conferida abaixo.
    const read = lerRespostaNumerica(values[field], field);
    if (!read.ok && read.motivo === "ausente") continue;
    if (!read.ok || read.valor < range.min || read.valor > range.max)
      return { ok: false, field, reason: "range" };
    input[field] = read.valor;
  }
  return { ok: true, input };
}
