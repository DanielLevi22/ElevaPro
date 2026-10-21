export { MAX_SEGMENTS, MAX_SETS } from "./constants";
export { legacyToSetPlan, setPlanToLegacy } from "./legacyConversion";
export { resolveSetPlan } from "./resolveSetPlan";
export { type SetPlanSummary, summarizeSetPlan } from "./summary";
export {
  TRAINING_METHODS,
  type TrainingMethod,
  type TrainingMethodGroup,
  type TrainingMethodReference,
} from "./trainingMethods";
export type {
  LegacyPrescription,
  RepsTarget,
  SetPlan,
  SetPrescription,
  SetSegment,
} from "./types";
export { validateSetPlan } from "./validation";
export { workingSetCount } from "./volume";
