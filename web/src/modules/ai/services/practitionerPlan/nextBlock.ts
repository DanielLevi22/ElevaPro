import {
  achatarRespostas,
  answersWithChanges,
  type BlockChanges,
  type CurrentBlockSummary,
  compareBlocks,
  createBlockService,
  type NextBlockPending,
  type OnboardingPlanTarget,
} from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generatePractitionerPlan } from "./generatePlan";

const blocks = createBlockService(supabaseAdmin);

import { readPlanChoices } from "./planChoices";

export type NextBlockOutcome =
  | { ok: true; pending: NextBlockPending }
  | {
      ok: false;
      reason:
        | "no_block"
        | "block_running"
        | "level_not_available"
        | "incomplete_answers"
        | "under_age"
        | "plan_rejected";
    };

interface BlockRow {
  id: string;
  end_date: string;
  plans:
    | {
        workouts:
          | {
              day_of_week: string | null;
              exercises: { exercise: { name: string } | null }[] | null;
            }[]
          | null;
      }[]
    | null;
}

/**
 * O próximo bloco do Praticante (#376, B3): gera pela mesma geração do
 * onboarding, com o que mudou na reavaliação por cima das respostas, e deixa
 * pendente. Nada é gravado aqui, nem a anamnese (ADR-0020): as mudanças vão
 * junto com a proposta e entram ao aprovar.
 *
 * Só depois do fim do bloco: antes dele, mudar o plano é outro caminho (fatia 5).
 * A meta recalibrada pelos check-ins continua, a menos que o objetivo ou os dias
 * tenham mudado: aí a conta parte do zero, como no onboarding.
 *
 * @example const outcome = await prepareNextBlock(user.id, { gym_type: "Home gym" }, "2026-10-17");
 */
export async function prepareNextBlock(
  studentId: string,
  changes: BlockChanges,
  today: string,
): Promise<NextBlockOutcome> {
  const block = await ownActiveBlock(studentId);
  if (!block) return { ok: false, reason: "no_block" };
  if (today < block.end_date) return { ok: false, reason: "block_running" };

  // O app só pergunta a quem pode; o servidor confere de novo, porque o pedido
  // pode chegar sem passar pela tela.
  if (changes.level && !(await blocks.levelUpAvailable(studentId, today))) {
    return { ok: false, reason: "level_not_available" };
  }
  const diet = await activeDietTarget(studentId);
  const keepsTarget = diet && !changes.main_goal && !changes.training_days;
  const outcome = await generatePractitionerPlan(studentId, {
    answersOverride: answersWithChanges({}, changes),
    targetOverride: keepsTarget ? diet.target : undefined,
    trackOverride: changes.level,
  });
  if (!outcome.ok) return outcome;

  const current: CurrentBlockSummary = {
    trainingDays: await answeredTrainingDays(studentId),
    exerciseNames: exerciseNamesOf(block),
    calories: diet?.target.calories ?? null,
    level: await currentTrack(studentId),
  };
  return {
    ok: true,
    pending: {
      plan: outcome.pending,
      blockNumber: (await countCompletedBlocks(studentId)) + 2,
      previousBlockId: block.id,
      comparison: compareBlocks(current, outcome.pending),
      changes,
    },
  };
}

/** A trilha de hoje, como a geração lê: sem trilha gravada, iniciante. */
async function currentTrack(studentId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("persona_track")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(`trilha de ${studentId} não foi lida: ${error.message}`);
  return (data as { persona_track: string | null } | null)?.persona_track ?? "beginner";
}

async function ownActiveBlock(studentId: string): Promise<BlockRow | null> {
  const { data, error } = await supabaseAdmin
    .from("training_periodizations")
    .select(
      "id, end_date, plans:training_plans(workouts(day_of_week, exercises:workout_exercises(exercise:exercises(name))))",
    )
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("specialist_id", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`bloco ativo de ${studentId} não foi lido: ${error.message}`);
  return data as unknown as BlockRow | null;
}

function exerciseNamesOf(block: BlockRow): string[] {
  const workouts = (block.plans ?? []).flatMap((plan) => plan.workouts ?? []);
  const names = workouts.flatMap((workout) =>
    (workout.exercises ?? []).flatMap((item) => (item.exercise ? [item.exercise.name] : [])),
  );
  return [...new Set(names)];
}

/**
 * Os dias que a pessoa disse treinar, e não os treinos com dia na semana: a
 * sessão opcional do esporte também tem dia, e contava como mais um.
 */
async function answeredTrainingDays(studentId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("student_anamnesis")
    .select("training_days:responses->training_days")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(`dias de treino de ${studentId} não foram lidos: ${error.message}`);
  return readPlanChoices(achatarRespostas((data ?? {}) as Record<string, unknown>)).trainingDays;
}

async function activeDietTarget(
  studentId: string,
): Promise<{ target: OnboardingPlanTarget } | null> {
  const { data, error } = await supabaseAdmin
    .from("diet_plans")
    .select("target_calories, target_protein, target_carbs, target_fat")
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("specialist_id", null)
    .maybeSingle();
  if (error) throw new Error(`dieta ativa de ${studentId} não foi lida: ${error.message}`);
  if (!data?.target_calories) return null;
  return {
    target: {
      calories: Number(data.target_calories),
      protein: Number(data.target_protein ?? 0),
      carbs: Number(data.target_carbs ?? 0),
      fat: Number(data.target_fat ?? 0),
      guards: [],
    },
  };
}

/**
 * Os blocos que chegaram ao fim. O bloco que acaba agora é o seguinte a eles, e
 * o próximo, o depois: plano trocado no onboarding não conta como bloco.
 */
async function countCompletedBlocks(studentId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("training_periodizations")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .is("specialist_id", null)
    .eq("end_reason", "block_completed");
  if (error) throw new Error(`blocos de ${studentId} não foram contados: ${error.message}`);
  return count ?? 0;
}
