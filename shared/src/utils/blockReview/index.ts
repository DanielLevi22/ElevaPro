// A reavaliação do fim do bloco (#376, B2–B5): o que mudou e o próximo bloco.
export { compareBlocks } from "./compareBlocks";
export { BLOCK_CHANGES_FORMAT, BLOCK_TRAINING_DAYS } from "./constants";
export { canLevelUp, LEVEL_UP_WEEKS, type LevelUpInput } from "./levelUp";
export { answersWithChanges, readBlockChanges } from "./readBlockChanges";
export type {
  BlockChanges,
  BlockComparison,
  CurrentBlockSummary,
  NextBlockPending,
} from "./types";
