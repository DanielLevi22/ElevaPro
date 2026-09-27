import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AiSessionState } from "../types";
import { getOrCreateSession } from "./chatService";

export class NutritionChatError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Exige consentimento antes de ler conversa ou prescrição para a IA.
 * @example await requireNutritionConsent(studentId);
 */
export async function requireNutritionConsent(studentId: string): Promise<void> {
  const { data: consent, error } = await supabaseAdmin
    .from("student_consents")
    .select("given_at, revoked_at")
    .eq("student_id", studentId)
    .eq("consent_type", "health_data_collection")
    .maybeSingle();
  if (error) throw new NutritionChatError("Não foi possível conferir a autorização.", 503);
  if (!consent?.given_at || consent.revoked_at) {
    throw new NutritionChatError("O aluno precisa autorizar o uso dos dados de saúde.", 403);
  }
}

/** Lê somente as metas/preferências do rascunho do autor, nunca nome ou notas.
 * @example const draft = await loadNutritionDraft(planId, studentId, specialistId);
 */
async function loadNutritionPlan(planId: string, studentId: string, specialistId: string) {
  await requireNutritionConsent(studentId);
  const { data: draft, error } = await supabaseAdmin
    .from("diet_plans")
    .select(
      "id, status, plan_type, target_calories, target_protein, target_carbs, target_fat, dietary_restrictions, meals_per_day, allows_supplements, free_meal_days",
    )
    .eq("id", planId)
    .eq("student_id", studentId)
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (error) throw new NutritionChatError("Não foi possível conferir o rascunho.", 503);
  if (!draft) throw new NutritionChatError("Rascunho indisponível para esta conversa.", 404);
  return draft;
}

/** Só o rascunho do autor pode receber a proposta aprovada.
 * @example await loadNutritionDraft(planId, studentId, specialistId);
 */
export async function loadNutritionDraft(planId: string, studentId: string, specialistId: string) {
  const plan = await loadNutritionPlan(planId, studentId, specialistId);
  if (plan.status !== "draft")
    throw new NutritionChatError("A prescrição enviada não pode ser alterada nesta conversa.", 409);
  return plan;
}

function planScope(
  plan: Awaited<ReturnType<typeof loadNutritionPlan>> | null,
  intent?: "conversation",
) {
  if (!plan || plan.status === "draft") return { draft: plan, closedPlanId: undefined };
  if (intent !== "conversation")
    throw new NutritionChatError("A prescrição enviada não pode ser alterada nesta conversa.", 409);
  return { draft: null, closedPlanId: plan.id };
}

interface ChatScope {
  studentId: string;
  specialistId: string;
  sessionId?: string;
  planId?: string;
  fresh?: boolean;
  intent?: "conversation";
}

/** Resolve uma conversa da criação ou do rascunho, sem trocar seu destino.
 * @example await resolveNutritionChat({ studentId, specialistId, planId });
 */
export async function resolveNutritionChat(scope: ChatScope) {
  const { studentId, specialistId, planId, sessionId, fresh } = scope;
  await requireNutritionConsent(studentId);
  let plan = planId ? await loadNutritionPlan(planId, studentId, specialistId) : null;
  // Valida antes de criar uma sessão: aprovação não pode abrir conversa em plano enviado.
  planScope(plan, scope.intent);
  if (sessionId || planId) {
    let query = supabaseAdmin
      .from("ai_chat_sessions")
      .select("id, state")
      .eq("student_id", studentId)
      .eq("specialist_id", specialistId)
      .eq("module", "nutrition");
    if (sessionId) query = query.eq("id", sessionId);
    else if (planId) query = query.eq("state->>draftPlanId", planId).is("archived_at", null);
    const { data: session, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new NutritionChatError("Não foi possível abrir a conversa.", 503);
    if (session) {
      const state = (session.state ?? {}) as Partial<AiSessionState>;
      if (
        state.draftPlanId &&
        state.savedDietPlanId &&
        state.draftPlanId !== state.savedDietPlanId
      ) {
        throw new NutritionChatError(
          "O destino salvo não corresponde ao rascunho da conversa.",
          409,
        );
      }
      if (planId && state.draftPlanId !== planId && state.savedDietPlanId !== planId) {
        throw new NutritionChatError("Esta conversa não pertence ao rascunho aberto.", 409);
      }
      const boundPlanId = state.draftPlanId ?? state.savedDietPlanId;
      if (boundPlanId && !plan)
        plan = await loadNutritionPlan(boundPlanId, studentId, specialistId);
      return { id: session.id, ...planScope(plan, scope.intent) };
    }
    if (sessionId) throw new NutritionChatError("Conversa não encontrada.", 404);
  }
  if (!planId && !fresh) {
    const id = await getOrCreateSession(studentId, specialistId, "nutrition");
    return resolveNutritionChat({ ...scope, sessionId: id });
  }
  const { data: created, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .insert({
      student_id: studentId,
      specialist_id: specialistId,
      module: "nutrition",
      state: planId ? { draftPlanId: planId, savedDietPlanId: planId } : {},
    })
    .select("id")
    .single();
  if (error || !created) throw new NutritionChatError("Não foi possível iniciar a conversa.", 503);
  return { id: created.id, ...planScope(plan, scope.intent) };
}

/** Contexto mínimo: sem identificadores, nome do plano ou observações livres.
 * @example const context = nutritionDraftPrompt(draft);
 */
export function nutritionDraftPrompt(
  draft: Awaited<ReturnType<typeof loadNutritionDraft>>,
): string {
  const nutrition = {
    plan_type: draft.plan_type,
    target_calories: draft.target_calories,
    target_protein: draft.target_protein,
    target_carbs: draft.target_carbs,
    target_fat: draft.target_fat,
    dietary_restrictions: draft.dietary_restrictions,
    meals_per_day: draft.meals_per_day,
    allows_supplements: draft.allows_supplements,
    free_meal_days: draft.free_meal_days,
  };
  return `Rascunho aberto (use estas metas e preferências): ${JSON.stringify(nutrition)}.
Proponha apenas refeições adicionais para este rascunho, respeitando o tipo de plano.
Não proponha outro plano. Nada é gravado antes da aprovação explícita do especialista.`;
}
