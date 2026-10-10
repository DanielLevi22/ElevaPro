import { achatarRespostas, practitionerDietTarget } from "@elevapro/shared";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aiProviders } from "../../ai.config";
import { responderEmUmTurno } from "../../providers/turnoUnico";
import { type CatalogFood, suggestSwap } from "./adjustments";
import { allowedFoodNames } from "./foodFilter";
import { type CheckFood, checkPlan, type PractitionerPlanProposal } from "./planCheck";
import { allowedExerciseNames, type PlanChoices, readPlanChoices } from "./planChoices";
import { buildPlanPrompt } from "./planPrompt";
import { prepareProposal } from "./prepareProposal";
import type { OnboardingPlanPending, OnboardingPlanTarget } from "./types";

/** Uma tentativa a mais, com os motivos da recusa: a IA erra conta, e corrige quando sabe onde. */
const ATTEMPTS = 2;
const MAX_TOKENS = 6000;

type Track = "beginner" | "returning" | "intermediate" | "advanced";
const TRACKS: Track[] = ["beginner", "returning", "intermediate", "advanced"];

export interface GenerationOptions {
  /** Respostas trocadas só nesta geração: os dias de O10. */
  answersOverride?: Record<string, unknown>;
  /** A meta com outros macros, mesmas calorias: "Mais proteína". */
  targetOverride?: OnboardingPlanTarget;
  /** "Mais barato", "Mais rápido": a IA estima, sem dado de preço ou preparo. */
  dietInstruction?: string;
  /** O treino fica como está, e só as refeições são remontadas. */
  keepWorkouts?: PractitionerPlanProposal["workouts"];
  /** Marca a versão como estimativa da IA ("Mais barato", "Mais rápido"). */
  estimate?: "cheaper" | "faster";
}

export type GenerationOutcome =
  | { ok: true; pending: OnboardingPlanPending }
  | { ok: false; reason: "incomplete_answers" | "plan_rejected" };

interface StudentData {
  answers: Record<string, unknown>;
  track: Track;
}

/**
 * Gera o plano do onboarding do Praticante: a meta pelo código, treino e
 * refeições pela IA dentro das escolhas, e a conferência antes de devolver
 * (ADR-0044). Não grava plano nenhum: devolve a proposta para aprovar (ADR-0020).
 *
 * Lê as respostas no servidor, nunca do aparelho: o que o app mandasse poderia
 * divergir do que foi gravado e aceito.
 *
 * Os ajustes de O10 regeneram por aqui, com `options`: outros dias, outra meta
 * de macros, uma instrução para a dieta, ou o treino mantido e só as refeições
 * remontadas.
 *
 * @example const outcome = await generatePractitionerPlan(user.id);
 */
export async function generatePractitionerPlan(
  studentId: string,
  options: GenerationOptions = {},
): Promise<GenerationOutcome> {
  const loaded = await loadStudentData(studentId);
  const answers = { ...loaded.answers, ...options.answersOverride };
  const track = loaded.track;
  const choices = readPlanChoices(answers);
  const computed = targetOf(answers);
  if (computed === undefined) return { ok: false, reason: "incomplete_answers" };
  const target = computed && options.targetOverride ? options.targetOverride : computed;

  const [foods, exercises] = await Promise.all([loadPlanFoods(choices), loadExercises(choices)]);
  const goal = typeof answers.main_goal === "string" ? answers.main_goal : "Saúde / Bem-estar";
  const basePrompt = buildPlanPrompt({
    goal,
    level: track,
    choices,
    target,
    injuryReported: answers.injury_reported === true,
    exercises: [...exercises],
    foods: foods.map((food) => `${food.name} — ${food.calories} kcal por ${food.serving_size} g`),
    dietInstruction: options.dietInstruction,
    mealsOnly: options.keepWorkouts !== undefined,
  });

  const proposal = await askUntilAccepted(basePrompt, options.keepWorkouts, {
    trainingDays: choices.trainingDays,
    sessionMinutes: choices.sessionMinutes,
    sports: choices.sports,
    mealsPerDay: choices.mealsPerDay,
    targetCalories: target?.calories ?? null,
    allowedFoods: new Map(foods.map((food) => [food.name, food])),
    allowedExercises: exercises,
  });
  if (!proposal) return { ok: false, reason: "plan_rejected" };

  const pending = {
    proposal,
    target,
    mealCalories: mealCaloriesOf(proposal, foods),
    goal,
    level: track,
    mealsPerDay: choices.mealsPerDay,
    sessionMinutes: choices.sessionMinutes,
    trainingDays: choices.trainingDays,
    suggestedSwap: null,
    estimate: options.estimate ?? null,
  };
  return { ok: true, pending: { ...pending, suggestedSwap: suggestSwap(pending, foods) } };
}

async function askUntilAccepted(
  basePrompt: string,
  keepWorkouts: PractitionerPlanProposal["workouts"] | undefined,
  context: Parameters<typeof checkPlan>[1],
): Promise<PractitionerPlanProposal | null> {
  let prompt = basePrompt;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const prepared = prepareProposal(parseProposal(await ask(prompt)), keepWorkouts, context);
    const proposal = "proposal" in prepared ? prepared.proposal : null;
    // A conferência continua valendo depois do preparo: é ela que diz se o plano chega à tela.
    const problems = proposal
      ? checkPlan(proposal, context)
      : [(prepared as { problem: string }).problem];
    if (proposal && problems.length === 0) return proposal;
    // Só a contagem: os motivos citam alimentos e números do plano, e para
    // diagnosticar basta reproduzir com o usuário de teste.
    logger.warn("ai.practitioner_plan.rejected", {
      attempt,
      problems: problems.length,
    });
    prompt = `${basePrompt}\n\nA resposta anterior foi recusada por: ${problems.join("; ")}. Corrija e responda de novo.`;
  }
  return null;
}

async function ask(prompt: string): Promise<string> {
  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [],
    messages: [{ role: "user", content: prompt }],
    tools: [],
    maxTokens: MAX_TOKENS,
  });
  return texto;
}

function parseProposal(texto: string): PractitionerPlanProposal | null {
  try {
    const parsed = JSON.parse(texto.replace(/```json|```/g, "").trim()) as PractitionerPlanProposal;
    return Array.isArray(parsed.workouts) || parsed.meals
      ? { ...parsed, workouts: parsed.workouts ?? [] }
      : null;
  } catch {
    return null;
  }
}

/**
 * A meta do código; `null` quando a triagem não liberou dieta, `undefined`
 * quando faltam os números do corpo (o onboarding não foi até O4).
 */
function targetOf(answers: Record<string, unknown>): OnboardingPlanTarget | null | undefined {
  const { age, height, weight, gender } = answers;
  if (answers.diet_screening !== "allowed") return null;
  if (typeof age !== "number" || typeof height !== "number" || typeof weight !== "number")
    return undefined;
  if (gender !== "Masculino" && gender !== "Feminino") return undefined;

  const result = practitionerDietTarget({
    age,
    heightCm: height,
    weightKg: weight,
    sex: gender === "Masculino" ? "M" : "F",
    mainGoal: typeof answers.main_goal === "string" ? answers.main_goal : undefined,
    trainingDaysPerWeek: readPlanChoices(answers).trainingDays,
    dietScreening: "allowed",
  });
  if (result.kind === "no_diet") return null;
  return { ...result.macros, guards: result.guards };
}

async function loadStudentData(studentId: string): Promise<StudentData> {
  const [anamnesis, profile] = await Promise.all([
    supabaseAdmin
      .from("student_anamnesis")
      .select("responses")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabaseAdmin.from("profiles").select("persona_track").eq("id", studentId).maybeSingle(),
  ]);
  if (anamnesis.error) throw anamnesis.error;
  if (profile.error) throw profile.error;
  const track = profile.data?.persona_track as Track | null;
  return {
    answers: achatarRespostas(anamnesis.data?.responses as Record<string, unknown> | null),
    track: track && TRACKS.includes(track) ? track : "beginner",
  };
}

/**
 * Os alimentos que o plano pode usar, já sem as exclusões e no estilo escolhido.
 *
 * @example const alimentos = await loadPlanFoods(readPlanChoices(respostas));
 */
export async function loadPlanFoods(choices: PlanChoices): Promise<CatalogFood[]> {
  const { data, error } = await supabaseAdmin
    .from("foods")
    .select("name, category, serving_size, calories")
    .eq("is_custom", false);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => row.calories !== null);
  const allowed = new Set(
    allowedFoodNames(
      rows.map((row) => row.name),
      {
        exclusions: choices.foodExclusions,
        style: choices.dietStyle,
      },
    ),
  );
  return rows
    .filter((row) => allowed.has(row.name))
    .map((row) => ({
      name: row.name,
      category: row.category,
      serving_size: Number(row.serving_size),
      calories: Number(row.calories),
    }));
}

async function loadExercises(choices: PlanChoices): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from("exercises").select("name, venue, category");
  if (error) throw error;
  return new Set(allowedExerciseNames(data ?? [], choices.place));
}

/** As calorias de cada refeição pelo banco de alimentos, e não pelo que a IA disser. */
function mealCaloriesOf(proposal: PractitionerPlanProposal, foods: readonly CheckFood[]): number[] {
  const byName = new Map(foods.map((food) => [food.name, food]));
  return (proposal.meals ?? []).map((meal) =>
    Math.round(
      meal.items.reduce((total, item) => {
        const food = byName.get(item.food_name);
        return food ? total + (food.calories * item.quantity) / food.serving_size : total;
      }, 0),
    ),
  );
}
