import { buildWorkoutSheet, type WorkoutSheet } from "./workoutSheet";

/** Uma fase do plano na folha, com os treinos já em texto. */
export interface PeriodizationSheetPhase {
  /** Posição da fase no plano, a partir de 1. */
  order: number;
  name: string;
  startDate: string;
  endDate: string;
  workouts: WorkoutSheet[];
}

/** O plano completo: periodização, fases, treinos, exercícios e séries. */
export interface PeriodizationSheet {
  name: string;
  objective: string | null;
  startDate: string;
  endDate: string;
  phases: PeriodizationSheetPhase[];
}

type WorkoutSource = Parameters<typeof buildWorkoutSheet>[0];

interface PeriodizationSource {
  periodization: { name: string; objective: string | null; start_date: string; end_date: string };
  phases: {
    plan: { name: string; order_index: number; start_date: string; end_date: string };
    workouts: WorkoutSource[];
  }[];
}

/**
 * O plano completo como a folha do PDF o mostra: as fases na ordem do plano, e
 * cada treino na mesma folha do PDF do treino avulso. As datas seguem cruas:
 * quem desenha formata no padrão da plataforma.
 *
 * @example buildPeriodizationSheet(await service.fetchFullPeriodization(id)).phases[0].workouts
 */
export function buildPeriodizationSheet(source: PeriodizationSource): PeriodizationSheet {
  const ordered = [...source.phases].sort((a, b) => a.plan.order_index - b.plan.order_index);
  return {
    name: source.periodization.name,
    objective: source.periodization.objective,
    startDate: source.periodization.start_date,
    endDate: source.periodization.end_date,
    phases: ordered.map((phase, index) => ({
      order: index + 1,
      name: phase.plan.name,
      startDate: phase.plan.start_date,
      endDate: phase.plan.end_date,
      workouts: phase.workouts.map(buildWorkoutSheet),
    })),
  };
}
