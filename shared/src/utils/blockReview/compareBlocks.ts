import type { OnboardingPlanPending } from "../../types/onboardingPlan.types";
import type { BlockComparison, CurrentBlockSummary } from "./types";

const key = (name: string) => name.trim().toLocaleLowerCase("pt-BR");

/**
 * O que muda do bloco que acaba para o próximo (B5): dias, exercícios novos e
 * a meta. Os dias são os que a pessoa escolheu, e não os treinos com dia: a
 * sessão opcional do esporte também tem dia.
 *
 * @example compareBlocks({ trainingDays: 3, exerciseNames: ["Supino"], calories: 2000 }, proposta)
 * // { trainingDays: { before: 3, after: 4 }, newExercises: ["Leg press"], keptExercises: 1, calories: { … } }
 */
export function compareBlocks(
  current: CurrentBlockSummary,
  next: OnboardingPlanPending,
): BlockComparison {
  const before = new Set(current.exerciseNames.map(key));
  const nextNames = [
    ...new Set(next.proposal.workouts.flatMap((w) => w.exercises.map((e) => e.exercise_name))),
  ];
  return {
    trainingDays: {
      before: current.trainingDays,
      after: next.trainingDays,
    },
    newExercises: nextNames.filter((name) => !before.has(key(name))),
    keptExercises: nextNames.filter((name) => before.has(key(name))).length,
    calories: { before: current.calories, after: next.target?.calories ?? null },
    level: current.level === next.level ? null : { before: current.level, after: next.level },
  };
}
