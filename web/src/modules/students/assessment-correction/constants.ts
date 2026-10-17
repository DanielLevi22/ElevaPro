import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "@elevapro/shared";

export const ASSESSMENT_NUMBER_FIELDS = [
  "weight_kg",
  "height_cm",
  "body_fat_pct",
  "muscle_mass_kg",
  ...CIRCUMFERENCE_FIELDS.map(({ key }) => key),
  ...SKINFOLD_FIELDS.map(({ key }) => key),
] as const;
