import { z } from "zod";
import { ASSESSMENT_NUMBER_FIELDS } from "./constants";

const measurementShape = Object.fromEntries(
  ASSESSMENT_NUMBER_FIELDS.map((field) => [
    field,
    z.number().finite().nonnegative().max(999.99).nullable(),
  ]),
);

export const assessmentValuesSchema = z
  .object({
    ...measurementShape,
    weight_kg: z.number().positive().max(999.99),
    height_cm: z.number().positive().max(999.99),
    notes: z.string().max(10000).nullable(),
  })
  .strict();

export const assessmentCorrectionSchema = z
  .object({
    expected: z.record(z.string(), z.union([z.number().finite(), z.string(), z.null()])),
    changes: assessmentValuesSchema.partial(),
  })
  .strict();
