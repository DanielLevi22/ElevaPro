import {
  achatarRespostas,
  isPractitionerAge,
  practitionerDietTargetFromAnswers,
} from "@elevapro/shared";
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
import type { OnboardingPlanPending, OnboardingPlanScope, OnboardingPlanTarget } from "./types";

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
  | { ok: false; reason: "incomplete_answers" | "under_age" | "plan_rejected" };

interface StudentData {
  answers: Record<string, unknown>;
  track: Track;
  /** Do scan opcional depois de O4, se houver um recente. */
  bodyFatPct: number | undefined;
}

/** Um scan mais velho que isto já não descreve o corpo de hoje. */
const SCAN_VALID_DAYS = 30;

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
  const prepared = await prepareGeneration(studentId, options);
  if (!prepared.ok) return prepared;
  const generation = prepared.generation;
  const [foods, exercises] = await Promise.all([
    loadPlanFoods(generation.choices),
    loadExercises(generation.choices),
  ]);
  const proposal = await askUntilAccepted(
    promptOf(generation, foods, exercises),
    generation.keepWorkouts,
    checkContextOf(generation, foods, exercises),
  );
  if (!proposal) return { ok: false, reason: "plan_rejected" };
  return { ok: true, pending: pendingOf(generation, proposal, foods) };
}

/** O que cada escolha monta: só treino não tem meta; só dieta não tem treino. */
const SCOPE_PARTS: Record<OnboardingPlanScope, { diet: boolean; training: boolean }> = {
  both: { diet: true, training: true },
  training: { diet: false, training: true },
  diet: { diet: true, training: false },
};

/** Tudo que a geração decide antes de pedir à IA, lido das respostas do servidor. */
interface Generation {
  answers: Record<string, unknown>;
  bodyFatPct: number | undefined;
  track: Track;
  choices: PlanChoices;
  scope: OnboardingPlanScope;
  goal: string;
  target: OnboardingPlanTarget | null;
  /** Treinos que ficam como estão: só as refeições são remontadas. */
  keepWorkouts: PractitionerPlanProposal["workouts"] | undefined;
  options: GenerationOptions;
}

async function prepareGeneration(
  studentId: string,
  options: GenerationOptions,
): Promise<{ ok: true; generation: Generation } | Extract<GenerationOutcome, { ok: false }>> {
  const loaded = await loadStudentData(studentId);
  const answers = { ...loaded.answers, ...options.answersOverride };
  // A tela barra o menor em O4; o servidor confere de novo, em todo caminho, porque
  // o aparelho pode pular uma tela, e o plano automático não atende menor (ADR-0044).
  if (!isPractitionerAge(answers.age)) return { ok: false, reason: "under_age" };
  const scope = scopeOf(answers);
  const parts = SCOPE_PARTS[scope];
  // Só treino não tem meta: nem pede o corpo, que no caminho dele não foi perguntado.
  const computed = parts.diet ? targetOf(answers, loaded.bodyFatPct) : null;
  if (computed === undefined) return { ok: false, reason: "incomplete_answers" };
  const goal = typeof answers.main_goal === "string" ? answers.main_goal : "Saúde / Bem-estar";
  return {
    ok: true,
    generation: {
      answers,
      bodyFatPct: loaded.bodyFatPct,
      track: loaded.track,
      choices: readPlanChoices(answers),
      scope,
      goal,
      target: computed && options.targetOverride ? options.targetOverride : computed,
      // Só dieta não tem treino: a IA monta só as refeições, e a conferência espera zero.
      keepWorkouts: parts.training ? options.keepWorkouts : [],
      options,
    },
  };
}

function promptOf(generation: Generation, foods: CatalogFood[], exercises: Set<string>): string {
  const { answers, choices, target, options } = generation;
  return buildPlanPrompt({
    goal: generation.goal,
    level: generation.track,
    choices,
    target,
    injuryReported: answers.injury_reported === true,
    exercises: [...exercises],
    foods: foods.map((food) => `${food.name} — ${food.calories} kcal por ${food.serving_size} g`),
    dietInstruction: options.dietInstruction,
    mealsOnly: generation.keepWorkouts !== undefined,
  });
}

function checkContextOf(
  generation: Generation,
  foods: CatalogFood[],
  exercises: Set<string>,
): Parameters<typeof checkPlan>[1] {
  const { choices } = generation;
  const training = SCOPE_PARTS[generation.scope].training;
  return {
    trainingDays: training ? choices.trainingDays : 0,
    sessionMinutes: choices.sessionMinutes,
    sports: training ? choices.sports : [],
    mealsPerDay: choices.mealsPerDay,
    targetCalories: generation.target?.calories ?? null,
    allowedFoods: new Map(foods.map((food) => [food.name, food])),
    allowedExercises: exercises,
  };
}

function pendingOf(
  generation: Generation,
  proposal: PractitionerPlanProposal,
  foods: CatalogFood[],
): OnboardingPlanPending {
  const { choices, target } = generation;
  const pending: OnboardingPlanPending = {
    scope: generation.scope,
    proposal,
    target,
    mealCalories: mealCaloriesOf(proposal, foods),
    goal: generation.goal,
    level: generation.track,
    mealsPerDay: choices.mealsPerDay,
    sessionMinutes: choices.sessionMinutes,
    trainingDays: choices.trainingDays,
    caloriesByTrainingDays: target
      ? caloriesByDays(generation.answers, generation.bodyFatPct)
      : null,
    suggestedSwap: null,
    estimate: generation.options.estimate ?? null,
  };
  return { ...pending, suggestedSwap: suggestSwap(pending, foods) };
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
/** As opções de dias que O10 oferece. */
const ADJUSTABLE_DAYS = [2, 3, 4, 5, 6];

/** A meta de calorias de cada opção de dias, com o mesmo corpo e o mesmo scan. */
function caloriesByDays(
  answers: Record<string, unknown>,
  bodyFatPct: number | undefined,
): Record<string, number> {
  const entries = ADJUSTABLE_DAYS.map((days) => {
    const target = targetOf({ ...answers, training_days: days }, bodyFatPct);
    return target ? [String(days), target.calories] : null;
  });
  return Object.fromEntries(entries.filter((entry) => entry !== null));
}

function targetOf(
  answers: Record<string, unknown>,
  bodyFatPct: number | undefined,
): OnboardingPlanTarget | null | undefined {
  const result = practitionerDietTargetFromAnswers(answers, { bodyFatPct });
  if (result === null) return undefined;
  if (result.kind === "no_diet") return null;
  return { ...result.macros, guards: result.guards };
}

async function loadStudentData(studentId: string): Promise<StudentData> {
  const since = new Date(Date.now() - SCAN_VALID_DAYS * 86_400_000).toISOString();
  const [anamnesis, profile, scan] = await Promise.all([
    supabaseAdmin
      .from("student_anamnesis")
      .select("responses")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabaseAdmin.from("profiles").select("persona_track").eq("id", studentId).maybeSingle(),
    supabaseAdmin
      .from("body_scans")
      .select("body_fat_pct")
      .eq("student_id", studentId)
      .gte("scanned_at", since)
      .not("body_fat_pct", "is", null)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (scan.error) throw scan.error;
  if (anamnesis.error) throw anamnesis.error;
  if (profile.error) throw profile.error;
  const track = profile.data?.persona_track as Track | null;
  return {
    answers: achatarRespostas(anamnesis.data?.responses as Record<string, unknown> | null),
    track: track && TRACKS.includes(track) ? track : "beginner",
    bodyFatPct:
      scan.data?.body_fat_pct === undefined || scan.data?.body_fat_pct === null
        ? undefined
        : Number(scan.data.body_fat_pct),
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

/**
 * Só o catálogo oficial: a leitura é pela chave de serviço, e sem o filtro o
 * exercício privado de um especialista entraria no plano de quem não é aluno dele.
 */
async function loadExercises(choices: PlanChoices): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, venue, category")
    .is("created_by", null);
  if (error) throw error;
  return new Set(allowedExerciseNames(data ?? [], choices.place, choices.avoidedExercises));
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

/** A escolha de O1b gravada; sem ela, ou com valor estranho, monta os dois. */
function scopeOf(answers: Record<string, unknown>): OnboardingPlanScope {
  const scope = answers.plan_scope;
  return typeof scope === "string" && scope in SCOPE_PARTS
    ? (scope as OnboardingPlanScope)
    : "both";
}
