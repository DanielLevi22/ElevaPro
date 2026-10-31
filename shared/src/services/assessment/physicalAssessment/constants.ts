import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "../../../types/physicalAssessment.types";

/** Os campos numéricos que a ficha grava e a retificação compara. */
export const ASSESSMENT_NUMBER_FIELDS = [
  "weight_kg",
  "height_cm",
  "body_fat_pct",
  "muscle_mass_kg",
  ...CIRCUMFERENCE_FIELDS.map(({ key }) => key),
  ...SKINFOLD_FIELDS.map(({ key }) => key),
] as const;

export type AssessmentNumberField = (typeof ASSESSMENT_NUMBER_FIELDS)[number];

/** Rótulo e unidade de cada campo, na ordem em que a ficha é lida. */
export const ASSESSMENT_FIELD_LABELS: ReadonlyArray<{
  key: AssessmentNumberField;
  label: string;
  unit: "kg" | "cm" | "%" | "mm";
}> = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "height_cm", label: "Altura", unit: "cm" },
  { key: "body_fat_pct", label: "Gordura corporal", unit: "%" },
  { key: "muscle_mass_kg", label: "Massa muscular", unit: "kg" },
  ...CIRCUMFERENCE_FIELDS.map((field) => ({ ...field, unit: "cm" as const })),
  ...SKINFOLD_FIELDS.map((field) => ({ ...field, unit: "mm" as const })),
];
