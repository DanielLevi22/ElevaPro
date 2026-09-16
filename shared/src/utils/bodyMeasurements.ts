import type { MeasurementSource, PhysicalAssessment } from "../types/physicalAssessment.types";
import { daysBetween } from "./dateOnly";

/**
 * As contas das telas de corpo (issue #312): composição, circunferências e a
 * comparação entre dois registros, sempre da mesma origem.
 *
 * Fita do especialista e medida declarada nunca entram na mesma série: a diferença
 * entre as duas é de método, e não de corpo. Por isso toda conta aqui recebe os
 * registros já filtrados por `seriesOf`.
 */

const PERCENT = 100;
const BASELINE_DAYS = 90;

/** O `numeric` do Postgres chega como texto pelo PostgREST; ausência é `null`. */
function numberOf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/** A data do registro, sem hora. */
const dateOf = (record: PhysicalAssessment) => record.assessed_at.slice(0, 10);

/**
 * Os registros de uma origem, do mais antigo ao mais recente: a série das telas.
 *
 * @example seriesOf(assessments, "self").at(-1) // a última medida declarada
 */
export function seriesOf(
  records: readonly PhysicalAssessment[],
  source: MeasurementSource,
): PhysicalAssessment[] {
  return records
    .filter((record) => record.measured_by === source)
    .sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
}

/**
 * A origem do registro mais recente: é nela que a tela abre.
 *
 * @example latestSource(assessments) // "specialist"
 */
export function latestSource(records: readonly PhysicalAssessment[]): MeasurementSource | null {
  const [latest] = [...records].sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
  return latest?.measured_by ?? null;
}

export interface BodyComposition {
  weight: number | null;
  fatPercent: number | null;
  /** O peso sem a gordura, osso e água inclusos, como no Body scan (0038). */
  leanMass: number | null;
  bmi: number | null;
}

/**
 * Peso, gordura, massa magra e IMC de um registro. Sem gordura não há massa magra:
 * seria afirmar uma composição que ninguém mediu.
 *
 * @example bodyComposition(latest) // { weight: 80, fatPercent: 20, leanMass: 64, bmi: 24.7 }
 */
export function bodyComposition(record: PhysicalAssessment): BodyComposition {
  const weight = numberOf(record.weight_kg);
  const height = numberOf(record.height_cm);
  const fatPercent = numberOf(record.body_fat_pct);
  return {
    weight,
    fatPercent,
    leanMass:
      weight !== null && fatPercent !== null
        ? oneDecimal(weight * (1 - fatPercent / PERCENT))
        : null,
    bmi: weight !== null && height ? oneDecimal(weight / (height / PERCENT) ** 2) : null,
  };
}

export type CircumferenceKey =
  | "chest"
  | "waist"
  | "hip"
  | "arm"
  | "thigh"
  | "calf"
  | "shoulder"
  | "neck";

export interface Circumference {
  key: CircumferenceKey;
  label: string;
  /** O rótulo que cabe no eixo do radar, onde "Panturrilha" não entra. */
  short: string;
  value: number | null;
}

/** As 8 medidas do kit; nas bilaterais, as duas colunas que viram uma média. */
type CircumferenceColumn = Extract<keyof PhysicalAssessment, `circ_${string}`>;

const CIRCUMFERENCE_COLUMNS: {
  key: CircumferenceKey;
  label: string;
  short?: string;
  columns: CircumferenceColumn[];
}[] = [
  { key: "chest", label: "Peito", columns: ["circ_chest"] },
  { key: "waist", label: "Cintura", columns: ["circ_waist"] },
  { key: "hip", label: "Quadril", columns: ["circ_hip"] },
  { key: "arm", label: "Braço", columns: ["circ_right_arm", "circ_left_arm"] },
  { key: "thigh", label: "Coxa", columns: ["circ_right_thigh", "circ_left_thigh"] },
  {
    key: "calf",
    label: "Panturrilha",
    short: "Pantur.",
    columns: ["circ_right_calf", "circ_left_calf"],
  },
  { key: "shoulder", label: "Ombro", columns: ["circ_shoulder"] },
  { key: "neck", label: "Pescoço", columns: ["circ_neck"] },
];

/**
 * As 8 circunferências da tela, com a média dos lados preenchidos: quem mediu um
 * braço só não tem o outro zerado na conta.
 *
 * @example circumferences(latest).find((item) => item.key === "arm")?.value // 37.5
 */
export function circumferences(record: PhysicalAssessment): Circumference[] {
  return CIRCUMFERENCE_COLUMNS.map(({ key, label, short, columns }) => {
    const sides = columns
      .map((column) => numberOf(record[column]))
      .filter((value): value is number => value !== null);
    const value = sides.length
      ? oneDecimal(sides.reduce((sum, side) => sum + side, 0) / sides.length)
      : null;
    return { key, label, short: short ?? label, value };
  });
}

/**
 * O registro de referência da comparação: o mais próximo de 90 dias antes do mais
 * recente, a mesma janela do relatório do período.
 *
 * @example baselineBefore(seriesOf(assessments, "self"))?.assessed_at
 */
export function baselineBefore(records: readonly PhysicalAssessment[]): PhysicalAssessment | null {
  const sorted = [...records].sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
  const latest = sorted.at(-1);
  if (!latest || sorted.length < 2) return null;
  const distance = (record: PhysicalAssessment) =>
    Math.abs(daysBetween(dateOf(record), dateOf(latest)) - BASELINE_DAYS);
  return sorted
    .slice(0, -1)
    .reduce((best, record) => (distance(record) < distance(best) ? record : best));
}

export interface MeasurementDifference {
  key: "weight" | "fat" | "lean" | "bmi" | CircumferenceKey;
  label: string;
  unit: string;
  delta: number;
}

/** Um campo do registro com o valor que ele tem. */
export interface MeasurementValue {
  key: MeasurementDifference["key"];
  label: string;
  unit: string;
  value: number;
}

/** Campo, rótulo, unidade e valor — a mesma ordem de campos em toda tela de corpo. */
type ValueRow = [MeasurementDifference["key"], string, string, number | null];

function valueRows(record: PhysicalAssessment): ValueRow[] {
  const { weight, fatPercent, leanMass, bmi } = bodyComposition(record);
  return [
    ["weight", "Peso", "kg", weight],
    ["fat", "Gordura", "%", fatPercent],
    ["lean", "Massa magra", "kg", leanMass],
    ["bmi", "IMC", "", bmi],
    ...circumferences(record).map((item): ValueRow => [item.key, item.label, "cm", item.value]),
  ];
}

/**
 * Os campos preenchidos do registro, na ordem das telas de corpo.
 *
 * @example measurementValues(latest) // [{ key: "weight", value: 78.4, unit: "kg", … }]
 */
export function measurementValues(record: PhysicalAssessment): MeasurementValue[] {
  return valueRows(record).flatMap(([key, label, unit, value]) =>
    value === null ? [] : [{ key, label, unit, value: oneDecimal(value) }],
  );
}

/**
 * A diferença de cada campo que existe nos dois registros, sem julgar a direção:
 * perder cintura pode ser o objetivo de um e o problema de outro.
 *
 * @example measurementDifferences(baseline, latest) // [{ key: "weight", delta: -1.4, … }]
 */
export function measurementDifferences(
  before: PhysicalAssessment,
  after: PhysicalAssessment,
): MeasurementDifference[] {
  const rowsBefore = valueRows(before);
  return valueRows(after).flatMap(([key, label, unit, to], index) => {
    const from = rowsBefore[index][3];
    return from === null || to === null ? [] : [{ key, label, unit, delta: oneDecimal(to - from) }];
  });
}
