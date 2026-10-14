import type { InjuryRegion, MainGoal } from "../../data/anamnesisAdaptive";
import type { OnboardingPlanPending } from "../../types/onboardingPlan.types";
import type { TrainingPlace } from "../trainingPlace";

/**
 * O que a pessoa marcou como "Mudou" na reavaliação do fim do bloco (B2). Só o
 * que mudou vem; o resto da anamnese fica como está.
 */
export interface BlockChanges {
  main_goal?: MainGoal;
  training_days?: number;
  gym_type?: TrainingPlace;
  /** As regiões com dor ou lesão hoje; vazio é "nenhuma". */
  injuries?: InjuryRegion[];
}

/** O bloco que acaba, no que a B5 compara. */
export interface CurrentBlockSummary {
  trainingDays: number;
  exerciseNames: string[];
  /** Nulo sem dieta ativa. */
  calories: number | null;
}

/** O "antes → depois" da B5. */
export interface BlockComparison {
  trainingDays: { before: number; after: number };
  /** Os exercícios que o bloco novo tem e o anterior não tinha. */
  newExercises: string[];
  /** Quantos exercícios do bloco anterior continuam. */
  keptExercises: number;
  calories: { before: number | null; after: number | null };
}

/** O próximo bloco que espera "Aprovar" (ADR-0020): nada é gravado antes disso. */
export interface NextBlockPending {
  plan: OnboardingPlanPending;
  blockNumber: number;
  /** A periodização que o novo encerra ao ser aprovado. */
  previousBlockId: string;
  comparison: BlockComparison;
  /** O que mudou na B2: entra na anamnese só ao aprovar, junto com o bloco. */
  changes: BlockChanges;
}
