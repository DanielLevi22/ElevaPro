import type { SupabaseClient } from "@supabase/supabase-js";
import { type InjuryRegion, MAIN_GOALS, type MainGoal } from "../../data/anamnesisAdaptive";
import { achatarRespostas } from "../../utils/anamnese";
import type { BlockDates } from "../../utils/blockCycle";
import { canLevelUp, LEVEL_UP_WEEKS } from "../../utils/blockReview";
import { addDays, daysBetween } from "../../utils/dateOnly";
import { DEFAULT_TRAINING_DAYS } from "../../utils/practitionerDietTarget";
import { TRAINING_PLACES, type TrainingPlace } from "../../utils/trainingPlace";
import { countPrescribedWorkouts } from "../adherence/prescribedWorkouts";

/** O bloco ativo do próprio Praticante, com as fases: o treino sabe se é dele. */
export interface ActiveBlock extends BlockDates {
  id: string;
  name: string;
  planIds: string[];
}

/** As respostas que a reavaliação mostra como "Hoje: …" (B2). */
export interface BlockChoices {
  goal: MainGoal | null;
  trainingDays: number;
  place: TrainingPlace;
  injuries: InjuryRegion[];
}

/** Só as quatro respostas: a anamnese tem dado de saúde que a B2 não precisa. */
const CHOICE_FIELDS =
  "main_goal:responses->main_goal, training_days:responses->training_days, gym_type:responses->gym_type, injuries:responses->injuries";

interface BlockRow extends BlockDates {
  id: string;
  name: string;
  plans: { id: string }[] | null;
}

/**
 * O ciclo do bloco do Praticante (#376): a descarga da semana 4 e o fim do
 * bloco partem daqui.
 *
 * @example const block = await createBlockService(supabase).activeBlock(user.id);
 */
export const createBlockService = (supabase: SupabaseClient) => ({
  /**
   * A periodização ativa que o próprio Praticante aprovou. A do especialista
   * não entra: o ciclo dela é dele, e o app não muda nada sozinho.
   *
   * @example const block = await blocks.activeBlock(user.id); // null para o Aluno
   */
  activeBlock: async (studentId: string): Promise<ActiveBlock | null> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select("id, name, start_date, end_date, plans:training_plans(id)")
      .eq("student_id", studentId)
      .eq("status", "active")
      .is("specialist_id", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const row = data as BlockRow | null;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      planIds: (row.plans ?? []).map((plan) => plan.id),
    };
  },

  /**
   * O que a pessoa respondeu sobre objetivo, dias, local e lesão, com os
   * padrões da geração para o que ela pulou.
   *
   * @example const hoje = await blocks.currentChoices(user.id); // { trainingDays: 3, … }
   */
  currentChoices: async (studentId: string): Promise<BlockChoices> => {
    const { data, error } = await supabase
      .from("student_anamnesis")
      .select(CHOICE_FIELDS)
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;
    const answers = achatarRespostas((data ?? {}) as Record<string, unknown>);
    const places: readonly string[] = Object.values(TRAINING_PLACES);
    return {
      goal: MAIN_GOALS.includes(answers.main_goal as MainGoal)
        ? (answers.main_goal as MainGoal)
        : null,
      trainingDays:
        typeof answers.training_days === "number" ? answers.training_days : DEFAULT_TRAINING_DAYS,
      place: places.includes(answers.gym_type as string)
        ? (answers.gym_type as TrainingPlace)
        : TRAINING_PLACES.fullGym,
      injuries: Array.isArray(answers.injuries) ? (answers.injuries as InjuryRegion[]) : [],
    };
  },

  /**
   * Se a pessoa já pode subir para intermediário (A7): o app pergunta, e o
   * servidor confere de novo antes de montar o bloco com o nível novo.
   *
   * @example if (await blocks.levelUpAvailable(user.id, "2026-10-13")) perguntar();
   */
  levelUpAvailable: async (studentId: string, today: string): Promise<boolean> => {
    const since = addDays(today, -LEVEL_UP_WEEKS * 7);
    const [profile, firstBlock, sessions, plannedPerWeek] = await Promise.all([
      supabase.from("profiles").select("persona_track").eq("id", studentId).maybeSingle(),
      supabase
        .from("training_periodizations")
        .select("start_date")
        .eq("student_id", studentId)
        .is("specialist_id", null)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .or("session_type.is.null,session_type.neq.cardio")
        .gte("completed_at", since),
      countPrescribedWorkouts(supabase, studentId),
    ]);
    for (const result of [profile, firstBlock, sessions]) if (result.error) throw result.error;
    const start = (firstBlock.data as { start_date: string } | null)?.start_date ?? today;
    return canLevelUp({
      track: (profile.data as { persona_track: string | null } | null)?.persona_track ?? null,
      done: sessions.count ?? 0,
      plannedPerWeek,
      weeksWithPlan: Math.floor(daysBetween(start, today) / 7),
    });
  },
});

export type BlockService = ReturnType<typeof createBlockService>;
