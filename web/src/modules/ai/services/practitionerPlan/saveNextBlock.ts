import { answersWithChanges, type NextBlockPending } from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StartingLoads } from "../workoutPersistence";
import { trainingPlanName } from "./planNames";
import {
  activeOwnDietId,
  finishPreviousTraining,
  markEndedDiet,
  type SavePlanContext,
  saveAnswers,
  saveDiet,
  saveTraining,
} from "./savePlan";

interface SessionRow {
  exercises:
    | {
        exercise_id: string | null;
        sets: { weight_actual: number | null; completed: boolean }[] | null;
      }[]
    | null;
}

/**
 * Grava o próximo bloco aprovado (#376, B5): a anamnese com o que mudou na
 * reavaliação, o treino a partir das cargas conquistadas no bloco que acaba,
 * a dieta, e só então o anterior é encerrado com o motivo — encerrar, nunca
 * apagar. Se algo falhar no meio, o desfazer apaga o novo e o anterior segue.
 *
 * @example const { periodizationId } = await saveNextBlock(ctx, pendente);
 */
export async function saveNextBlock(
  ctx: SavePlanContext,
  next: NextBlockPending,
): Promise<{ periodizationId: string; dietPlanId: string | null }> {
  const loads = await conqueredLoads(ctx.studentId, next.previousBlockId);
  const previousDietId = next.plan.target ? await activeOwnDietId(ctx.studentId) : null;
  const periodizationId = await saveTraining(ctx, next.plan, {
    name: `Bloco ${next.blockNumber} · ${trainingPlanName(next.plan)}`,
    phaseName: `Bloco ${next.blockNumber}`,
    loads,
  });
  const dietPlanId = next.plan.target ? await saveDiet(ctx, next.plan) : null;
  if (Object.keys(next.changes).length > 0) {
    await saveAnswers(ctx, answersWithChanges({}, next.changes));
  }
  await finishPreviousTraining(ctx.studentId, periodizationId, "block_completed");
  if (dietPlanId) await markEndedDiet(previousDietId, "block_completed");
  return { periodizationId, dietPlanId };
}

/**
 * A maior carga feita em cada exercício no bloco que acaba, para o próximo
 * partir dela. Exercício sem carga (prancha, peso do corpo) não entra.
 */
async function conqueredLoads(studentId: string, blockId: string): Promise<StartingLoads> {
  const { data: block, error: blockError } = await supabaseAdmin
    .from("training_periodizations")
    .select("start_date")
    .eq("id", blockId)
    .single();
  if (blockError) throw new Error(`bloco ${blockId} não foi lido: ${blockError.message}`);

  const { data, error } = await supabaseAdmin
    .from("workout_sessions")
    .select(
      "exercises:workout_session_exercises(exercise_id, sets:workout_session_sets(weight_actual, completed))",
    )
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .gte("completed_at", block.start_date);
  if (error) throw new Error(`cargas do bloco ${blockId} não foram lidas: ${error.message}`);

  const best = new Map<string, number>();
  for (const session of (data ?? []) as unknown as SessionRow[]) {
    for (const exercise of session.exercises ?? []) {
      if (!exercise.exercise_id) continue;
      for (const set of exercise.sets ?? []) {
        const weight = Number(set.weight_actual ?? 0);
        if (set.completed && weight > (best.get(exercise.exercise_id) ?? 0)) {
          best.set(exercise.exercise_id, weight);
        }
      }
    }
  }
  return new Map([...best].map(([id, weight]) => [id, String(weight).replace(".", ",")]));
}
