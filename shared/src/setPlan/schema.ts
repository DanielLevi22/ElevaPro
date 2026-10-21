import { z } from "zod";
import { MAX_SEGMENTS, MAX_SETS, MAX_TARGET_RIR, MIN_TARGET_RIR } from "./constants";
import {
  TARGET_RIR_OUT_OF_RANGE,
  TOO_MANY_SEGMENTS,
  TOO_MANY_SETS,
  UNKNOWN_FIELD,
  UNKNOWN_METHOD,
} from "./messages";
import { TRAINING_METHOD_IDS } from "./trainingMethods";

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

// `.strict()` em todo objeto: a coluna é JSONB, e um campo que o schema
// aceitasse calado viraria dado novo sem passar pela revisão LGPD (Art. 6°, III).
const strictObject = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.strictObject(shape, {
    error: (issue) => (issue.code === "unrecognized_keys" ? UNKNOWN_FIELD(issue.keys) : undefined),
  });

const repsTargetSchema = z.discriminatedUnion("mode", [
  strictObject({ mode: z.literal("count"), value: positiveInt }),
  strictObject({ mode: z.literal("range"), min: positiveInt, max: positiveInt }),
  strictObject({ mode: z.literal("failure") }),
  strictObject({ mode: z.literal("time"), seconds: positiveInt }),
]);

const weightSchema = z.number().positive().nullable();

const setSegmentSchema = strictObject({
  reps: repsTargetSchema,
  weight_kg: weightSchema,
  pause_seconds: nonNegativeInt,
});

const methodSchema = z.string().refine((id) => TRAINING_METHOD_IDS.includes(id), {
  error: (issue) => UNKNOWN_METHOD(issue.input),
});

const setPrescriptionSchema = strictObject({
  methods: z.array(methodSchema),
  reps: repsTargetSchema,
  weight_kg: weightSchema,
  rest_seconds: nonNegativeInt.nullable(),
  target_rir: z
    .number({ error: (issue) => TARGET_RIR_OUT_OF_RANGE(issue.input) })
    .int({ error: (issue) => TARGET_RIR_OUT_OF_RANGE(issue.input) })
    .min(MIN_TARGET_RIR, { error: (issue) => TARGET_RIR_OUT_OF_RANGE(issue.input) })
    .max(MAX_TARGET_RIR, { error: (issue) => TARGET_RIR_OUT_OF_RANGE(issue.input) })
    .nullable(),
  segments: z
    .array(setSegmentSchema)
    .max(MAX_SEGMENTS, { error: (issue) => TOO_MANY_SEGMENTS((issue.input as unknown[]).length) }),
});

export const setPlanSchema = z
  .array(setPrescriptionSchema)
  .max(MAX_SETS, { error: (issue) => TOO_MANY_SETS((issue.input as unknown[]).length) });
