import {
  achatarRespostas,
  answersWithChanges,
  type BlockChanges,
  type CurrentBlockSummary,
  compareBlocks,
  createBlockService,
  createWeeklyCheckInService,
  type NextBlockPending,
  type OnboardingPlanTarget,
} from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { type GenerationOutcome, generatePractitionerPlan } from "./generatePlan";
import { readPlanChoices } from "./planChoices";

const blocks = createBlockService(supabaseAdmin);
const checkIns = createWeeklyCheckInService(supabaseAdmin);

export type NextBlockOutcome =
  | { ok: true; pending: NextBlockPending }
  | {
      ok: false;
      reason:
        | "no_block"
        | "has_specialist"
        | "no_changes"
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
 * Só para quem não tem especialista: o do Aluno reavalia e monta o bloco dele.
 * Depois do fim do bloco, ou antes dele com `early` e alguma mudança ou o peso
 * parado há 3 semanas (C1): aí o bloco atual fecha hoje, e o novo começa amanhã.
 *
 * @example const outcome = await prepareNextBlock(user.id, { gym_type: "Home gym" }, "2026-10-17");
 */
export async function prepareNextBlock(
  studentId: string,
  changes: BlockChanges,
  today: string,
  early = false,
): Promise<NextBlockOutcome> {
  const allowed = await nextBlockAllowed(studentId, changes, today, early);
  if (!allowed.ok) return allowed;
  const diet = await activeDietTarget(studentId);
  const outcome = await generateBlock(studentId, changes, diet);
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    pending: {
      plan: outcome.pending,
      blockNumber: (await countCompletedBlocks(studentId)) + 2,
      previousBlockId: allowed.block.id,
      comparison: compareBlocks(
        await currentSummary(studentId, allowed.block, diet),
        outcome.pending,
      ),
      changes,
      early: allowed.running,
    },
  };
}

type Allowed =
  | { ok: true; block: BlockRow; running: boolean }
  | Extract<NextBlockOutcome, { ok: false }>;

/**
 * Se o próximo bloco pode sair agora. O app só pergunta a quem pode; o
 * servidor confere de novo, porque o pedido pode chegar sem passar pela tela.
 */
async function nextBlockAllowed(
  studentId: string,
  changes: BlockChanges,
  today: string,
  early: boolean,
): Promise<Allowed> {
  // Com especialista, a reavaliação e o próximo bloco são dele (#376).
  if (await hasActiveSpecialist(studentId)) return { ok: false, reason: "has_specialist" };
  const block = await ownActiveBlock(studentId);
  if (!block) return { ok: false, reason: "no_block" };
  const running = today < block.end_date;
  if (running && !early) return { ok: false, reason: "block_running" };
  // Antes do fim, só com alguma mudança ou com o peso parado há 3 semanas
  // (C1): sem nenhum dos dois, o bloco atual segue.
  if (running && !(await earlyReason(studentId, changes)))
    return { ok: false, reason: "no_changes" };
  if (changes.level && !(await blocks.levelUpAvailable(studentId, today))) {
    return { ok: false, reason: "level_not_available" };
  }
  return { ok: true, block, running };
}

async function earlyReason(studentId: string, changes: BlockChanges): Promise<boolean> {
  if (Object.keys(changes).length > 0) return true;
  return (await checkIns.stalledWeek(studentId)) !== null;
}

/**
 * A meta recalibrada pelos check-ins continua, a menos que o objetivo ou os
 * dias tenham mudado: aí a conta parte do zero, como no onboarding.
 */
function generateBlock(
  studentId: string,
  changes: BlockChanges,
  diet: { target: OnboardingPlanTarget } | null,
): Promise<GenerationOutcome> {
  const keepsTarget = diet && !changes.main_goal && !changes.training_days;
  return generatePractitionerPlan(studentId, {
    answersOverride: answersWithChanges({}, changes),
    targetOverride: keepsTarget ? diet.target : undefined,
    trackOverride: changes.level,
  });
}

async function currentSummary(
  studentId: string,
  block: BlockRow,
  diet: { target: OnboardingPlanTarget } | null,
): Promise<CurrentBlockSummary> {
  const [trainingDays, level] = await Promise.all([
    answeredTrainingDays(studentId),
    currentTrack(studentId),
  ]);
  return {
    trainingDays,
    exerciseNames: exerciseNamesOf(block),
    calories: diet?.target.calories ?? null,
    level,
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

async function hasActiveSpecialist(studentId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("student_specialists")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "active");
  if (error) throw new Error(`vínculo de ${studentId} não foi lido: ${error.message}`);
  return (count ?? 0) > 0;
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
